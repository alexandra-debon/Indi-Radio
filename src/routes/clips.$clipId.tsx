import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { clampDescription } from "@/lib/i18n/seo-meta";
import { supabase } from "@/integrations/supabase/client";
import { ShareButton } from "@/components/share/ShareButton";
import { ExplicitVideoEmbed, UrlEmbeds } from "@/components/media/UrlEmbeds";
import { parseMediaUrl } from "@/lib/media-embed";
import { ArrowLeft } from "lucide-react";
import ogClips from "@/assets/og-clips.jpg";
import { breadcrumbLd, HOME_CRUMB, SITE_ORIGIN } from "@/lib/seo-breadcrumb";
import { ogCommonTags, ogImageTags, ogVideoTags } from "@/lib/og-tags";
import { hlFromSearch, ogLocaleTags, withHl } from "@/lib/og-lang";
import { localizedOgText } from "@/lib/og-lang-head";
import { TranslatedText } from "@/components/i18n/TranslatedText";

const BASE_URL = "https://radio.indi-art-culture.com";
const OG_FALLBACK = `${BASE_URL}${ogClips}`;

function pickMedia(row: {
  video_url: string | null;
  playlist_url: string | null;
  video_urls: string[] | null;
}): { thumb: string | null; hqThumb: string | null; embed: string | null; content: string | null } {
  const candidates = [row.video_url, row.playlist_url, ...(row.video_urls ?? [])].filter(Boolean) as string[];
  for (const u of candidates) {
    const m = parseMediaUrl(u);
    if (m?.kind === "youtube" && m.type === "video") {
      return {
        thumb: `https://i.ytimg.com/vi/${m.id}/maxresdefault.jpg`,
        hqThumb: `https://i.ytimg.com/vi/${m.id}/hqdefault.jpg`,
        embed: `https://www.youtube.com/embed/${m.id}`,
        content: `https://www.youtube.com/watch?v=${m.id}`,
      };
    }
    if (m?.kind === "vimeo") {
      return {
        thumb: null,
        hqThumb: null,
        embed: `https://player.vimeo.com/video/${m.id}`,
        content: `https://vimeo.com/${m.id}`,
      };
    }
  }
  const first = candidates[0] ?? null;
  return { thumb: null, hqThumb: null, embed: null, content: first };
}

/** Vérifie que la miniature YouTube haute résolution existe réellement. */
async function resolveThumb(media: ReturnType<typeof pickMedia>) {
  if (!media.thumb) return null;
  try {
    const res = await fetch(media.thumb, { method: "HEAD" });
    if (res.ok) return { url: media.thumb, width: 1280, height: 720 };
  } catch {
    /* réseau indisponible : on retombe sur hqdefault */
  }
  return media.hqThumb ? { url: media.hqThumb, width: 480, height: 360 } : null;
}

export const Route = createFileRoute("/clips/$clipId")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("clip_entries")
      .select("id,section,title,body,video_url,playlist_url,video_urls,created_at")
      .eq("id", params.clipId)
      .maybeSingle();
    if (error || !data) throw notFound();
    const thumb = await resolveThumb(pickMedia(data));
    return { ...data, thumb };
  },
  head: async ({ params, loaderData, match }) => {
    const lang = hlFromSearch(match.search);
    const url = withHl(`${BASE_URL}/clips/${params.clipId}`, lang);
    if (!loaderData) {
      return { meta: [{ title: "Clip introuvable — Clip Addict, InDi RaDio" }, { name: "robots", content: "noindex" }] };
    }
    const baseTitle = `${loaderData.title} · Clip Addict — InDi RaDio`;
    const baseDesc = clampDescription(
      loaderData.body ||
        `Découvre le clip « ${loaderData.title} » sélectionné par InDi RaDio, la radio 24/7 de la musique indépendante.`,
    );
    const localized = await localizedOgText(lang, {
      entityType: "clip_entry",
      entityKey: loaderData.id,
      title: baseTitle,
      description: baseDesc,
    });
    const title = localized.title;
    const desc = clampDescription(localized.description);
    const media = pickMedia(loaderData);
    const thumb = loaderData.thumb;
    const image = thumb?.url || OG_FALLBACK;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: media.embed ? "video.other" : "article" },
        ...ogLocaleTags(lang),
        ...(media.embed ? ogVideoTags(media.embed) : []),
        ...ogImageTags(image, {
          baseUrl: BASE_URL,
          width: thumb?.width ?? 1200,
          height: thumb?.height ?? 630,
          alt: loaderData.title,
        }),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": ["VideoObject", "MusicVideoObject"],
            name: loaderData.title,
            description: desc,
            thumbnailUrl: image,
            uploadDate: loaderData.created_at,
            url,
            inLanguage: lang === "en" ? "en-US" : "fr-FR",
            ...(media.embed ? { embedUrl: media.embed } : {}),
            ...(media.content ? { contentUrl: media.content } : {}),
            publisher: { "@id": `${BASE_URL}/#org` },
          }),
        },
        breadcrumbLd([
          HOME_CRUMB,
          { name: "Clip Addict", url: `${SITE_ORIGIN}/clips` },
          { name: loaderData.title, url },
        ]),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="card-brut p-6 text-center">
      <p className="text-sm text-muted-foreground">Ce clip n'existe pas ou a été supprimé.</p>
      <Link to="/clips" className="mt-3 inline-block text-sm text-primary underline">Retour à Clip Addict</Link>
    </div>
  ),
  errorComponent: () => (
    <div className="card-brut p-6 text-center text-sm text-muted-foreground">Erreur de chargement.</div>
  ),
  component: ClipDetailPage,
});

function ClipDetailPage() {
  const entry = Route.useLoaderData();
  const { clipId } = Route.useParams();
  const url = `${BASE_URL}/clips/${clipId}`;
  const videos: string[] = [];
  if (entry.video_url) videos.push(entry.video_url);
  if (entry.playlist_url) videos.push(entry.playlist_url);
  if (entry.video_urls) videos.push(...entry.video_urls);

  return (
    <div className="space-y-4">
      <Link to="/clips" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Clip Addict
      </Link>
      <article className="card-brut space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <TranslatedText
            as="h1"
            className="text-2xl font-bold"
            entityType="clip_entry"
            entityKey={entry.id}
            field="title"
            text={entry.title}
          />
          <ShareButton
            variant="chip"
            target={{ url, title: `${entry.title} — Clip Addict · Indi Radio`, text: entry.body?.slice(0, 200) || entry.title }}
          />
        </div>
        {entry.body && (
          <TranslatedText
            as="p"
            className="whitespace-pre-wrap text-sm"
            entityType="clip_entry"
            entityKey={entry.id}
            field="body"
            text={entry.body}
          />
        )}
        {entry.body && <UrlEmbeds text={entry.body} />}
        <div className="space-y-3">
          {videos.map((v) => <ExplicitVideoEmbed key={v} url={v} />)}
        </div>
      </article>
    </div>
  );
}