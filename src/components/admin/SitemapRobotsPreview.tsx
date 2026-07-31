import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { RefreshCw, ExternalLink } from "lucide-react";

const SOURCES = [
  { key: "/sitemap.xml", label: "Index" },
  { key: "/sitemap-fr.xml", label: "FR" },
  { key: "/sitemap-en.xml", label: "EN" },
  { key: "/sitemap-users.xml", label: "Profils" },
  { key: "/sitemap-images.xml", label: "Images" },
  { key: "/sitemap-video.xml", label: "Vidéos" },
] as const;

async function fetchText(path: string) {
  const res = await fetch(path, { headers: { Accept: "*/*" } });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return await res.text();
}

function extractLocs(xml: string): string[] {
  return Array.from(xml.matchAll(/<loc>\s*([^<]+?)\s*<\/loc>/g)).map((m) => m[1]);
}

function SitemapView({ path }: { path: string }) {
  const [raw, setRaw] = useState(false);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["seo-sitemap-preview", path],
    queryFn: () => fetchText(path),
    staleTime: 30_000,
  });
  const locs = useMemo(() => (data ? extractLocs(data) : []), [data]);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded bg-muted px-2 py-1 text-xs">{path}</code>
        <span className="text-xs text-muted-foreground">
          {isLoading ? "Chargement…" : error ? "Erreur" : `${locs.length} URL${locs.length > 1 ? "s" : ""}`}
        </span>
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setRaw((v) => !v)}>
            {raw ? "Vue liste" : "Vue XML"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={path} target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive">Impossible de charger {path} : {(error as Error).message}</p>
      )}

      {!error && data && (raw ? (
        <pre className="max-h-96 overflow-auto rounded border border-border bg-muted/40 p-3 text-[11px] leading-relaxed">
          {data}
        </pre>
      ) : (
        <ul className="max-h-96 divide-y divide-border overflow-auto rounded border border-border">
          {locs.map((u) => (
            <li key={u} className="px-3 py-1.5 text-xs">
              <a href={u} target="_blank" rel="noreferrer" className="hover:underline break-all">
                {u}
              </a>
            </li>
          ))}
          {locs.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">Aucune URL.</li>}
        </ul>
      ))}
    </div>
  );
}

function RobotsView() {
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["seo-robots-preview"],
    queryFn: () => fetchText("/robots.txt"),
    staleTime: 30_000,
  });

  const parsed = useMemo(() => {
    const groups: { agent: string; allow: string[]; disallow: string[] }[] = [];
    const sitemaps: string[] = [];
    let current: { agent: string; allow: string[]; disallow: string[] } | null = null;
    for (const line of (data ?? "").split("\n")) {
      const l = line.trim();
      if (!l || l.startsWith("#")) continue;
      const [k, ...rest] = l.split(":");
      const value = rest.join(":").trim();
      const key = k.trim().toLowerCase();
      if (key === "user-agent") {
        current = { agent: value, allow: [], disallow: [] };
        groups.push(current);
      } else if (key === "allow" && current) current.allow.push(value);
      else if (key === "disallow" && current) current.disallow.push(value);
      else if (key === "sitemap") sitemaps.push(value);
    }
    return { groups, sitemaps };
  }, [data]);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded bg-muted px-2 py-1 text-xs">/robots.txt</code>
        {isLoading && <span className="text-xs text-muted-foreground">Chargement…</span>}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href="/robots.txt" target="_blank" rel="noreferrer">
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>

      {error && <p className="text-xs text-destructive">Erreur : {(error as Error).message}</p>}

      {parsed.groups.map((g, i) => (
        <div key={`${g.agent}-${i}`} className="rounded border border-border p-3">
          <p className="text-xs font-bold">User-agent : {g.agent}</p>
          <p className="mt-1 text-xs text-emerald-500">Autorisé : {g.allow.join(", ") || "—"}</p>
          <p className="mt-1 text-xs text-destructive break-all">
            Bloqué : {g.disallow.join(", ") || "—"}
          </p>
        </div>
      ))}

      {parsed.sitemaps.length > 0 && (
        <div className="rounded border border-border p-3">
          <p className="text-xs font-bold">Sitemaps déclarés</p>
          <ul className="mt-1 space-y-1">
            {parsed.sitemaps.map((s) => (
              <li key={s} className="text-xs break-all">
                <a href={s} target="_blank" rel="noreferrer" className="hover:underline">{s}</a>
              </li>
            ))}
          </ul>
        </div>
      )}

      {data && (
        <details className="rounded border border-border p-3">
          <summary className="cursor-pointer text-xs font-bold">Fichier brut</summary>
          <pre className="mt-2 max-h-96 overflow-auto text-[11px] leading-relaxed">{data}</pre>
        </details>
      )}
    </div>
  );
}

export function SitemapRobotsPreview() {
  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">
        Aperçu en direct de ce que voient Google et les autres moteurs : les URLs présentes dans
        chaque sitemap et les règles d'indexation du fichier robots.txt.
      </p>
      <Tabs defaultValue="/sitemap.xml">
        <TabsList className="flex-wrap">
          {SOURCES.map((s) => (
            <TabsTrigger key={s.key} value={s.key}>{s.label}</TabsTrigger>
          ))}
          <TabsTrigger value="robots">robots.txt</TabsTrigger>
        </TabsList>
        {SOURCES.map((s) => (
          <TabsContent key={s.key} value={s.key} className="mt-3">
            <SitemapView path={s.key} />
          </TabsContent>
        ))}
        <TabsContent value="robots" className="mt-3">
          <RobotsView />
        </TabsContent>
      </Tabs>
    </div>
  );
}
