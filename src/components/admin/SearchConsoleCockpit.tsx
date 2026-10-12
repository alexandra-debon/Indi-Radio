import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { getSearchConsoleOverview, resubmitSitemaps } from "@/lib/search-console.functions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { toast } from "@/lib/toast";
import { Loader2, RefreshCw, TrendingUp, TrendingDown, MousePointerClick, Eye, Percent, Hash, Send } from "lucide-react";

const fmtPct = (n: number) => `${(n * 100).toFixed(1)} %`;
const fmtPos = (n: number) => (n ? n.toFixed(1) : "—");
const shortUrl = (u: string) => u.replace(/^https?:\/\/[^/]+/, "") || "/";

function Delta({ now, before, invert }: { now: number; before: number; invert?: boolean }) {
  if (!before && !now) return null;
  const diff = now - before;
  const good = invert ? diff < 0 : diff > 0;
  if (Math.abs(diff) < 0.01) return <span className="text-[11px] text-muted-foreground">stable</span>;
  const Icon = diff > 0 ? TrendingUp : TrendingDown;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] ${good ? "text-primary" : "text-destructive"}`}>
      <Icon className="size-3" />
      {before ? `${diff > 0 ? "+" : ""}${Math.round((diff / before) * 100)} %` : "nouveau"}
    </span>
  );
}

export function SearchConsoleCockpit() {
  const fetchOverview = useServerFn(getSearchConsoleOverview);
  const resubmit = useServerFn(resubmitSitemaps);
  const [sending, setSending] = useState(false);
  const { data, isLoading, error, refetch, isFetching } = useQuery({
    queryKey: ["gsc-overview"],
    queryFn: () => fetchOverview(),
    staleTime: 15 * 60_000,
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="card-brut flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Lecture de Google Search Console…
      </div>
    );
  }
  if (error || !data) {
    return (
      <div className="card-brut space-y-2 p-4 text-sm">
        <p className="font-semibold text-destructive">Impossible de lire Google Search Console.</p>
        <p className="text-xs text-muted-foreground">{error instanceof Error ? error.message : ""}</p>
        <Button size="sm" variant="outline" onClick={() => refetch()}>Réessayer</Button>
      </div>
    );
  }

  const t = data.totals;
  const p = data.previous;
  const maxImp = Math.max(1, ...data.daily.map((d) => d.impressions));

  const kpis = [
    { label: "Clics", icon: MousePointerClick, value: String(t.clicks), d: <Delta now={t.clicks} before={p.clicks} /> },
    { label: "Impressions", icon: Eye, value: String(t.impressions), d: <Delta now={t.impressions} before={p.impressions} /> },
    { label: "Taux de clic", icon: Percent, value: fmtPct(t.ctr), d: <Delta now={t.ctr} before={p.ctr} /> },
    { label: "Position moy.", icon: Hash, value: fmtPos(t.position), d: <Delta now={t.position} before={p.position} invert /> },
  ];

  const onResubmit = async () => {
    setSending(true);
    try {
      await resubmit();
      toast.success("Sitemaps renvoyés à Google");
      void refetch();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Envoi impossible");
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-3">
      <div className="card-brut flex flex-wrap items-center gap-2 p-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-bold">Cockpit Google Search Console</h3>
          <p className="text-xs text-muted-foreground">
            28 derniers jours ({data.range.startDate} → {data.range.endDate}), comparés aux 28 jours précédents.
          </p>
        </div>
        <Button size="sm" variant="outline" onClick={() => refetch()} disabled={isFetching}>
          <RefreshCw className={`mr-1 size-3.5 ${isFetching ? "animate-spin" : ""}`} /> Actualiser
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card-brut space-y-1 p-3">
            <div className="flex items-center gap-1 text-[11px] uppercase text-muted-foreground">
              <k.icon className="size-3" /> {k.label}
            </div>
            <div className="text-2xl font-bold">{k.value}</div>
            {k.d}
          </div>
        ))}
      </div>

      {data.daily.length > 0 && (
        <div className="card-brut space-y-2 p-3">
          <h4 className="text-xs font-bold uppercase text-muted-foreground">Impressions par jour</h4>
          <div className="flex h-24 items-end gap-0.5">
            {data.daily.map((d) => (
              <div
                key={d.keys?.[0]}
                title={`${d.keys?.[0]} : ${d.impressions} impressions, ${d.clicks} clics`}
                className="flex-1 rounded-t bg-primary/70"
                style={{ height: `${Math.max(3, (d.impressions / maxImp) * 100)}%` }}
              />
            ))}
          </div>
        </div>
      )}

      <div className="grid gap-3 md:grid-cols-2">
        <RowTable title="Ce que les gens tapent sur Google" rows={data.queries} label={(k) => k} />
        <RowTable title="Pages qui apparaissent sur Google" rows={data.pages} label={shortUrl} />
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        <RowTable title="Pays" rows={data.countries} label={(k) => k.toUpperCase()} />
        <div className="card-brut space-y-2 p-3">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-bold uppercase text-muted-foreground">Sitemaps</h4>
            <Button size="sm" variant="outline" onClick={onResubmit} disabled={sending}>
              {sending ? <Loader2 className="mr-1 size-3.5 animate-spin" /> : <Send className="mr-1 size-3.5" />}
              Renvoyer à Google
            </Button>
          </div>
          <ul className="space-y-1">
            {data.sitemaps.map((s) => (
              <li key={s.path} className="flex flex-wrap items-center gap-1 text-xs">
                <span className="min-w-0 flex-1 truncate font-mono">{shortUrl(s.path)}</span>
                <Badge variant="secondary">{s.submitted} URLs</Badge>
                {s.errors > 0 ? <Badge variant="destructive">{s.errors} erreur(s)</Badge> : <Badge variant="outline">OK</Badge>}
                <span className="w-full text-[10px] text-muted-foreground">
                  Lu par Google : {s.lastDownloaded ? new Date(s.lastDownloaded).toLocaleString("fr-FR") : "pas encore"}
                </span>
              </li>
            ))}
            {data.sitemaps.length === 0 && <li className="text-xs text-muted-foreground">Aucun sitemap déclaré.</li>}
          </ul>
        </div>
      </div>
    </div>
  );
}

function RowTable({
  title,
  rows,
  label,
}: {
  title: string;
  rows: { keys?: string[]; clicks: number; impressions: number; position: number }[];
  label: (k: string) => string;
}) {
  return (
    <div className="card-brut space-y-2 p-3">
      <h4 className="text-xs font-bold uppercase text-muted-foreground">{title}</h4>
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">Pas encore de données.</p>
      ) : (
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-[10px] uppercase text-muted-foreground">
              <th className="py-1 font-normal"></th>
              <th className="font-normal">Clics</th>
              <th className="font-normal">Impr.</th>
              <th className="font-normal">Pos.</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, 15).map((r) => (
              <tr key={r.keys?.[0]} className="border-t border-border">
                <td className="max-w-[12rem] truncate py-1 pr-2">{label(r.keys?.[0] ?? "")}</td>
                <td>{r.clicks}</td>
                <td>{r.impressions}</td>
                <td>{fmtPos(r.position)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
