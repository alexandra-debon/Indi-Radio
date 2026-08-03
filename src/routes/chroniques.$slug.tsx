import { createFileRoute, Link, notFound, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Disc3, Star, ArrowLeft, ExternalLink } from "lucide-react";
import { UrlEmbeds } from "@/components/media/UrlEmbeds";
import { stripMediaUrls } from "@/lib/media-embed";
import { renderRich } from "@/lib/rich-text";
import { ShareButton } from "@/components/share/ShareButton";
import { SocialLinksBar, type SocialLinks } from "@/components/social/SocialLinksBar";
import { ContentLikeButton, ContentCommentsSection, ContentRatingSection } from "@/components/content/ContentReactions";
import ogChroniques from "@/assets/og-chroniques.jpg";
import { breadcrumbLd, HOME_CRUMB, SITE_ORIGIN } from "@/lib/seo-breadcrumb";
import { clampDescription } from "@/lib/i18n/seo-meta";
import { ogCommonTags, ogImageTags } from "@/lib/og-tags";
import { hlFromSearch, ogLocaleTags, withHl } from "@/lib/og-lang";
import { localizedOgText } from "@/lib/og-lang-head";
import { TranslatedText } from "@/components/i18n/TranslatedText";

const BASE_URL = "https://radio.indi-art-culture.com";
const OG_FALLBACK = `${BASE_URL}${ogChroniques}`;

export const Route = createFileRoute("/chroniques/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("album_reviews")
      .select("*")
      .eq("slug", params.slug)
      .eq("published", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return data;
  },
  head: async ({ loaderData, params, match }) => {
    const lang = hlFromSearch(match.search);
    if (!loaderData) {
      return {
        meta: [
          { title: "Chronique introuvable — InDi RaDio" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const baseTitle = `${loaderData.artist} — ${loaderData.title} · Chronique album — InDi RaDio`;
    const baseDesc = clampDescription(
      loaderData.excerpt ||
        `Chronique de l'album « ${loaderData.title} » de ${loaderData.artist} sur InDi RaDio, la radio 24/7 de la musique indépendante.`,
    );
    const localized = await localizedOgText(lang, {
      entityType: "album_review",
      entityKey: loaderData.id,
      title: baseTitle,
      description: baseDesc,
    });
    const title = localized.title;
    const description = clampDescription(localized.description);
    const url = withHl(`${BASE_URL}/chroniques/${params.slug}`, lang);
    const meta = [
      { title },
      { name: "description", content: description },
      { property: "og:title", content: title },
      { property: "og:description", content: description },
      { property: "og:type", content: "article" },
      { property: "og:url", content: url },
      ...ogLocaleTags(lang),
      { name: "twitter:card", content: "summary_large_image" },
      ...ogImageTags(loaderData.cover_url || OG_FALLBACK, {
        baseUrl: BASE_URL,
        alt: `${loaderData.title} — ${loaderData.artist}`,
      }),
    ];
    return {
      meta,
      links: [{ rel: "canonical", href: url }],
      scripts: [{
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          headline: `${loaderData.title} — ${loaderData.artist}`.slice(0, 110),
          description,
          image: [loaderData.cover_url || OG_FALLBACK],
          url,
          mainEntityOfPage: { "@type": "WebPage", "@id": url },
          datePublished:
            (loaderData as { created_at?: string }).created_at ??
            loaderData.release_date ??
            undefined,
          dateModified:
            (loaderData as { updated_at?: string }).updated_at ??
            (loaderData as { created_at?: string }).created_at ??
            undefined,
          inLanguage: "fr-FR",
          articleSection: "Chroniques",
          author: { "@type": "Organization", name: "La rédaction Indi Radio" },
          publisher: {
            "@type": "Organization",
            name: "InDi RaDio",
            logo: {
              "@type": "ImageObject",
              url: `${BASE_URL}/icons/apple-touch-icon.png`,
            },
          },
        }),
      }, {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Review",
          itemReviewed: {
            "@type": "MusicAlbum",
            name: loaderData.title,
            byArtist: { "@type": "MusicGroup", name: loaderData.artist },
            ...(loaderData.label ? { recordLabel: loaderData.label } : {}),
            ...(loaderData.release_date ? { datePublished: loaderData.release_date } : {}),
          },
          ...(loaderData.rating != null ? {
            reviewRating: { "@type": "Rating", ratingValue: Number(loaderData.rating), bestRating: 5 },
          } : {}),
          ...(loaderData.excerpt ? { reviewBody: loaderData.excerpt } : {}),
          publisher: { "@type": "Organization", name: "Indi Radio" },
        }),
      },
      breadcrumbLd([
        HOME_CRUMB,
        { name: "Chroniques", url: `${SITE_ORIGIN}/chroniques` },
        { name: `${loaderData.title} — ${loaderData.artist}`, url },
      ])],
    };
  },
  errorComponent: ({ error, reset }) => {
    const router = useRouter();
    return (
      <div className="card-brut space-y-3 p-4">
        <p className="text-sm text-destructive">Erreur : {(error as Error).message}</p>
        <button onClick={() => { reset(); router.invalidate(); }} className="text-xs underline">Réessayer</button>
      </div>
    );
  },
  notFoundComponent: () => (
    <div className="card-brut space-y-3 p-6 text-center">
      <h1 className="text-lg font-bold">Chronique introuvable</h1>
      <p className="text-sm text-muted-foreground">Cette chronique n'existe pas ou a été retirée.</p>
      <Link to="/chroniques" className="text-xs underline">← Retour aux chroniques</Link>
    </div>
  ),
  component: ChroniqueDetailPage,
});

function ChroniqueDetailPage() {
  const r = Route.useLoaderData();
  const streamingLinks: Array<{ label: string; url: string | null }> = [
    { label: "Spotify", url: r.spotify_url },
    { label: "Bandcamp", url: r.bandcamp_url },
    { label: "YouTube", url: r.youtube_url },
    { label: "SoundCloud", url: r.soundcloud_url },
    { label: "Apple Music", url: r.apple_music_url },
  ].filter((l): l is { label: string; url: string } => !!l.url);

  return (
    <article className="space-y-4">
      <Link to="/chroniques" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3" /> Toutes les chroniques
      </Link>

      <header className="card-brut flex flex-col gap-4 p-4 sm:flex-row">
        <div className="mx-auto size-40 shrink-0 overflow-hidden rounded bg-muted sm:mx-0">
          {r.cover_url ? (
            <img src={r.cover_url} alt={`Pochette de ${r.title} par ${r.artist}`} className="size-full object-cover" />
          ) : (
            <div className="grid size-full place-items-center"><Disc3 className="size-12 text-muted-foreground" /></div>
          )}
        </div>
        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="text-[10px] uppercase tracking-widest text-primary">Chronique d'album</div>
            <ShareButton
              target={{
                title: `${r.title} — ${r.artist} · Chronique Indi Radio`,
                text: r.excerpt ?? `Chronique de ${r.title} par ${r.artist}`,
              }}
              variant="chip"
            />
          </div>
          <TranslatedText
            as="h1"
            className="section-title text-xl leading-tight"
            entityType="album_review"
            entityKey={r.id}
            field="title"
            text={r.title}
          />
          <div className="text-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{r.artist}</span>
            {r.label ? <> · {r.label}</> : null}
            {r.release_date ? <> · Sortie {new Date(r.release_date).toLocaleDateString("fr-FR")}</> : null}
          </div>
          {r.rating != null && (
            <div className="inline-flex items-center gap-1 rounded bg-primary/10 px-2 py-1 text-sm font-bold text-primary">
              <Star className="size-4 fill-primary" />
              {Number(r.rating).toFixed(1)}/5
            </div>
          )}
          {r.excerpt && <p className="text-sm text-foreground">{renderRich(r.excerpt)}</p>}
        </div>
      </header>

      <section className="card-brut space-y-3 p-4">
        <h2 className="text-sm font-bold uppercase tracking-widest text-primary">La chronique</h2>
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">
          <TranslatedText
            entityType="album_review"
            entityKey={r.id}
            field="content"
            text={stripMediaUrls(r.content)}
          >
            {(rendered) => renderRich(rendered)}
          </TranslatedText>
        </div>
        <UrlEmbeds text={r.content} />
      </section>

      {streamingLinks.length > 0 && (
        <section className="card-brut space-y-2 p-4">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Écouter</h2>
          <ul className="flex flex-wrap gap-2">
            {streamingLinks.map((l) => (
              <li key={l.label}>
                <a
                  href={l.url ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-border px-3 py-1.5 text-xs font-semibold hover:bg-muted"
                >
                  {l.label} <ExternalLink className="size-3" />
                </a>
              </li>
            ))}
          </ul>
        </section>
      )}

      <SocialLinksBar links={(r as { social_links?: SocialLinks | null }).social_links ?? null} className="pt-1" />

      <section className="card-brut space-y-3 p-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary">Réactions</h2>
          <ContentLikeButton contentType="album_review" contentId={r.id} />
        </div>
        <ContentRatingSection contentType="album_review" contentId={r.id} />
        <ContentCommentsSection contentType="album_review" contentId={r.id} />
      </section>
    </article>
  );
}