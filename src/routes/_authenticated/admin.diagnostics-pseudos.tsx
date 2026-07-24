import { createFileRoute } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, CheckCircle2, XCircle, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/diagnostics-pseudos")({
  head: () => ({
    meta: [
      { title: "Diagnostic pseudos — Indi Radio" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PseudoDiagnostics,
});

type ProfileCheck = {
  pseudo: string;
  status: "pending" | "ok" | "fail";
  httpStatus?: number;
  finalUrl?: string;
  error?: string;
};

type AliasCheck = {
  oldPseudo: string;
  expectedPseudo: string;
  status: "pending" | "ok" | "fail";
  httpStatus?: number;
  location?: string;
  error?: string;
};

const ORIGIN =
  typeof window !== "undefined" ? window.location.origin : "https://radio.indi-art-culture.com";

async function checkProfile(pseudo: string): Promise<ProfileCheck> {
  try {
    const res = await fetch(`${ORIGIN}/u/${encodeURIComponent(pseudo)}`, {
      method: "GET",
      redirect: "follow",
      headers: { Accept: "text/html" },
    });
    return {
      pseudo,
      status: res.ok ? "ok" : "fail",
      httpStatus: res.status,
      finalUrl: res.url,
    };
  } catch (e) {
    return { pseudo, status: "fail", error: (e as Error).message };
  }
}

async function checkAlias(oldPseudo: string, expectedPseudo: string): Promise<AliasCheck> {
  try {
    // Follow redirects so we can compare the final URL against the expected pseudo.
    // Some hosts return HTML with a client-side redirect; the loader-side
    // redirect() throws during SSR and becomes a real 30x response.
    const res = await fetch(`${ORIGIN}/u/${encodeURIComponent(oldPseudo)}`, {
      method: "GET",
      redirect: "follow",
      headers: { Accept: "text/html" },
    });
    const finalPath = new URL(res.url).pathname.toLowerCase();
    const expected = `/u/${expectedPseudo.toLowerCase()}`;
    const ok = res.ok && finalPath === expected;
    return {
      oldPseudo,
      expectedPseudo,
      status: ok ? "ok" : "fail",
      httpStatus: res.status,
      location: res.url,
    };
  } catch (e) {
    return {
      oldPseudo,
      expectedPseudo,
      status: "fail",
      error: (e as Error).message,
    };
  }
}

function PseudoDiagnostics() {
  const { isAdmin } = useAuth();
  const [profiles, setProfiles] = useState<ProfileCheck[]>([]);
  const [aliases, setAliases] = useState<AliasCheck[]>([]);
  const [running, setRunning] = useState(false);
  const [sampleSize, setSampleSize] = useState(25);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="flex items-center gap-2 text-destructive">
          <ShieldAlert className="h-5 w-5" />
          <h1 className="text-lg font-semibold">Accès refusé</h1>
        </div>
        <p className="text-sm text-muted-foreground mt-2">
          Cette section est réservée aux administrateurs.
        </p>
      </div>
    );
  }

  async function runDiagnostics() {
    setRunning(true);
    setProfiles([]);
    setAliases([]);

    // 1) Sample recent active profiles
    const { data: pList, error: pErr } = await supabase
      .from("profiles")
      .select("pseudo")
      .not("pseudo", "is", null)
      .order("updated_at", { ascending: false })
      .limit(sampleSize);

    if (pErr) {
      setRunning(false);
      return;
    }

    const pseudos = (pList ?? []).map((r) => r.pseudo as string).filter(Boolean);
    setProfiles(pseudos.map((p) => ({ pseudo: p, status: "pending" as const })));

    // Run in small batches to avoid hammering the server
    const batchSize = 5;
    const profResults: ProfileCheck[] = [];
    for (let i = 0; i < pseudos.length; i += batchSize) {
      const batch = pseudos.slice(i, i + batchSize);
      const results = await Promise.all(batch.map(checkProfile));
      profResults.push(...results);
      setProfiles([
        ...profResults,
        ...pseudos.slice(profResults.length).map((p) => ({ pseudo: p, status: "pending" as const })),
      ]);
    }

    // 2) Sample recent alias redirects from pseudo_history
    const { data: hList } = await supabase
      .from("pseudo_history")
      .select("old_pseudo, user_id")
      .order("changed_at", { ascending: false })
      .limit(sampleSize);

    const historyRows = hList ?? [];
    const userIds = Array.from(new Set(historyRows.map((h) => h.user_id as string)));
    const currentMap = new Map<string, string>();
    if (userIds.length > 0) {
      const { data: currentList } = await supabase
        .from("profiles")
        .select("id, pseudo")
        .in("id", userIds);
      for (const p of currentList ?? []) {
        if (p.pseudo) currentMap.set(p.id as string, p.pseudo as string);
      }
    }

    const aliasPairs = historyRows
      .map((h) => ({
        oldPseudo: h.old_pseudo as string,
        expectedPseudo: currentMap.get(h.user_id as string) ?? "",
      }))
      .filter(
        (r) =>
          r.oldPseudo &&
          r.expectedPseudo &&
          r.oldPseudo.toLowerCase() !== r.expectedPseudo.toLowerCase(),
      );

    setAliases(aliasPairs.map((p) => ({ ...p, status: "pending" as const })));

    const aliasResults: AliasCheck[] = [];
    for (let i = 0; i < aliasPairs.length; i += batchSize) {
      const batch = aliasPairs.slice(i, i + batchSize);
      const results = await Promise.all(batch.map((p) => checkAlias(p.oldPseudo, p.expectedPseudo)));
      aliasResults.push(...results);
      setAliases([
        ...aliasResults,
        ...aliasPairs.slice(aliasResults.length).map((p) => ({ ...p, status: "pending" as const })),
      ]);
    }

    setRunning(false);
  }

  const profOk = profiles.filter((p) => p.status === "ok").length;
  const profFail = profiles.filter((p) => p.status === "fail").length;
  const aliasOk = aliases.filter((a) => a.status === "ok").length;
  const aliasFail = aliases.filter((a) => a.status === "fail").length;

  return (
    <div className="mx-auto max-w-4xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Diagnostic /u/$pseudo</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Vérifie qu'un échantillon de profils répond bien 200 et que les alias historiques
          redirigent vers le pseudo courant.
        </p>
      </header>

      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm">
          Taille de l'échantillon :{" "}
          <input
            type="number"
            min={1}
            max={200}
            value={sampleSize}
            onChange={(e) => setSampleSize(Math.max(1, Math.min(200, Number(e.target.value) || 25)))}
            className="w-20 rounded border bg-background px-2 py-1"
            disabled={running}
          />
        </label>
        <Button onClick={runDiagnostics} disabled={running}>
          {running ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Analyse…
            </>
          ) : (
            "Lancer le diagnostic"
          )}
        </Button>
      </div>

      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-semibold">Profils</h2>
          {profiles.length > 0 && (
            <>
              <Badge variant="default" className="bg-green-600">{profOk} OK</Badge>
              {profFail > 0 && <Badge variant="destructive">{profFail} en échec</Badge>}
            </>
          )}
        </div>
        {profiles.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun résultat — lance le diagnostic.</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {profiles.map((p) => (
              <li key={p.pseudo} className="flex items-center gap-2 font-mono">
                {p.status === "ok" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : p.status === "fail" ? (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                )}
                <span>/u/{p.pseudo}</span>
                {p.httpStatus && (
                  <span className="text-muted-foreground">→ {p.httpStatus}</span>
                )}
                {p.error && <span className="text-destructive text-xs">({p.error})</span>}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section>
        <div className="flex items-center gap-3 mb-3">
          <h2 className="text-lg font-semibold">Alias (pseudo_history)</h2>
          {aliases.length > 0 && (
            <>
              <Badge variant="default" className="bg-green-600">{aliasOk} OK</Badge>
              {aliasFail > 0 && <Badge variant="destructive">{aliasFail} en échec</Badge>}
            </>
          )}
        </div>
        {aliases.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Aucun alias à vérifier (aucun changement de pseudo récent).
          </p>
        ) : (
          <ul className="space-y-1 text-sm">
            {aliases.map((a) => (
              <li key={`${a.oldPseudo}->${a.expectedPseudo}`} className="flex items-center gap-2 font-mono flex-wrap">
                {a.status === "ok" ? (
                  <CheckCircle2 className="h-4 w-4 text-green-600 shrink-0" />
                ) : a.status === "fail" ? (
                  <XCircle className="h-4 w-4 text-destructive shrink-0" />
                ) : (
                  <Loader2 className="h-4 w-4 animate-spin text-muted-foreground shrink-0" />
                )}
                <span>/u/{a.oldPseudo}</span>
                <ArrowRight className="h-3 w-3 text-muted-foreground" />
                <span>/u/{a.expectedPseudo}</span>
                {a.httpStatus && (
                  <span className="text-muted-foreground">({a.httpStatus})</span>
                )}
                {a.location && a.status === "fail" && (
                  <span className="text-destructive text-xs">→ {a.location}</span>
                )}
                {a.error && <span className="text-destructive text-xs">({a.error})</span>}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}