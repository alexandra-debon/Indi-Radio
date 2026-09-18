import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { useServerFn } from "@tanstack/react-start";
import { reviewRoleRequest } from "@/lib/role-request.functions";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { ShieldAlert, Check, X, Loader2, Newspaper, Mic2 } from "lucide-react";
import { SocialLinksBar, type SocialLinks } from "@/components/social/SocialLinksBar";

export const Route = createFileRoute("/_authenticated/admin/candidatures")({
  head: () => ({
    meta: [{ title: "Candidatures — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminApplicationsPage,
});

type Candidate = {
  id: string;
  pseudo: string;
  stage_name: string | null;
  avatar_url: string | null;
  punchline: string | null;
  bio: string | null;
  social_links: SocialLinks | null;
  role: string | null;
  role_requested: string | null;
  role_request_note: string | null;
  role_request_status: string | null;
  role_request_submitted_at: string | null;
  role_request_reviewed_at?: string | null;
};

const SELECT_COLS =
  "id, pseudo, stage_name, avatar_url, punchline, bio, social_links, role, role_requested, role_request_note, role_request_status, role_request_submitted_at, role_request_reviewed_at";

function AdminApplicationsPage() {
  const { isAdmin } = useAuth();
  const [rows, setRows] = useState<Candidate[]>([]);
  const [history, setHistory] = useState<Candidate[]>([]);
  const [tab, setTab] = useState<"pending" | "history">("pending");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const review = useServerFn(reviewRoleRequest);

  async function load() {
    setLoading(true);
    const [pendingRes, historyRes] = await Promise.all([
      (supabase as any)
        .from("profiles")
        .select(SELECT_COLS)
        .eq("role_request_status", "pending")
        .order("role_request_submitted_at", { ascending: true }),
      (supabase as any)
        .from("profiles")
        .select(SELECT_COLS)
        .in("role_request_status", ["approved", "rejected"])
        .order("role_request_reviewed_at", { ascending: false })
        .limit(200),
    ]);
    setLoading(false);
    if (pendingRes.error || historyRes.error) {
      toast.error((pendingRes.error ?? historyRes.error).message);
      return;
    }
    setRows((pendingRes.data ?? []) as Candidate[]);
    setHistory((historyRes.data ?? []) as Candidate[]);
  }

  useEffect(() => {
    if (isAdmin) void load();
  }, [isAdmin]);

  const q = query.trim().toLowerCase();
  const filteredHistory = q
    ? history.filter((c) =>
        [c.pseudo, c.stage_name ?? "", c.role_requested ?? ""].some((v) =>
          v.toLowerCase().includes(q),
        ),
      )
    : history;

  async function decide(userId: string, decision: "approved" | "rejected") {
    setBusy(userId);
    try {
      await review({ data: { userId, decision } });
      setRows((r) => {
        const done = r.find((x) => x.id === userId);
        if (done) {
          setHistory((h) => [
            {
              ...done,
              role_request_status: decision,
              role_request_reviewed_at: new Date().toISOString(),
              role: decision === "approved" ? (done.role_requested ?? done.role) : done.role,
            },
            ...h,
          ]);
        }
        return r.filter((x) => x.id !== userId);
      });
      toast.success(decision === "approved" ? "Candidature approuvée." : "Candidature refusée.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action impossible.");
    } finally {
      setBusy(null);
    }
  }

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ShieldAlert className="mx-auto mb-3 size-10 text-destructive" />
        <p className="text-muted-foreground">Cette page est réservée aux administrateurs.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="text-3xl font-black">Candidatures</h1>
      <p className="mt-1 text-muted-foreground">
        Demandes de statut Artiste et Média en attente de validation.
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={tab === "pending" ? "default" : "outline"}
          onClick={() => setTab("pending")}
        >
          En attente ({rows.length})
        </Button>
        <Button
          size="sm"
          variant={tab === "history" ? "default" : "outline"}
          onClick={() => setTab("history")}
        >
          Historique ({history.length})
        </Button>
        {tab === "history" && (
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Rechercher un pseudo ou un nom de scène…"
            className="ml-auto h-9 w-full max-w-xs rounded-md border border-border bg-background px-3 text-sm"
          />
        )}
      </div>

      {loading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        </div>
      ) : tab === "history" ? (
        filteredHistory.length === 0 ? (
          <p className="mt-10 rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
            Aucune demande traitée pour le moment.
          </p>
        ) : (
          <ul className="mt-6 space-y-3">
            {filteredHistory.map((c) => (
              <li
                key={c.id}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-card p-4"
              >
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="size-9 rounded-full object-cover" />
                ) : (
                  <div className="size-9 rounded-full bg-muted" />
                )}
                <div className="min-w-0">
                  <div className="font-semibold">
                    {c.stage_name || c.pseudo}{" "}
                    <span className="text-sm font-normal text-muted-foreground">@{c.pseudo}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {c.role_requested === "media" ? "Média" : "Artiste"}
                    {c.role_request_reviewed_at
                      ? ` · traitée le ${new Date(c.role_request_reviewed_at).toLocaleString("fr-FR")}`
                      : ""}
                    {c.role ? ` · rôle actuel : ${c.role}` : ""}
                  </div>
                </div>
                <span
                  className={`ml-auto inline-flex items-center gap-1 rounded-sm border px-2 py-0.5 text-[11px] uppercase ${
                    c.role_request_status === "approved"
                      ? "border-primary text-primary"
                      : "border-destructive text-destructive"
                  }`}
                >
                  {c.role_request_status === "approved" ? (
                    <>
                      <Check className="size-3" /> Approuvée
                    </>
                  ) : (
                    <>
                      <X className="size-3" /> Refusée
                    </>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )
      ) : rows.length === 0 ? (
        <p className="mt-10 rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
          Aucune candidature en attente.
        </p>
      ) : (
        <ul className="mt-6 space-y-4">
          {rows.map((c) => (
            <li key={c.id} className="rounded-xl border border-border bg-card p-5">
              <div className="flex flex-wrap items-center gap-3">
                {c.avatar_url ? (
                  <img src={c.avatar_url} alt="" className="size-10 rounded-full object-cover" />
                ) : (
                  <div className="size-10 rounded-full bg-muted" />
                )}
                <div className="min-w-0">
                  <div className="font-bold">
                    {c.stage_name || c.pseudo}{" "}
                    <span className="text-sm font-normal text-muted-foreground">@{c.pseudo}</span>
                  </div>
                  {c.punchline && <div className="text-sm text-muted-foreground">{c.punchline}</div>}
                </div>
                <span className="ml-auto inline-flex items-center gap-1 rounded-sm border border-primary px-2 py-0.5 text-[11px] uppercase text-primary">
                  {c.role_requested === "media" ? <Newspaper className="size-3" /> : <Mic2 className="size-3" />}
                  {c.role_requested === "media" ? "Média" : "Artiste"}
                </span>
              </div>

              {c.role_request_note && (
                <p className="mt-3 whitespace-pre-wrap rounded-lg bg-muted/50 p-3 text-sm">
                  {c.role_request_note}
                </p>
              )}
              {c.social_links && Object.keys(c.social_links).length > 0 && (
                <div className="mt-3">
                  <SocialLinksBar links={c.social_links} />
                </div>
              )}
              {c.role_request_submitted_at && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Soumise le {new Date(c.role_request_submitted_at).toLocaleString("fr-FR")}
                </p>
              )}

              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" disabled={busy === c.id} onClick={() => decide(c.id, "approved")}>
                  <Check className="mr-1 size-4" /> Approuver
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={busy === c.id}
                  onClick={() => decide(c.id, "rejected")}
                >
                  <X className="mr-1 size-4" /> Refuser
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
