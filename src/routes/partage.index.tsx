import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageUploader } from "@/components/media/ImageUploader";
import { ShareButton } from "@/components/share/ShareButton";
import { Copy, Link2 } from "lucide-react";
import { toast } from "@/lib/toast";
import { flipHtml5ThumbnailUrl } from "@/lib/fliphtml5";
import { useLang } from "@/lib/i18n";
import { VILLAGE_NAME } from "@/components/village/village-i18n";

const BASE_URL = "https://www.radio.indi-art-culture.com";

const TXT = {
  fr: {
    title: `Partager un lien ${VILLAGE_NAME}`,
    intro:
      "Choisissez un article, ajustez le titre, la description et la vignette : vous obtenez un lien public prêt à envoyer, avec son aperçu.",
    pick: "Article",
    ptitle: "Titre affiché",
    pdesc: "Description",
    pimg: "Vignette de partage (paysage 1200×630)",
    link: "Lien à envoyer",
    copy: "Copier le lien",
    copied: "Lien copié",
    preview: "Aperçu",
    empty: "Aucun article publié pour le moment.",
    reset: "Valeurs d'origine",
    open: "Ouvrir le lien",
    teevi: "Partager une vidéo InDi TeeVi",
  },
  en: {
    title: `Share a ${VILLAGE_NAME} link`,
    intro:
      "Pick an article, adjust the title, description and thumbnail: you get a public link ready to send, with its preview.",
    pick: "Article",
    ptitle: "Displayed title",
    pdesc: "Description",
    pimg: "Share thumbnail (landscape 1200×630)",
    link: "Link to send",
    copy: "Copy link",
    copied: "Link copied",
    preview: "Preview",
    empty: "No published article yet.",
    reset: "Original values",
    open: "Open link",
    teevi: "Share an InDi TeeVi video",
  },
} as const;

export const Route = createFileRoute("/partage/")({
  head: () => ({
    meta: [
      { title: `Partager un lien ${VILLAGE_NAME} — InDi RaDio` },
      {
        name: "description",
        content: `Composez un lien public ${VILLAGE_NAME} avec titre, description et vignette prédéfinis.`,
      },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: `Partager un lien ${VILLAGE_NAME} — InDi RaDio` },
      {
        property: "og:description",
        content: `Composez un lien public ${VILLAGE_NAME} avec titre, description et vignette prédéfinis.`,
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ShareComposer,
});

type Row = {
  id: string;
  slug: string;
  title: string;
  excerpt: string | null;
  content: string;
  cover_url: string | null;
  magazine_url: string | null;
};

function defaults(row: Row) {
  return {
    title: row.title,
    desc: (row.excerpt || row.content.replace(/\s+/g, " ").slice(0, 200)).trim(),
    img:
      row.cover_url ||
      (row.magazine_url ? flipHtml5ThumbnailUrl(row.magazine_url) : null) ||
      "",
  };
}

function ShareComposer() {
  const { lang } = useLang();
  const t = TXT[lang === "en" ? "en" : "fr"];
  const [slug, setSlug] = useState<string>("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [img, setImg] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["share-composer-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("village_articles")
        .select("id, slug, title, excerpt, content, cover_url, magazine_url")
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const current = rows.find((r) => r.slug === slug) ?? null;

  function select(row: Row) {
    const d = defaults(row);
    setSlug(row.slug);
    setTitle(d.title);
    setDesc(d.desc);
    setImg(d.img);
  }

  const url = useMemo(() => {
    if (!current) return "";
    const d = defaults(current);
    const qs = new URLSearchParams();
    if (title && title !== d.title) qs.set("t", title.slice(0, 160));
    if (desc && desc !== d.desc) qs.set("d", desc.slice(0, 300));
    if (img && img !== d.img) qs.set("img", img);
    const q = qs.toString();
    return `${BASE_URL}/partage/${current.slug}${q ? `?${q}` : ""}`;
  }, [current, title, desc, img]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      toast.success(t.copied);
    } catch {
      toast.error(url);
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-4">
      <header className="card-brut space-y-1 p-4">
        <h1 className="text-xl font-black">{t.title}</h1>
        <p className="text-sm text-muted-foreground">{t.intro}</p>
        <Link to="/partage/teevi" className="text-sm font-bold text-primary hover:underline">
          {t.teevi}
        </Link>
      </header>

      <section className="card-brut space-y-2 p-4">
        <span className="text-xs font-black uppercase tracking-wide">{t.pick}</span>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
            {rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => select(r)}
                className={`truncate rounded-md border-2 border-black px-2 py-1.5 text-left text-sm font-bold ${
                  r.slug === slug ? "bg-primary text-primary-foreground" : "bg-card"
                }`}
              >
                {r.title}
              </button>
            ))}
          </div>
        )}
      </section>

      {current && (
        <>
          <section className="card-brut space-y-3 p-4">
            <label className="block space-y-1">
              <span className="text-xs font-black uppercase tracking-wide">{t.ptitle}</span>
              <Input value={title} maxLength={160} onChange={(e) => setTitle(e.target.value)} />
            </label>
            <label className="block space-y-1">
              <span className="text-xs font-black uppercase tracking-wide">{t.pdesc}</span>
              <Textarea
                value={desc}
                maxLength={300}
                rows={3}
                onChange={(e) => setDesc(e.target.value)}
              />
            </label>
            <ImageUploader
              value={img}
              onChange={(v) => setImg(v || "")}
              folder="share"
              usage="cover"
              defaultRatio="16:9"
              label={t.pimg}
            />
            <Button variant="outline" size="sm" onClick={() => select(current)}>
              {t.reset}
            </Button>
          </section>

          <section className="card-brut space-y-3 p-4">
            <span className="text-xs font-black uppercase tracking-wide">{t.link}</span>
            <p className="break-all rounded-md border-2 border-black bg-muted p-2 text-xs">{url}</p>
            <div className="flex flex-wrap items-center gap-2">
              <Button size="sm" onClick={copy}>
                <Copy className="mr-1 size-4" />
                {t.copy}
              </Button>
              <ShareButton
                variant="chip"
                target={{ url: `/partage/${current.slug}`, title, text: desc }}
              />
              <Link
                to="/partage/$slug"
                params={{ slug: current.slug }}
                className="inline-flex items-center gap-1 text-sm font-bold text-primary hover:underline"
              >
                <Link2 className="size-4" />
                {t.open}
              </Link>
            </div>
          </section>

          <section className="card-brut overflow-hidden">
            <span className="block px-4 pt-3 text-xs font-black uppercase tracking-wide">
              {t.preview}
            </span>
            <div className="p-4">
              <div className="overflow-hidden rounded-md border-2 border-black">
                {img && (
                  <img
                    src={img}
                    alt={title}
                    className="aspect-[1200/630] w-full border-b-2 border-black object-cover"
                  />
                )}
                <div className="space-y-1 bg-card p-3">
                  <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
                    radio.indi-art-culture.com
                  </p>
                  <p className="break-words text-sm font-black leading-tight">{title}</p>
                  <p className="line-clamp-2 break-words text-xs text-muted-foreground">{desc}</p>
                </div>
              </div>
            </div>
          </section>
        </>
      )}
    </div>
  );
}
