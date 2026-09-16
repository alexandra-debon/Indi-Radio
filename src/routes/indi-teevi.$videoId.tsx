import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { clampDescription } from "@/lib/i18n/seo-meta";
import { ShareButton } from "@/components/share/ShareButton";
import { ExplicitVideoEmbed } from "@/components/media/UrlEmbeds";
import { parseMediaUrl } from "@/lib/media-embed";
import { breadcrumbLd, HOME_CRUMB, SITE_ORIGIN } from "@/lib/seo-breadcrumb";
import { ogImageTags, ogVideoTags } from "@/lib/og-tags";
import { teeviShareImage } from "@/lib/teevi-share-image";
import { hlFromSearch, ogLocaleTags, withHl } from "@/lib/og-lang";
import { localizedOgText } from "@/lib/og-lang-head";
import { TeeviLikeButton, TeeviComments } from "@/components/teevi/TeeviReactions";
import { useTeeviTxt } from "@/components/teevi/teevi-i18n";

const BASE_URL = "https://www.radio.indi-art-culture.com";

export const Route = createFileRoute("/indi-teevi/$videoId")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("teevi_videos")
      .select("id, title, video_url, summary, tags, published, og_image_url, created_at")
      .eq("id", params.videoId)
      .maybeSingle();
    if (error || !data) throw notFound();
    return data;
  },
  head: async ({ params, loaderData, match }) => {
    const lang = hlFromSearch(match.search);
    const url = withHl(`${BASE_URL}/indi-teevi/${params.videoId}`, lang);
    if (!loaderData) {
      return {
        meta: [
          { title: "Vidéo introuvable — InDi TeeVi, InDi RaDio" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const baseTitle = `${loaderData.title} · InDi TeeVi — InDi RaDio`;
    const baseDesc = clampDescription(
      loaderData.summary ||
        `Regarde « ${loaderData.title} » sur InDi TeeVi, la chaîne vidéo gratuite d'InDi RaDio.`,
    );
    const localized = await localizedOgText(lang, {
      entityType: "teevi_video",
      entityKey: loaderData.id,
      title: baseTitle,
      description: baseDesc,
    });
    const title = localized.title;
    const desc = clampDescription(localized.description);
    const media = parseMediaUrl(loaderData.video_url);
    const embed = media && media.kind === "vimeo" ? `https://player.vimeo.com/video/${media.id}` : null;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: embed ? "video.other" : "article" },
        ...ogLocaleTags(lang),
        ...(embed ? ogVideoTags(embed) : []),
        ...ogImageTags(teeviShareImage(loaderData, lang === "en" ? "en" : "fr").image),
        { name: "twitter:card", content: "summary_large_image" },
        ...(loaderData.published ? [] : [{ name: "robots", content: "noindex" }]),
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "VideoObject",
            name: loaderData.title,
            description: desc,
            uploadDate: loaderData.created_at,
            url,
            inLanguage: lang === "en" ? "en-US" : "fr-FR",
            ...(embed ? { embedUrl: embed } : {}),
            publisher: { "@id": `${BASE_URL}/#org` },
          }),
        },
        breadcrumbLd([
          HOME_CRUMB,
          { name: "InDi TeeVi", url: `${SITE_ORIGIN}/indi-teevi` },
          { name: loaderData.title, url },
        ]),
      ],
    };
  },
  notFoundComponent: TeeviNotFound,
  errorComponent: TeeviNotFound,
  component: TeeviDetailPage,
});

function TeeviNotFound() {
  const txt = useTeeviTxt();
  return (
    <div className="card-brut p-6 text-center">
      <p className="text-sm text-muted-foreground">{txt.notFound}</p>
      <Link to="/indi-teevi" className="mt-3 inline-block text-sm text-primary underline">
        {txt.back}
      </Link>
    </div>
  );
}

function TeeviDetailPage() {
  const video = Route.useLoaderData();
  const txt = useTeeviTxt();
  const url = `${BASE_URL}/indi-teevi/${video.id}`;

  return (
    <div className="space-y-4">
      <Link
        to="/indi-teevi"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> {txt.title}
      </Link>

      <article className="card-brut space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="min-w-0 break-words text-2xl font-black">{video.title}</h1>
          <ShareButton
            variant="chip"
            target={{
              url,
              title: `${video.title} — InDi TeeVi · InDi RaDio`,
              text: video.summary?.slice(0, 200) || video.title,
            }}
          />
        </div>

        <ExplicitVideoEmbed url={video.video_url} />

        {video.summary && (
          <p className="whitespace-pre-wrap break-words text-sm text-foreground/90">{video.summary}</p>
        )}

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

        <TeeviLikeButton videoId={video.id} />
      </article>

      <div className="card-brut p-4">
        <TeeviComments videoId={video.id} />
      </div>
    </div>
  );
}
