import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArrowRight } from "lucide-react";
import { ShareButton } from "@/components/share/ShareButton";
import { ExplicitVideoEmbed } from "@/components/media/UrlEmbeds";
import { parseMediaUrl } from "@/lib/media-embed";
import { clampDescription } from "@/lib/i18n/seo-meta";
import { ogImageTags, ogVideoTags } from "@/lib/og-tags";
import { hlFromSearch, ogLocaleTags, withHl } from "@/lib/og-lang";
import { ogImageForLang } from "@/lib/og-image";
import { useLang } from "@/lib/i18n";

const BASE_URL = "https://www.radio.indi-art-culture.com";
const OG_FALLBACK = ogImageForLang("fr");

type ShareSearch = { t?: string; d?: string; img?: string; hl?: string };

function str(v: unknown, max: number): string | undefined {
  if (typeof v !== "string") return undefined;
  const s = v.trim();
  return s ? s.slice(0, max) : undefined;
}

export const Route = createFileRoute("/partage/teevi/$id")({
  validateSearch: (search: Record<string, unknown>): ShareSearch => ({
    t: str(search.t, 160),
    d: str(search.d, 300),
    img: str(search.img, 500),
    hl: str(search.hl, 5),
  }),
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("teevi_videos")
      .select("id, title, video_url, summary, tags")
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
    const url = withHl(`${BASE_URL}/partage/teevi/${params.id}${suffix}`, lang);
    const title = s.t || `${loaderData.title} — InDi TeeVi`;
    const desc = clampDescription(
      s.d || (loaderData.summary || "").replace(/\s+/g, " ").slice(0, 300) || loaderData.title,
    );
    const image = s.img || OG_FALLBACK;
    const media = parseMediaUrl(loaderData.video_url);
    const embed =
      media && media.kind === "vimeo" ? `https://player.vimeo.com/video/${media.id}` : null;
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
        { property: "og:type", content: embed ? "video.other" : "article" },
        ...ogLocaleTags(lang),
        ...ogImageTags(image, { baseUrl: BASE_URL, alt: title }),
        ...(embed ? ogVideoTags(embed) : []),
        { name: "twitter:card", content: "summary_large_image" },
      ],
    };
  },
  notFoundComponent: () => <NotFoundCard />,
  component: TeeviSharePage,
});

function NotFoundCard() {
  const { lang } = useLang();
  return (
    <div className="card-brut p-6 text-center">
      <p className="text-sm text-muted-foreground">
        {lang === "en" ? "This link is no longer available." : "Ce lien n'est plus disponible."}
      </p>
      <Link to="/indi-teevi" className="mt-3 inline-block font-bold text-primary hover:underline">
        InDi TeeVi
      </Link>
    </div>
  );
}

function TeeviSharePage() {
  const video = Route.useLoaderData();
  const search = Route.useSearch();
  const { lang } = useLang();
  const en = lang === "en";
  const title = search.t || video.title;
  const desc = search.d || (video.summary || "").replace(/\s+/g, " ").slice(0, 220);
  const cta = en ? "Open the full page" : "Voir la page complète";

  return (
    <article className="card-brut mx-auto max-w-2xl space-y-3 p-4">
      <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        InDi TeeVi
      </span>
      <h1 className="break-words text-xl font-black leading-tight">{title}</h1>
      <ExplicitVideoEmbed url={video.video_url} />
      {desc && <p className="break-words text-sm text-muted-foreground">{desc}</p>}
      {video.tags && video.tags.length > 0 && (
        <ul className="flex flex-wrap gap-1.5">
          {video.tags.map((t) => (
            <li
              key={t}
              className="rounded-sm border-2 border-primary/60 bg-primary/5 px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest"
            >
              {t}
            </li>
          ))}
        </ul>
      )}
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/indi-teevi/$videoId"
          params={{ videoId: video.id }}
          className="inline-flex items-center gap-1 rounded-md border-2 border-black bg-primary px-3 py-1.5 text-sm font-bold text-primary-foreground shadow-[2px_2px_0_0_#000]"
        >
          {cta} <ArrowRight className="size-4" />
        </Link>
        <ShareButton target={{ url: `/partage/teevi/${video.id}`, title, text: desc }} />
      </div>
    </article>
  );
}
