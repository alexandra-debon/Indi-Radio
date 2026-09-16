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
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";

const BASE_URL = "https://www.radio.indi-art-culture.com";

const TXT = {
  fr: {
    title: "Partager une publication du mur",
    intro:
      "Choisissez une de vos publications, ajustez le titre, la description et la vignette : vous obtenez un lien public prêt à envoyer, avec son aperçu réseaux.",
    pick: "Publication",
    ptitle: "Titre affiché",
    pdesc: "Description",
    pimg: "Vignette de partage (paysage 1200×630)",
    link: "Lien à envoyer",
    copy: "Copier le lien",
    copied: "Lien copié",
    preview: "Aperçu",
    empty: "Aucune publication à partager pour le moment.",
    signin: "Connectez-vous pour composer un lien vers vos publications.",
    reset: "Valeurs d'origine",
    open: "Ouvrir le lien",
    village: "Partager un article RéDaK'Village",
    magazine: "Partager un magazine interactif",
  },
  en: {
    title: "Share a wall post",
    intro:
      "Pick one of your posts, adjust the title, description and thumbnail: you get a public link ready to send, with its social preview.",
    pick: "Post",
    ptitle: "Displayed title",
    pdesc: "Description",
    pimg: "Share thumbnail (landscape 1200×630)",
    link: "Link to send",
    copy: "Copy link",
    copied: "Link copied",
    preview: "Preview",
    empty: "No post to share yet.",
    signin: "Sign in to compose a link to your posts.",
    reset: "Original values",
    open: "Open link",
    village: "Share a RéDaK'Village article",
    magazine: "Share an interactive magazine",
  },
} as const;

const HEAD_TITLE = "Partager une publication du mur — InDi RaDio";
const HEAD_DESC =
  "Composez un lien public vers une publication du mur InDi RaDio avec titre, description et vignette prédéfinis.";

export const Route = createFileRoute("/partage/publication/")({
  head: () => ({
    meta: [
      { title: HEAD_TITLE },
      { name: "description", content: HEAD_DESC },
      { name: "robots", content: "noindex" },
      { property: "og:title", content: HEAD_TITLE },
      { property: "og:description", content: HEAD_DESC },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: PostShareComposer,
});

type Row = {
  id: string;
  title: string | null;
  content: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  og_image_url: string | null;
};

function defaults(row: Row) {
  const text = (row.content || "").replace(/\s+/g, " ").trim();
  return {
    title: (row.title || text.slice(0, 80) || "InDi RaDio").trim(),
    desc: text.slice(0, 220),
    img: row.og_image_url || row.image_url || row.image_urls?.[0] || "",
  };
}

function PostShareComposer() {
  const { lang } = useLang();
  const { user, isAdmin } = useAuth();
  const t = TXT[lang === "en" ? "en" : "fr"];
  const [id, setId] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [img, setImg] = useState("");

  const { data: rows = [] } = useQuery({
    queryKey: ["share-composer-posts", user?.id, isAdmin],
    enabled: !!user,
    queryFn: async () => {
      let q = supabase
        .from("posts")
        .select("id, title, content, image_url, image_urls, og_image_url")
        .order("created_at", { ascending: false })
        .limit(60);
      if (!isAdmin) q = q.eq("author_id", user!.id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as Row[];
    },
  });

  const current = rows.find((r) => r.id === id) ?? null;

  function select(row: Row) {
    const d = defaults(row);
    setId(row.id);
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
    return `${BASE_URL}/partage/publication/${current.id}${q ? `?${q}` : ""}`;
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
        <div className="flex flex-wrap gap-3">
          <Link to="/partage" className="text-sm font-bold text-primary hover:underline">
            {t.village}
          </Link>
          <Link
            to="/partage/magazine"
            className="text-sm font-bold text-primary hover:underline"
          >
            {t.magazine}
          </Link>
        </div>
      </header>

      <section className="card-brut space-y-2 p-4">
        <span className="text-xs font-black uppercase tracking-wide">{t.pick}</span>
        {!user ? (
          <p className="text-sm text-muted-foreground">{t.signin}</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">{t.empty}</p>
        ) : (
          <div className="flex max-h-56 flex-col gap-1 overflow-y-auto">
            {rows.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => select(r)}
                className={`truncate rounded-md border-2 border-black px-2 py-1.5 text-left text-sm font-bold ${
                  r.id === id ? "bg-primary text-primary-foreground" : "bg-card"
                }`}
              >
                {defaults(r).title}
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
              folder="posts"
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
                target={{ url: `/partage/publication/${current.id}`, title, text: desc }}
              />
              <Link
                to="/partage/publication/$id"
                params={{ id: current.id }}
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
