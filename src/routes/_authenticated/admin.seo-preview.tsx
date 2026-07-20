import { createFileRoute, Link } from "@tanstack/react-router";
import { useAuth } from "@/hooks/use-auth";
import { useMemo, useState } from "react";
import { STATIC_SEO, PREFIX_SEO, type SeoBundle } from "@/lib/i18n/seo-meta";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
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
  const [diffMode, setDiffMode] = useState(true);
  const [onlyIdentical, setOnlyIdentical] = useState(false);
  const rows = useMemo(buildRows, []);
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let out = rows;
    if (s) out = out.filter(
      (r) =>
        r.path.toLowerCase().includes(s) ||
        r.bundle.fr.title.toLowerCase().includes(s) ||
        r.bundle.en.title.toLowerCase().includes(s) ||
        r.bundle.fr.description.toLowerCase().includes(s) ||
        r.bundle.en.description.toLowerCase().includes(s),
    );
    if (onlyIdentical) {
      out = out.filter(
        (r) =>
          r.bundle.fr.title === r.bundle.en.title ||
          r.bundle.fr.description === r.bundle.en.description,
      );
    }
    return out;
  }, [q, onlyIdentical, rows]);

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
        <div className="flex flex-wrap items-center gap-4 pt-1">
          <div className="flex items-center gap-2">
            <Switch id="diff-mode" checked={diffMode} onCheckedChange={setDiffMode} />
            <Label htmlFor="diff-mode" className="text-sm cursor-pointer">
              Mode diff (surligner les différences FR / EN)
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Switch
              id="only-identical"
              checked={onlyIdentical}
              onCheckedChange={setOnlyIdentical}
            />
            <Label htmlFor="only-identical" className="text-sm cursor-pointer">
              N'afficher que les FR = EN (à traduire)
            </Label>
          </div>
          <span className="ml-auto flex items-center gap-3 text-[11px] text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <i className="inline-block h-3 w-3 rounded-sm bg-emerald-500/30 ring-1 ring-emerald-500/60" />
              ajouté / propre à cette langue
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="inline-block h-3 w-3 rounded-sm bg-rose-500/30 ring-1 ring-rose-500/60" />
              supprimé / présent dans l'autre langue
            </span>
            <span className="inline-flex items-center gap-1">
              <i className="inline-block h-3 w-3 rounded-sm bg-amber-500/30 ring-1 ring-amber-500/60" />
              identique aux deux langues (potentiellement non traduit)
            </span>
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          {filtered.length} route{filtered.length > 1 ? "s" : ""} — {rows.length} au total.
        </p>
      </header>

      <div className="space-y-4">
        {filtered.map((r) => (
          <RouteCard key={`${r.kind}:${r.path}`} row={r} diffMode={diffMode} />
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

function RouteCard({ row, diffMode }: { row: Row; diffMode: boolean }) {
  const titleIdentical = row.bundle.fr.title === row.bundle.en.title;
  const descIdentical = row.bundle.fr.description === row.bundle.en.description;
  return (
    <article className="rounded-lg border bg-card p-4 shadow-sm">
      <header className="mb-3 flex flex-wrap items-center gap-2">
        <code className="rounded bg-muted px-2 py-1 text-sm font-semibold">{row.path}</code>
        <Badge variant={row.kind === "static" ? "default" : "secondary"}>
          {row.kind === "static" ? "Route statique" : "Préfixe dynamique"}
        </Badge>
        {(titleIdentical || descIdentical) && (
          <Badge variant="destructive" className="ml-auto">
            {titleIdentical && descIdentical
              ? "title + description identiques FR/EN"
              : titleIdentical
                ? "title identique FR/EN"
                : "description identique FR/EN"}
          </Badge>
        )}
      </header>
      <div className="grid gap-3 md:grid-cols-2">
        <LangPanel
          lang="fr"
          path={row.path}
          entry={row.bundle.fr}
          other={row.bundle.en}
          diffMode={diffMode}
        />
        <LangPanel
          lang="en"
          path={row.path}
          entry={row.bundle.en}
          other={row.bundle.fr}
          diffMode={diffMode}
        />
      </div>
    </article>
  );
}

function LangPanel({
  lang,
  path,
  entry,
  other,
  diffMode,
}: {
  lang: "fr" | "en";
  path: string;
  entry: { title: string; description: string };
  other: { title: string; description: string };
  diffMode: boolean;
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
      <Field
        label="title / og:title"
        value={entry.title}
        compareTo={other.title}
        diffMode={diffMode}
        lang={lang}
      />
      <Field
        label="description / og:description"
        value={entry.description}
        compareTo={other.description}
        diffMode={diffMode}
        lang={lang}
        multiline
      />
      <Field label="og:url / canonical" value={href} mono />
      <Field label="og:locale" value={lang === "fr" ? "fr_FR" : "en_US"} mono />
    </div>
  );
}

function Field({
  label,
  value,
  compareTo,
  diffMode,
  lang,
  multiline,
  mono,
}: {
  label: string;
  value: string;
  compareTo?: string;
  diffMode?: boolean;
  lang?: "fr" | "en";
  multiline?: boolean;
  mono?: boolean;
}) {
  const over =
    (label.startsWith("title") && value.length > 60) ||
    (label.startsWith("description") && value.length > 160);
  const showDiff = diffMode && compareTo !== undefined && !mono;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] uppercase tracking-wide text-muted-foreground">
        <span>{label}</span>
        <span className={over ? "text-destructive" : ""}>{value.length} car.</span>
      </div>
      {showDiff ? (
        <p
          className={["text-sm leading-relaxed", multiline ? "" : "truncate"].join(" ")}
          title={value}
        >
          <DiffText a={value} b={compareTo!} side={lang === "en" ? "b" : "a"} />
        </p>
      ) : (
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
      )}
    </div>
  );
}

/**
 * Word-level diff between the panel's own value (`self`) and the other
 * language's value (`other`). Renders the panel's own tokens, tinted:
 *   - amber  : token present in both languages (potentially untranslated)
 *   - emerald: token unique to this language (added vs the other)
 * A trailing muted line lists tokens present only in the OTHER language
 * (i.e. "missing here"), tinted rose. This keeps each panel readable while
 * still surfacing bidirectional differences.
 */
function DiffText({ a, b, side }: { a: string; b: string; side: "a" | "b" }) {
  const self = side === "a" ? a : b;
  const other = side === "a" ? b : a;
  const selfTokens = tokenize(self);
  const otherTokens = tokenize(other);
  const otherWordCounts = countWords(otherTokens);

  const rendered: React.ReactNode[] = [];
  const consumed = new Map<string, number>();
  for (let i = 0; i < selfTokens.length; i++) {
    const t = selfTokens[i];
    if (!isWord(t)) {
      rendered.push(<span key={i}>{t}</span>);
      continue;
    }
    const key = t.toLowerCase();
    const available = (otherWordCounts.get(key) ?? 0) - (consumed.get(key) ?? 0);
    if (available > 0) {
      consumed.set(key, (consumed.get(key) ?? 0) + 1);
      rendered.push(
        <mark
          key={i}
          className="rounded bg-amber-500/25 px-0.5 text-inherit ring-1 ring-inset ring-amber-500/40"
          title="identique dans l'autre langue"
        >
          {t}
        </mark>,
      );
    } else {
      rendered.push(
        <mark
          key={i}
          className="rounded bg-emerald-500/25 px-0.5 text-inherit ring-1 ring-inset ring-emerald-500/40"
          title="propre à cette langue"
        >
          {t}
        </mark>,
      );
    }
  }

  // Words only in the other language.
  const selfCounts = countWords(selfTokens);
  const consumedOther = new Map<string, number>();
  const onlyOther: string[] = [];
  for (const t of otherTokens) {
    if (!isWord(t)) continue;
    const key = t.toLowerCase();
    const available = (selfCounts.get(key) ?? 0) - (consumedOther.get(key) ?? 0);
    if (available > 0) {
      consumedOther.set(key, (consumedOther.get(key) ?? 0) + 1);
    } else {
      onlyOther.push(t);
    }
  }

  return (
    <>
      {rendered}
      {onlyOther.length > 0 && (
        <span className="mt-1 block text-[11px] text-muted-foreground">
          Absent ici, présent en {side === "a" ? "EN" : "FR"} :{" "}
          {onlyOther.map((w, i) => (
            <mark
              key={i}
              className="mr-1 rounded bg-rose-500/25 px-0.5 text-inherit line-through decoration-rose-500/60 ring-1 ring-inset ring-rose-500/40"
            >
              {w}
            </mark>
          ))}
        </span>
      )}
    </>
  );
}

function tokenize(s: string): string[] {
  // Split into word / non-word runs so we can preserve punctuation and spacing.
  return s.match(/[\p{L}\p{N}]+|[^\p{L}\p{N}]+/gu) ?? [];
}

function isWord(t: string): boolean {
  return /[\p{L}\p{N}]/u.test(t);
}

function countWords(tokens: string[]): Map<string, number> {
  const m = new Map<string, number>();
  for (const t of tokens) {
    if (!isWord(t)) continue;
    const k = t.toLowerCase();
    m.set(k, (m.get(k) ?? 0) + 1);
  }
  return m;
}