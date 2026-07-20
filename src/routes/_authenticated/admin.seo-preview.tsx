import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useMemo, useState } from "react";
import { STATIC_SEO, PREFIX_SEO, type SeoBundle } from "@/lib/i18n/seo-meta";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, ExternalLink } from "lucide-react";

const SITE = "https://radio.indi-art-culture.com";

export const Route = createFileRoute("/_authenticated/admin/seo-preview")({
  head: () => ({
    meta: [
      { title: "Aperçu SEO — InDi RaDio" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: SeoPreviewPage,
});

type Row = { path: string; kind: "static" | "prefix"; bundle: SeoBundle };

function buildRows(): Row[] {
  const rows: Row[] = [];
  for (const [path, bundle] of Object.entries(STATIC_SEO)) {
    rows.push({ path, kind: "static", bundle });
  }
  for (const { prefix, bundle } of PREFIX_SEO) {
    rows.push({ path: `${prefix}…`, kind: "prefix", bundle });
  }
  return rows.sort((a, b) => a.path.localeCompare(b.path));
}

function url(path: string, lang: "fr" | "en"): string {
  const p = path.endsWith("…") ? path.slice(0, -1) + "example" : path;
  return `${SITE}${p}${lang === "en" ? "?hl=en" : ""}`;
}

function SeoPreviewPage() {
  const { isAdmin } = useAuth();
  const [q, setQ] = useState("");
  const rows = useMemo(buildRows, []);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.path.toLowerCase().includes(s) ||
        r.bundle.fr.title.toLowerCase().includes(s) ||
        r.bundle.en.title.toLowerCase().includes(s) ||
        r.bundle.fr.description.toLowerCase().includes(s) ||
        r.bundle.en.description.toLowerCase().includes(s),
    );
  }, [q, rows]);

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-2xl p-6">
        <div className="flex items-center gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-4 text-destructive">
          <ShieldAlert className="h-5 w-5" />
          <span>Accès réservé aux administrateurs.</span>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 sm:p-6">
      <header className="space-y-2">
        <h1 className="text-2xl font-bold">Aperçu SEO — FR / EN</h1>
        <p className="text-sm text-muted-foreground">
          Comparaison des meta tags générés (title, description, og:title, og:description, og:url,
          canonical) pour chaque route, en français et en anglais (<code>?hl=en</code>).
        </p>
        <div className="flex gap-2">
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Filtrer par chemin ou contenu…"
            className="max-w-sm"
          />
          <Button variant="outline" onClick={() => setQ("")} disabled={!q}>
            Réinitialiser
          </Button>
        </div>
        <p className="text-xs text-muted-foreground">
          {filtered.length} route{filtered.length > 1 ? "s" : ""} — {rows.length} au total.
        </p>
      </header>

      <div className="space-y-4">
        {filtered.map((r) => (
          <RouteCard key={`${r.kind}:${r.path}`} row={r} />
        ))}
      </div>

      <div className="pt-6 text-sm">
        <Link to="/admin" className="text-primary underline">
          ← Retour au panneau admin
        </Link>
      </div>
    </div>
  );
}

function RouteCard({ row }: { row: Row }) {
  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm">
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <code className="rounded bg-muted px-2 py-1 text-sm font-semibold">{row.path}</code>
        <Badge variant={row.kind === "static" ? "default" : "secondary"}>
          {row.kind === "static" ? "Route statique" : "Préfixe dynamique"}
        </Badge>
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        <LangPanel lang="fr" path={row.path} entry={row.bundle.fr} />
        <LangPanel lang="en" path={row.path} entry={row.bundle.en} />
      </div>
    </article>
  );
}

function LangPanel({
  lang,
  path,
  entry,
}: {
  lang: "fr" | "en";
  path: string;
  entry: { title: string; description: string };
}) {
  const href = url(path, lang);
  const isPrefix = path.endsWith("…");
  return (
    <div className="space-y-2 rounded-md border bg-background p-3">
      <div className="flex items-center justify-between">
        <Badge variant={lang === "fr" ? "outline" : "default"}>
          {lang === "fr" ? "🇫🇷 Français" : "🇬🇧 English (?hl=en)"}
        </Badge>
        {!isPrefix && (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ouvrir <ExternalLink className="h-3 w-3" />
          </a>
        )}
      </div>
      <Field label="title / og:title" value={entry.title} />
      <Field label="description / og:description" value={entry.description} multiline />
      <Field label="og:url / canonical" value={href} mono />
      <Field label="og:locale" value={lang === "fr" ? "fr_FR" : "en_US"} mono />
    </div>
  );
}

function Field({
  label,
  value,
  multiline,
  mono,
}: {
  label: string;
  value: string;
  multiline?: boolean;
  mono?: boolean;
}) {
  const over =
    (label.startsWith("title") && value.length > 60) ||
    (label.startsWith("description") && value.length > 160);
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span className={over ? "text-destructive" : ""}>{value.length} car.</span>
      </div>
      <p
        className={[
          "text-sm",
          mono ? "font-mono break-all" : "",
          multiline ? "" : "truncate",
        ].join(" ")}
        title={value}
      >
        {value}
      </p>
    </div>
  );
}