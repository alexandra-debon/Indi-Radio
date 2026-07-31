import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { STATIC_SEO } from "@/lib/i18n/seo-meta";
import type { Lang } from "@/lib/i18n/dict";
import {
  SITE_ORIGIN,
  fetchSeoOverrides,
  indexOverrides,
  defaultSeo,
  saveSeoOverride,
  deleteSeoOverride,
  pingIndexNow,
  normalizePath,
  type SeoOverrideRow,
} from "@/lib/seo-overrides";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SitemapRobotsPreview } from "@/components/admin/SitemapRobotsPreview";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from "@/components/ui/dialog";
import { ImageUploader } from "@/components/media/ImageUploader";
import { toast } from "@/lib/toast";
import { Search, Pencil, RotateCcw, Save, ExternalLink, Loader2, Sparkles } from "lucide-react";

const TAGLINE_FR = "InDi RaDio 24/7 de la musique indépendante";
const TAGLINE_EN = "InDi RaDio 24/7 independent music radio";

type Target = { path: string; label: string; group: string };

/** ── Pages statiques ─────────────────────────────────────────────── */
const PAGE_LABELS: Record<string, string> = {
  "/": "Accueil / En direct",
  "/about": "À propos",
  "/actus": "Actus · Indi Rézo",
  "/podcasts": "Podcasts",
  "/emissions": "Émissions",
  "/chroniques": "Chroniques",
  "/magazines": "Magazine Indi Art Culture",
  "/clips": "Clip Addict",
  "/chart": "Chart",
  "/top": "Top podcasts & chroniques",
  "/top-users": "Top utilisateurs",
  "/artistes": "Galerie artistes",
  "/coups-de-coeur": "Coups de cœur",
  "/dedicaces": "Dédicaces",
  "/contact": "Contact",
  "/soumission-artistes": "Soumission artistes",
  "/newsletter": "Newsletter",
  "/privacy": "Confidentialité",
  "/terms": "Conditions d'utilisation",
};

function staticTargets(): Target[] {
  const paths = new Set<string>([...Object.keys(STATIC_SEO), ...Object.keys(PAGE_LABELS)]);
  return [...paths]
    .filter((p) => !["/auth", "/reset-password"].includes(p))
    .map((p) => ({ path: p, label: PAGE_LABELS[p] ?? p, group: "Page" }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

/** ── Articles / contenus dynamiques ──────────────────────────────── */
async function fetchArticleTargets(): Promise<Target[]> {
  const out: Target[] = [];
  const [news, chroniques, shows, episodes, mags, clips] = await Promise.all([
    supabase.from("news_posts").select("id, title, created_at").order("created_at", { ascending: false }).limit(200),
    supabase.from("album_reviews").select("slug, title, artist").order("updated_at", { ascending: false }).limit(200),
    supabase.from("shows").select("id, title").order("created_at", { ascending: false }).limit(200),
    supabase.from("episodes").select("id, title").order("published_at", { ascending: false }).limit(200),
    supabase.from("magazine_entries").select("id, title").order("created_at", { ascending: false }).limit(200),
    supabase.from("clip_entries").select("id, title").order("created_at", { ascending: false }).limit(200),
  ]);
  for (const r of news.data ?? []) out.push({ path: `/actus/${r.id}`, label: r.title, group: "Actu" });
  for (const r of chroniques.data ?? [])
    out.push({ path: `/chroniques/${r.slug}`, label: `${r.artist} — ${r.title}`, group: "Chronique" });
  for (const r of shows.data ?? []) out.push({ path: `/emissions/${r.id}`, label: r.title, group: "Émission" });
  for (const r of episodes.data ?? []) out.push({ path: `/episodes/${r.id}`, label: r.title, group: "Épisode" });
  for (const r of mags.data ?? []) out.push({ path: `/magazines/${r.id}`, label: r.title, group: "Magazine" });
  for (const r of clips.data ?? []) out.push({ path: `/clips/${r.id}`, label: r.title, group: "Clip" });
  return out;
}

export function SeoAdminPanel() {
  const [editing, setEditing] = useState<Target | null>(null);
  const { data: overrides } = useQuery({ queryKey: ["seo-overrides"], queryFn: fetchSeoOverrides });
  const map = useMemo(() => indexOverrides(overrides ?? []), [overrides]);

  return (
    <div className="space-y-4">
      <div className="card-brut space-y-1 p-3">
        <h2 className="text-sm font-bold">Référencement (SEO)</h2>
        <p className="text-xs text-muted-foreground">
          Choisis toi-même le titre, la description, l'image d'aperçu et l'indexation Google de chaque
          page et de chaque article, en français et en anglais. Sans réglage, les textes par défaut
          de l'application sont utilisés.
        </p>
      </div>

      <Tabs defaultValue="pages">
        <TabsList className="flex-wrap">
          <TabsTrigger value="pages">Pages</TabsTrigger>
          <TabsTrigger value="articles">Articles & contenus</TabsTrigger>
          <TabsTrigger value="sitemap">Sitemap & robots.txt</TabsTrigger>
        </TabsList>
        <TabsContent value="pages" className="mt-3">
          <TargetList targets={staticTargets()} map={map} onEdit={setEditing} />
        </TabsContent>
        <TabsContent value="articles" className="mt-3">
          <ArticlesList map={map} onEdit={setEditing} />
        </TabsContent>
        <TabsContent value="sitemap" className="mt-3">
          <SitemapRobotsPreview />
        </TabsContent>
      </Tabs>

      {editing && (
        <SeoEditorDialog
          target={editing}
          rows={overrides ?? []}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  );
}

function ArticlesList({
  map,
  onEdit,
}: {
  map: Map<string, SeoOverrideRow>;
  onEdit: (t: Target) => void;
}) {
  const { data, isLoading } = useQuery({ queryKey: ["seo-article-targets"], queryFn: fetchArticleTargets });
  if (isLoading) {
    return (
      <div className="flex items-center gap-2 p-4 text-sm text-muted-foreground">
        <Loader2 className="size-4 animate-spin" /> Chargement des contenus…
      </div>
    );
  }
  return <TargetList targets={data ?? []} map={map} onEdit={onEdit} />;
}

function TargetList({
  targets,
  map,
  onEdit,
}: {
  targets: Target[];
  map: Map<string, SeoOverrideRow>;
  onEdit: (t: Target) => void;
}) {
  const [q, setQ] = useState("");
  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return targets;
    return targets.filter(
      (t) => t.label.toLowerCase().includes(s) || t.path.toLowerCase().includes(s),
    );
  }, [q, targets]);

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Rechercher une page ou un article…"
          className="pl-8"
        />
      </div>
      <p className="text-xs text-muted-foreground">{filtered.length} élément(s)</p>
      <ul className="space-y-1">
        {filtered.map((t) => {
          const fr = map.get(`${normalizePath(t.path)}|fr`);
          const en = map.get(`${normalizePath(t.path)}|en`);
          const custom = Boolean(fr || en);
          const noindex = Boolean(fr?.noindex || en?.noindex);
          return (
            <li
              key={t.path}
              className="card-brut flex flex-wrap items-center gap-2 p-2"
            >
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold">{t.label}</div>
                <div className="truncate font-mono text-[11px] text-muted-foreground">{t.path}</div>
              </div>
              <Badge variant="secondary">{t.group}</Badge>
              {custom ? (
                <Badge className="bg-primary text-primary-foreground">Personnalisé</Badge>
              ) : (
                <Badge variant="outline">Par défaut</Badge>
              )}
              {noindex && <Badge variant="destructive">Non indexé</Badge>}
              <Button size="sm" variant="outline" onClick={() => onEdit(t)}>
                <Pencil className="mr-1 size-3.5" /> Modifier le SEO
              </Button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

type FormState = {
  title: string;
  description: string;
  og_image_url: string;
  canonical_url: string;
  keywords: string;
  noindex: boolean;
};

function emptyForm(): FormState {
  return { title: "", description: "", og_image_url: "", canonical_url: "", keywords: "", noindex: false };
}

function rowToForm(row: SeoOverrideRow | undefined): FormState {
  if (!row) return emptyForm();
  return {
    title: row.title ?? "",
    description: row.description ?? "",
    og_image_url: row.og_image_url ?? "",
    canonical_url: row.canonical_url ?? "",
    keywords: row.keywords ?? "",
    noindex: row.noindex,
  };
}

function SeoEditorDialog({
  target,
  rows,
  onClose,
}: {
  target: Target;
  rows: SeoOverrideRow[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const map = useMemo(() => indexOverrides(rows), [rows]);
  const [lang, setLang] = useState<Lang>("fr");
  const [forms, setForms] = useState<Record<Lang, FormState>>({
    fr: rowToForm(map.get(`${normalizePath(target.path)}|fr`)),
    en: rowToForm(map.get(`${normalizePath(target.path)}|en`)),
  });
  const [saving, setSaving] = useState(false);

  const form = forms[lang];
  const setForm = (patch: Partial<FormState>) =>
    setForms((f) => ({ ...f, [lang]: { ...f[lang], ...patch } }));

  const fallback = defaultSeo(target.path, lang);
  const shownTitle = form.title || fallback?.title || target.label;
  const shownDesc = form.description || fallback?.description || "";
  const shownUrl =
    form.canonical_url || `${SITE_ORIGIN}${normalizePath(target.path)}${lang === "en" ? "?hl=en" : ""}`;

  const suggest = () => {
    const tagline = lang === "fr" ? TAGLINE_FR : TAGLINE_EN;
    setForm({
      title: form.title || `${target.label} — ${tagline}`.slice(0, 60),
      description:
        form.description ||
        (lang === "fr"
          ? `${target.label} sur InDi RaDio, la radio 24/7 de la musique indépendante, sans pub, sans info.`
          : `${target.label} on InDi RaDio, the 24/7 independent music radio, ad-free and news-free.`
        ).slice(0, 160),
    });
  };

  const save = async () => {
    setSaving(true);
    try {
      for (const l of ["fr", "en"] as Lang[]) {
        const f = forms[l];
        const isEmpty =
          !f.title && !f.description && !f.og_image_url && !f.canonical_url && !f.keywords && !f.noindex;
        if (isEmpty) {
          if (map.get(`${normalizePath(target.path)}|${l}`)) await deleteSeoOverride(target.path, l);
          continue;
        }
        await saveSeoOverride({ path: target.path, lang: l, ...f });
      }
      await qc.invalidateQueries({ queryKey: ["seo-overrides"] });
      void pingIndexNow(target.path);
      toast.success("Réglages SEO enregistrés");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Enregistrement impossible");
    } finally {
      setSaving(false);
    }
  };

  const reset = async () => {
    setSaving(true);
    try {
      await Promise.all([
        deleteSeoOverride(target.path, "fr"),
        deleteSeoOverride(target.path, "en"),
      ]);
      await qc.invalidateQueries({ queryKey: ["seo-overrides"] });
      toast.success("Réglages réinitialisés (textes par défaut)");
      onClose();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Réinitialisation impossible");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[90dvh] max-w-3xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>SEO — {target.label}</DialogTitle>
          <DialogDescription className="font-mono text-xs">{normalizePath(target.path)}</DialogDescription>
        </DialogHeader>

        <Tabs value={lang} onValueChange={(v) => setLang(v as Lang)}>
          <TabsList>
            <TabsTrigger value="fr">🇫🇷 Français</TabsTrigger>
            <TabsTrigger value="en">🇬🇧 English</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="space-y-4">
          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="seo-title">Titre SEO</Label>
              <span className={form.title.length > 60 ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                {form.title.length}/60
              </span>
            </div>
            <Input
              id="seo-title"
              value={form.title}
              onChange={(e) => setForm({ title: e.target.value })}
              placeholder={fallback?.title ?? "Titre affiché dans Google"}
            />
          </div>

          <div>
            <div className="flex items-center justify-between">
              <Label htmlFor="seo-desc">Description SEO</Label>
              <span className={form.description.length > 160 ? "text-xs text-destructive" : "text-xs text-muted-foreground"}>
                {form.description.length}/160
              </span>
            </div>
            <Textarea
              id="seo-desc"
              rows={3}
              value={form.description}
              onChange={(e) => setForm({ description: e.target.value })}
              placeholder={fallback?.description ?? "Texte affiché sous le titre dans Google"}
            />
          </div>

          <Button type="button" variant="outline" size="sm" onClick={suggest}>
            <Sparkles className="mr-1 size-3.5" /> Proposer un titre et une description
          </Button>

          <div className="space-y-2">
            <Label>Image d'aperçu (Facebook, LinkedIn, WhatsApp)</Label>
            <ImageUploader
              value={form.og_image_url}
              onChange={(url) => setForm({ og_image_url: url })}
              folder="seo"
              label="Image de partage"
            />
            <Input
              value={form.og_image_url}
              onChange={(e) => setForm({ og_image_url: e.target.value })}
              placeholder="…ou colle une URL d'image (https://)"
            />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="seo-canonical">URL canonique (optionnel)</Label>
              <Input
                id="seo-canonical"
                value={form.canonical_url}
                onChange={(e) => setForm({ canonical_url: e.target.value })}
                placeholder={shownUrl}
              />
            </div>
            <div>
              <Label htmlFor="seo-kw">Mots-clés (optionnel)</Label>
              <Input
                id="seo-kw"
                value={form.keywords}
                onChange={(e) => setForm({ keywords: e.target.value })}
                placeholder="musique indépendante, radio indé…"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-md border p-3">
            <Switch
              id="seo-index"
              checked={!form.noindex}
              onCheckedChange={(v) => setForm({ noindex: !v })}
            />
            <Label htmlFor="seo-index" className="cursor-pointer text-sm">
              Afficher cette page dans les moteurs de recherche
            </Label>
          </div>

          {/* Aperçu Google */}
          <div className="space-y-2">
            <Label>Aperçu Google</Label>
            <div className="rounded-md border bg-background p-3">
              <div className="truncate text-xs text-muted-foreground">{shownUrl}</div>
              <div className="truncate text-lg text-primary">{shownTitle}</div>
              <p className="line-clamp-2 text-sm text-muted-foreground">{shownDesc}</p>
            </div>
          </div>

          {/* Aperçu réseau social */}
          <div className="space-y-2">
            <Label>Aperçu réseaux sociaux</Label>
            <div className="overflow-hidden rounded-md border">
              {form.og_image_url ? (
                <img
                  src={form.og_image_url}
                  alt="Aperçu de partage"
                  className="h-40 w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-24 items-center justify-center bg-muted text-xs text-muted-foreground">
                  Aucune image d'aperçu
                </div>
              )}
              <div className="space-y-1 p-3">
                <div className="text-[11px] uppercase text-muted-foreground">radio.indi-art-culture.com</div>
                <div className="truncate text-sm font-bold">{shownTitle}</div>
                <p className="line-clamp-2 text-xs text-muted-foreground">{shownDesc}</p>
              </div>
            </div>
          </div>

          <a
            href={shownUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
          >
            Ouvrir la page <ExternalLink className="size-3" />
          </a>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="ghost" onClick={reset} disabled={saving}>
            <RotateCcw className="mr-1 size-4" /> Réinitialiser
          </Button>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Annuler
          </Button>
          <Button onClick={save} disabled={saving}>
            {saving ? <Loader2 className="mr-1 size-4 animate-spin" /> : <Save className="mr-1 size-4" />}
            Enregistrer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
