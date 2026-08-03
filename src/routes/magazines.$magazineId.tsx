import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { clampDescription } from "@/lib/i18n/seo-meta";
import { supabase } from "@/integrations/supabase/client";
import { ShareButton } from "@/components/share/ShareButton";
import { UrlEmbeds } from "@/components/media/UrlEmbeds";
import { FlipbookViewer } from "@/components/magazines/FlipbookViewer";
import { ArrowLeft, BookOpen } from "lucide-react";
import ogHome from "@/assets/og-home.jpg";
import { flipHtml5ThumbnailUrl } from "@/lib/fliphtml5";
import { breadcrumbLd, HOME_CRUMB, SITE_ORIGIN } from "@/lib/seo-breadcrumb";
import { ogCommonTags, ogImageTags } from "@/lib/og-tags";
import { hlFromSearch, ogLocaleTags, withHl } from "@/lib/og-lang";
import { localizedOgText } from "@/lib/og-lang-head";
import { TranslatedText } from "@/components/i18n/TranslatedText";

const BASE_URL = "https://radio.indi-art-culture.com";
const OG_FALLBACK = `${BASE_URL}${ogHome}`;

export const Route = createFileRoute("/magazines/$magazineId")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("magazine_entries")
      .select("id,title,body,magazine_url,cover_url,created_at")
      .eq("id", params.magazineId)
      .maybeSingle();
    if (error || !data) throw notFound();
    return data;
  },
  head: async ({ params, loaderData, match }) => {
    const lang = hlFromSearch(match.search);
    const url = withHl(`${BASE_URL}/magazines/${params.magazineId}`, lang);
    if (!loaderData) {
      return {
        meta: [
          { title: "Article introuvable — Magazine Indi Art Culture" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const baseTitle = `${loaderData.title} · Magazine Indi Art Culture — InDi RaDio`;
    const baseDesc = clampDescription(
      loaderData.body ||
        `Feuillette « ${loaderData.title} », numéro du magazine interactif Indi Art Culture publié par InDi RaDio.`,
    );
    const localized = await localizedOgText(lang, {
      entityType: "magazine_entry",
      entityKey: loaderData.id,
      title: baseTitle,
      description: baseDesc,
    });
    const title = localized.title;
    const desc = clampDescription(localized.description);
    // Priorité : miniature FlipHTML5 (dérivée automatiquement du lien),
    // puis couverture personnalisée si renseignée, sinon fallback Indi Radio.
    const image =
      flipHtml5ThumbnailUrl(loaderData.magazine_url) ||
      loaderData.cover_url ||
      OG_FALLBACK;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        ...ogLocaleTags(lang),
        ...ogImageTags(image, { baseUrl: BASE_URL, alt: loaderData.title }),
        { name: "twitter:card", content: "summary_large_image" },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json" as const,
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: loaderData.title.slice(0, 110),
            description: desc,
            image: [image],
            url,
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            datePublished: loaderData.created_at,
            inLanguage: "fr-FR",
            isAccessibleForFree: true,
            author: { "@type": "Organization", name: "Indi Art Culture" },
            publisher: { "@id": `${BASE_URL}/#org` },
          }),
        },
        breadcrumbLd([
          HOME_CRUMB,
          { name: "Magazine", url: `${SITE_ORIGIN}/magazines` },
          { name: loaderData.title, url },
        ]),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="card-brut p-6 text-center">
      <p className="text-sm text-muted-foreground">Cet article n'existe pas ou a été supprimé.</p>
      <Link to="/magazines" className="mt-3 inline-block text-sm text-primary underline">Retour au Magazine</Link>
    </div>
  ),
  errorComponent: () => (
    <div className="card-brut p-6 text-center text-sm text-muted-foreground">Erreur de chargement.</div>
  ),
  component: MagazineDetailPage,
});

function MagazineDetailPage() {
  const entry = Route.useLoaderData();
  const { magazineId } = Route.useParams();
  const url = `${BASE_URL}/magazines/${magazineId}`;

  return (
    <div className="space-y-4">
      <Link to="/magazines" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Magazine Indi Art Culture
      </Link>
      <article className="card-brut space-y-3 p-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="flex items-start gap-2 text-2xl font-bold">
            <BookOpen className="mt-1 size-5 shrink-0 text-primary" />
            <TranslatedText
              as="span"
              entityType="magazine_entry"
              entityKey={entry.id}
              field="title"
              text={entry.title}
            />
          </h1>
          <ShareButton
            variant="chip"
            target={{
              url,
              title: `${entry.title} — Magazine Indi Art Culture`,
              text: entry.body?.slice(0, 200) || entry.title,
            }}
          />
        </div>
        {entry.body && (
          <TranslatedText
            as="p"
            className="whitespace-pre-wrap text-sm"
            entityType="magazine_entry"
            entityKey={entry.id}
            field="body"
            text={entry.body}
          />
        )}
        {entry.body && <UrlEmbeds text={entry.body} />}
        <FlipbookViewer url={entry.magazine_url} title={entry.title} coverUrl={entry.cover_url} />
      </article>
    </div>
  );
}