import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";
import { ShareButton } from "@/components/share/ShareButton";
import { clampDescription } from "@/lib/i18n/seo-meta";
import { ogImageTags } from "@/lib/og-tags";
import { hlFromSearch, ogLocaleTags, withHl } from "@/lib/og-lang";
import { ogImageForLang } from "@/lib/og-image";
import { flipHtml5ThumbnailUrl } from "@/lib/fliphtml5";
import { useVillageTxt, VILLAGE_NAME } from "@/components/village/village-i18n";
import { useLang } from "@/lib/i18n";

const BASE_URL = "https://www.radio.indi-art-culture.com";
const OG_FALLBACK = ogImageForLang("fr");

type ShareSearch = { t?: string; d?: string; img?: string; hl?: string };

function str(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : undefined;
}

export const Route = createFileRoute("/partage/$slug")({
  validateSearch: (search: Record<string, unknown>): ShareSearch => ({
    t: str(search.t, 160),
    d: str(search.d, 300),
    img: str(search.img, 500),
    hl: str(search.hl, 5),
  }),
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("village_articles")
      .select("id, title, slug, excerpt, content, cover_url, magazine_url")
      .eq("slug", params.slug)
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
          { title: `Lien introuvable — ${VILLAGE_NAME}` },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const qs = new URLSearchParams();
    if (s.t) qs.set("t", s.t);
    if (s.d) qs.set("d", s.d);
    if (s.img) qs.set("img", s.img);
    const suffix = qs.toString() ? `?${qs.toString()}` : "";
    const url = withHl(`${BASE_URL}/partage/${params.slug}${suffix}`, lang);
    const title = s.t || `${loaderData.title} · ${VILLAGE_NAME} — InDi RaDio`;
    const desc = clampDescription(
      s.d || loaderData.excerpt || loaderData.content.replace(/\s+/g, " ").slice(0, 300),
    );
    const image =
      s.img ||
      loaderData.cover_url ||
      (loaderData.magazine_url ? flipHtml5ThumbnailUrl(loaderData.magazine_url) : null) ||
      OG_FALLBACK;
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
        ...ogImageTags(image, { baseUrl: BASE_URL, alt: title }),
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => <NotFoundCard />,
  component: SharePage,
});

function NotFoundCard() {
  const txt = useVillageTxt();
  return (
    <div className="card-brut p-6 text-center">
      <p className="text-sm text-muted-foreground">{txt.notFound}</p>
      <Link to="/redak-village" className="mt-3 inline-block font-bold text-primary hover:underline">
        {VILLAGE_NAME}
      </Link>
    </div>
  );
}

function SharePage() {
  const article = Route.useLoaderData();
  const search = Route.useSearch();
  const { lang } = useLang();
  const cta = lang === "en" ? "Read the article" : "Lire l'article";
  const title = search.t || article.title;
  const desc =
    search.d || article.excerpt || article.content.replace(/\s+/g, " ").slice(0, 200);
  const image =
    search.img ||
    article.cover_url ||
    (article.magazine_url ? flipHtml5ThumbnailUrl(article.magazine_url) : null);

  return (
    <article className="card-brut mx-auto max-w-2xl overflow-hidden">
      {image && (
        <img
          src={image}
          alt={title}
          className="aspect-[1200/630] w-full border-b-2 border-black object-cover"
          loading="eager"
        />
      )}
      <div className="space-y-3 p-4">
        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {VILLAGE_NAME}
        </span>
        <h1 className="break-words text-xl font-black leading-tight">{title}</h1>
        <p className="break-words text-sm text-muted-foreground">{desc}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Link
            to="/redak-village/$slug"
            params={{ slug: article.slug }}
            className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground shadow-[2px_2px_0_0_#000]"
          >
            {cta} <ArrowRight className="size-4" />
          </Link>
          <ShareButton target={{ url: `/partage/${article.slug}`, title, text: desc }} />
        </div>
      </div>
    </article>
  );
}
