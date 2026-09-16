import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";
import { ShareButton } from "@/components/share/ShareButton";
import { FlipbookViewer } from "@/components/magazines/FlipbookViewer";
import { clampDescription } from "@/lib/i18n/seo-meta";
import { ogImageTags } from "@/lib/og-tags";
import { hlFromSearch, ogLocaleTags, withHl } from "@/lib/og-lang";
import { ogImageForLang } from "@/lib/og-image";
import { magazineShareImage } from "@/lib/fliphtml5";
import { useLang } from "@/lib/i18n";

const BASE_URL = "https://www.radio.indi-art-culture.com";
const OG_FALLBACK = ogImageForLang("fr");

type ShareSearch = { t?: string; d?: string; img?: string; hl?: string };

function str(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : undefined;
}

export const Route = createFileRoute("/partage/magazine/$id")({
  validateSearch: (search: Record<string, unknown>): ShareSearch => ({
    t: str(search.t, 160),
    d: str(search.d, 300),
    img: str(search.img, 500),
    hl: str(search.hl, 5),
  }),
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("magazine_entries")
      .select("id, title, body, cover_url, og_image_url, magazine_url")
      .eq("id", params.id)
      .eq("published", true)
      .maybeSingle();
    if (error || !data) throw notFound();
    return data;
  },
  head: ({ params, loaderData, match }) => {
    const lang = hlFromSearch(match.search);
    const s = match.search as ShareSearch;
    if (!loaderData) {
      return {
        meta: [
          { title: "Lien introuvable — InDi RaDio" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const qs = new URLSearchParams();
    if (s.t) qs.set("t", s.t);
    if (s.d) qs.set("d", s.d);
    if (s.img) qs.set("img", s.img);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const url = withHl(`${BASE_URL}/partage/magazine/${params.id}${suffix}`, lang);
    const title = s.t || `${loaderData.title} — Magazine interactif InDi ArT CulTuRe`;
    const desc = clampDescription(
      s.d || (loaderData.body || "").replace(/\s+/g, " ").slice(0, 300) || loaderData.title,
    );
    const share = magazineShareImage(loaderData, OG_FALLBACK);
    const image = s.img || share.image;
    const landscape = s.img ? true : share.landscape;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { name: "robots", content: "noindex" },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        ...ogLocaleTags(lang),
        ...ogImageTags(image, { baseUrl: BASE_URL, alt: title, declareSize: landscape }),
        { name: "twitter:card", content: landscape ? "summary_large_image" : "summary" },
      ],
    };
  },
  notFoundComponent: () => <NotFoundCard />,
  component: MagazineSharePage,
});

function NotFoundCard() {
  const { lang } = useLang();
  return (
    <div className="card-brut p-6 text-center">
      <p className="text-sm text-muted-foreground">
        {lang === "en" ? "This link is no longer available." : "Ce lien n'est plus disponible."}
      </p>
      <Link to="/magazines" className="mt-3 inline-block font-bold text-primary hover:underline">
        Magazines
      </Link>
    </div>
  );
}

function MagazineSharePage() {
  const entry = Route.useLoaderData();
  const search = Route.useSearch();
  const { lang } = useLang();
  const en = lang === "en";
  const title = search.t || entry.title;
  const desc = search.d || (entry.body || "").replace(/\s+/g, " ").slice(0, 220);
  const label = en ? "Interactive magazine" : "Magazine interactif";
  const cta = en ? "Open the full page" : "Voir la page complète";

  return (
    <article className="card-brut mx-auto max-w-2xl space-y-3 p-4">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        {label}
      </span>
      <h1 className="break-words text-xl font-black leading-tight">{title}</h1>
      {entry.magazine_url && (
        <FlipbookViewer url={entry.magazine_url} title={entry.title} />
      )}
      {desc && <p className="break-words text-sm text-muted-foreground">{desc}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/magazines/$magazineId"
          params={{ magazineId: entry.id }}
          className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground shadow-[2px_2px_0_0_#000]"
        >
          {cta} <ArrowRight className="size-4" />
        </Link>
        <ShareButton target={{ url: `/partage/magazine/${entry.id}`, title, text: desc }} />
      </div>
    </article>
  );
}
