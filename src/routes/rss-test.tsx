import { createFileRoute } from "@tanstack/react-router";
import { useQueries, useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RefreshCw, ExternalLink, CheckCircle2, XCircle, AlertTriangle } from "lucide-react";

const FEEDS = [
  { path: "/rss.xml", label: "Global" },
  { path: "/rss-magazine.xml", label: "Magazine" },
  { path: "/rss-chroniques.xml", label: "Chroniques" },
  { path: "/rss-coups-de-coeur.xml", label: "Coups de cœur" },
  { path: "/rss-actus.xml", label: "Actus" },
  { path: "/rss-clips.xml", label: "Clips" },
  { path: "/podcast.xml", label: "Podcast" },
] as const;

const INTERESTING_HEADERS = [
  "content-type",
  "content-length",
  "cache-control",
  "last-modified",
  "etag",
  "age",
  "date",
  "x-content-type-options",
];

type FeedItem = {
  title: string;
  link: string;
  pubDate: string;
  guid: string;
  category: string;
  description: string;
  enclosure: string | null;
};

type FeedResult = {
  status: number;
  statusText: string;
  headers: [string, string][];
  raw: string;
  bytes: number;
  channel: { title: string; description: string; link: string; language: string; lastBuildDate: string };
  items: FeedItem[];
  parseError: string | null;
};

function text(el: Element | null | undefined, tag: string): string {
  if (!el) return "";
  const node = el.getElementsByTagName(tag)[0];
  return node?.textContent?.trim() ?? "";
}

async function loadFeed(path: string): Promise<FeedResult> {
  const res = await fetch(`${path}?_t=${Date.now()}`, { headers: { Accept: "application/rss+xml, application/xml, */*" } });
  const raw = await res.text();
  const headers: [key: string, value: string][] = [];
  res.headers.forEach((value, key) => headers.push([key, value]));
  headers.sort((a, b) => a[0].localeCompare(b[0]));

  let parseError: string | null = null;
  let channel = { title: "", description: "", link: "", language: "", lastBuildDate: "" };
  let items: FeedItem[] = [];

  try {
    const doc = new DOMParser().parseFromString(raw, "application/xml");
    const err = doc.querySelector("parsererror");
    if (err) {
      parseError = err.textContent?.slice(0, 300) ?? "XML invalide";
    } else {
      const ch = doc.getElementsByTagName("channel")[0] ?? null;
      channel = {
        title: text(ch, "title"),
        description: text(ch, "description"),
        link: text(ch, "link"),
        language: text(ch, "language"),
        lastBuildDate: text(ch, "lastBuildDate") || text(ch, "pubDate"),
      };
      items = Array.from(doc.getElementsByTagName("item")).map((it) => ({
        title: text(it, "title"),
        link: text(it, "link"),
        pubDate: text(it, "pubDate"),
        guid: text(it, "guid"),
        category: Array.from(it.getElementsByTagName("category"))
          .map((c) => c.textContent?.trim() ?? "")
          .filter(Boolean)
          .join(", "),
        description: text(it, "description"),
        enclosure: it.getElementsByTagName("enclosure")[0]?.getAttribute("url") ?? null,
      }));
    }
  } catch (e) {
    parseError = (e as Error).message;
  }

  return {
    status: res.status,
    statusText: res.statusText,
    headers,
    raw,
    bytes: new TextEncoder().encode(raw).length,
    channel,
    items,
    parseError,
  };
}

function formatBytes(n: number) {
  if (n < 1024) return `${n} o`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} Ko`;
  return `${(n / 1024 / 1024).toFixed(2)} Mo`;
}

function StatusPill({ result }: { result: FeedResult }) {
  const ct = result.headers.find(([k]) => k === "content-type")?.[1] ?? "";
  const ctOk = /xml/i.test(ct);
  const ok = result.status === 200 && !result.parseError && result.items.length > 0 && ctOk;
  const warn = result.status === 200 && !result.parseError && (!ctOk || result.items.length === 0);

  if (ok) {
    return (
      <Badge className="gap-1 bg-emerald-500/15 text-emerald-500 hover:bg-emerald-500/15">
        <CheckCircle2 className="h-3 w-3" /> OK
      </Badge>
    );
  }
  if (warn) {
    return (
      <Badge className="gap-1 bg-amber-500/15 text-amber-500 hover:bg-amber-500/15">
        <AlertTriangle className="h-3 w-3" /> À vérifier
      </Badge>
    );
  }
  return (
    <Badge variant="destructive" className="gap-1">
      <XCircle className="h-3 w-3" /> Erreur
    </Badge>
  );
}

function FeedPanel({ path }: { path: string }) {
  const [showRaw, setShowRaw] = useState(false);
  const [sample, setSample] = useState(5);
  const { data, error, isLoading, isFetching, refetch } = useQuery({
    queryKey: ["rss-test", path],
    queryFn: () => loadFeed(path),
    staleTime: 15_000,
  });

  const shown = useMemo(() => data?.items.slice(0, sample) ?? [], [data, sample]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <code className="rounded bg-muted px-2 py-1 text-xs">{path}</code>
        {data && <StatusPill result={data} />}
        {data && (
          <span className="text-xs text-muted-foreground">
            HTTP {data.status} {data.statusText} · {data.items.length} item
            {data.items.length > 1 ? "s" : ""} · {formatBytes(data.bytes)}
          </span>
        )}
        {isLoading && <span className="text-xs text-muted-foreground">Chargement…</span>}
        <div className="ml-auto flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => setShowRaw((v) => !v)}>
            {showRaw ? "Vue analysée" : "Vue XML brut"}
          </Button>
          <Button size="sm" variant="outline" onClick={() => void refetch()} disabled={isFetching}>
            <RefreshCw className={`h-3.5 w-3.5 ${isFetching ? "animate-spin" : ""}`} />
          </Button>
          <Button size="sm" variant="outline" asChild>
            <a href={path} target="_blank" rel="noreferrer" aria-label={`Ouvrir ${path}`}>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </Button>
        </div>
      </div>

      {error && (
        <p className="text-xs text-destructive">Requête impossible : {(error as Error).message}</p>
      )}
      {data?.parseError && (
        <p className="rounded border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
          XML invalide : {data.parseError}
        </p>
      )}

      {data && (
        <div className="rounded border border-border">
          <p className="border-b border-border bg-muted/40 px-3 py-2 text-xs font-bold">
            En-têtes HTTP de la réponse
          </p>
          <table className="w-full text-xs">
            <tbody>
              {data.headers.map(([k, v]) => (
                <tr
                  key={k}
                  className={`border-b border-border/50 last:border-0 ${
                    INTERESTING_HEADERS.includes(k) ? "font-medium" : "text-muted-foreground"
                  }`}
                >
                  <td className="w-56 px-3 py-1.5 align-top break-all">{k}</td>
                  <td className="px-3 py-1.5 break-all">{v}</td>
                </tr>
              ))}
              {data.headers.length === 0 && (
                <tr>
                  <td className="px-3 py-2 text-muted-foreground">Aucun en-tête lisible.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {data && !showRaw && (
        <>
          <div className="rounded border border-border p-3">
            <p className="text-xs font-bold">Canal (channel)</p>
            <dl className="mt-2 space-y-1 text-xs">
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted-foreground">Titre</dt>
                <dd className="break-all">{data.channel.title || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted-foreground">Description</dt>
                <dd className="break-all">{data.channel.description || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted-foreground">Lien</dt>
                <dd className="break-all">{data.channel.link || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted-foreground">Langue</dt>
                <dd>{data.channel.language || "—"}</dd>
              </div>
              <div className="flex gap-2">
                <dt className="w-28 shrink-0 text-muted-foreground">Mise à jour</dt>
                <dd>{data.channel.lastBuildDate || "—"}</dd>
              </div>
            </dl>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <p className="text-xs font-bold">
                Échantillon d'items ({shown.length}/{data.items.length})
              </p>
              <div className="ml-auto flex gap-1">
                {[3, 5, 10, 25].map((n) => (
                  <Button
                    key={n}
                    size="sm"
                    variant={sample === n ? "default" : "outline"}
                    onClick={() => setSample(n)}
                  >
                    {n}
                  </Button>
                ))}
              </div>
            </div>

            {shown.map((it, i) => (
              <details key={`${it.guid || it.link}-${i}`} className="rounded border border-border p-3">
                <summary className="cursor-pointer text-xs font-medium break-all">
                  {i + 1}. {it.title || "(sans titre)"}
                </summary>
                <dl className="mt-2 space-y-1 text-xs">
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-muted-foreground">link</dt>
                    <dd className="break-all">
                      <a href={it.link} target="_blank" rel="noreferrer" className="hover:underline">
                        {it.link || "—"}
                      </a>
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-muted-foreground">pubDate</dt>
                    <dd>{it.pubDate || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-muted-foreground">guid</dt>
                    <dd className="break-all">{it.guid || "—"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-muted-foreground">category</dt>
                    <dd className="break-all">{it.category || "—"}</dd>
                  </div>
                  {it.enclosure && (
                    <div className="flex gap-2">
                      <dt className="w-24 shrink-0 text-muted-foreground">enclosure</dt>
                      <dd className="break-all">{it.enclosure}</dd>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <dt className="w-24 shrink-0 text-muted-foreground">description</dt>
                    <dd className="break-all">{it.description || "—"}</dd>
                  </div>
                </dl>
              </details>
            ))}

            {data.items.length === 0 && !data.parseError && (
              <p className="rounded border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-500">
                Aucun item dans ce flux.
              </p>
            )}
          </div>
        </>
      )}

      {data && showRaw && (
        <pre className="max-h-[32rem] overflow-auto rounded border border-border bg-muted/40 p-3 text-[11px] leading-relaxed">
          {data.raw}
        </pre>
      )}
    </div>
  );
}

function Overview() {
  const queries = useQueries({
    queries: FEEDS.map((f) => ({
      queryKey: ["rss-test", f.path],
      queryFn: () => loadFeed(f.path),
      staleTime: 15_000,
    })),
  });
  const results = FEEDS.map((feed, i) => ({ feed, query: queries[i] }));

  return (
    <div className="overflow-x-auto rounded border border-border">
      <table className="w-full text-xs">
        <thead className="bg-muted/40">
          <tr>
            <th className="px-3 py-2 text-left">Flux</th>
            <th className="px-3 py-2 text-left">État</th>
            <th className="px-3 py-2 text-left">HTTP</th>
            <th className="px-3 py-2 text-left">Content-Type</th>
            <th className="px-3 py-2 text-left">Items</th>
            <th className="px-3 py-2 text-left">Taille</th>
          </tr>
        </thead>
        <tbody>
          {results.map(({ feed, query }) => {
            const d = query.data;
            return (
              <tr key={feed.path} className="border-t border-border/50">
                <td className="px-3 py-2">
                  <span className="font-medium">{feed.label}</span>
                  <br />
                  <code className="text-[10px] text-muted-foreground">{feed.path}</code>
                </td>
                <td className="px-3 py-2">
                  {query.isLoading ? "…" : d ? <StatusPill result={d} /> : <Badge variant="destructive">Erreur</Badge>}
                </td>
                <td className="px-3 py-2">{d ? `${d.status}` : "—"}</td>
                <td className="px-3 py-2 break-all">
                  {d?.headers.find(([k]) => k === "content-type")?.[1] ?? "—"}
                </td>
                <td className="px-3 py-2">{d?.items.length ?? "—"}</td>
                <td className="px-3 py-2">{d ? formatBytes(d.bytes) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export const Route = createFileRoute("/rss-test")({
  head: () => ({
    meta: [
      { title: "Test des flux RSS — InDi RaDio 24/7 de la musique indépendante" },
      {
        name: "description",
        content:
          "Page technique de vérification des flux RSS d'InDi RaDio : statut HTTP, en-têtes de réponse et échantillon d'items pour chaque flux.",
      },
      { name: "robots", content: "noindex, nofollow" },
      { property: "og:title", content: "Test des flux RSS — InDi RaDio" },
      {
        property: "og:description",
        content: "Vérification technique des flux RSS d'InDi RaDio : en-têtes HTTP et échantillon d'items.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RssTestPage,
});

function RssTestPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-6 pb-32">
      <h1 className="text-2xl font-black">Test des flux RSS</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Chaque flux est récupéré en direct depuis ce site. Cette page affiche le code HTTP, tous les
        en-têtes de réponse, les métadonnées du canal et un échantillon d'items tels qu'un agrégateur
        (Google Publisher Center, Apple News, Feedly) les lira.
      </p>

      <h2 className="mt-6 mb-2 text-sm font-bold uppercase tracking-wide">Vue d'ensemble</h2>
      <Overview />

      <h2 className="mt-8 mb-2 text-sm font-bold uppercase tracking-wide">Détail par flux</h2>
      <Tabs defaultValue={FEEDS[0].path}>
        <TabsList className="flex-wrap">
          {FEEDS.map((f) => (
            <TabsTrigger key={f.path} value={f.path}>
              {f.label}
            </TabsTrigger>
          ))}
        </TabsList>
        {FEEDS.map((f) => (
          <TabsContent key={f.path} value={f.path} className="mt-4">
            <FeedPanel path={f.path} />
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}