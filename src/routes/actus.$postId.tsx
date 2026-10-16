import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ShareButton } from "@/components/share/ShareButton";
import { UrlEmbeds } from "@/components/media/UrlEmbeds";
import { EmbedFrame } from "@/components/media/EmbedFrame";
import { stripMediaUrls } from "@/lib/media-embed";
import { clampDescription } from "@/lib/i18n/seo-meta";
import { ogImageTags } from "@/lib/og-tags";
import { hlFromSearch, ogLocaleTags, withHl } from "@/lib/og-lang";
import { localizedOgText } from "@/lib/og-lang-head";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { UserBadge } from "@/components/UserBadge";
import ogActus from "@/assets/og-actus.jpg";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { breadcrumbLd, HOME_CRUMB, SITE_ORIGIN } from "@/lib/seo-breadcrumb";
import { renderRich } from "@/lib/rich-text";
import { postVideoThumbnail } from "@/lib/post-share-image";
import { vimeoThumbnail } from "@/lib/teevi-share-image";
import { blogShareImage } from "@/lib/blog-share-image";

const BASE_URL = "https://www.radio.indi-art-culture.com";
const OG_FALLBACK = `${BASE_URL}${ogActus}`;

export const Route = createFileRoute("/actus/$postId")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("news_posts")
      .select("id,title,content,image_url,embed_url,embed_height,created_at,updated_at, author:profiles!news_posts_author_id_fkey(id,pseudo,role,is_certified)")
      .eq("id", params.postId)
      .maybeSingle();
    if (error || !data) throw notFound();
    const { data: frenchSeo } = await supabase
      .from("seo_overrides")
      .select("og_image_url")
      .eq("path", `/actus/${params.postId}`)
      .eq("lang", "fr")
      .maybeSingle();
    return { ...data, sharedImage: frenchSeo?.og_image_url ?? null };
  },
  head: async ({ params, loaderData, match }) => {
    const lang = hlFromSearch(match.search);
    const url = withHl(`${BASE_URL}/actus/${params.postId}`, lang);
    if (!loaderData) {
      return {
        meta: [
          { title: "Article introuvable — Blog InDi ArT CulTuRe" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    // SEO: keep the article title first (≈60 chars max) then the searched brand "Indi Radio".
    const shortTitle = loaderData.title.length > 48 ? `${loaderData.title.slice(0, 46).trimEnd()}…` : loaderData.title;
    const baseTitle = `${shortTitle} | Indi Radio – musique indé`;
    const excerpt = stripMediaUrls(loaderData.content ?? "").replace(/\s+/g, " ").trim();
    const kwTail = "Sur Indi Radio, radio 24/7 gratuite de musique et culture indépendante.";
    const baseDesc = clampDescription(
      excerpt
        ? `${excerpt.slice(0, 150 - kwTail.length).replace(/\s+\S*$/, "")}… ${kwTail}`
        : `${loaderData.title} : l'actu musique indé du Blog InDi ArT CulTuRe. ${kwTail}`,
    );
    const localized = await localizedOgText(lang, {
      entityType: "news_post",
      entityKey: loaderData.id,
      // Translate the article itself before adding English search terms, so
      // truncation cannot drop the brand or leave a French keyword suffix.
      title: lang === "en" ? loaderData.title : baseTitle,
      description: lang === "en" ? (excerpt.slice(0, 500) || loaderData.title) : baseDesc,
    });
    const englishSuffix = " | Indi Radio – Indie Music";
    const englishTitleBudget = 70 - englishSuffix.length;
    const englishArticleTitle = localized.title.length > englishTitleBudget
      ? `${localized.title.slice(0, englishTitleBudget - 1).replace(/\s+\S*$/, "").trimEnd()}…`
      : localized.title;
    const title = lang === "en" ? `${englishArticleTitle}${englishSuffix}` : localized.title;
    const englishTail = "On Indi Radio: free 24/7 independent music and culture radio.";
    const englishExcerpt = clampDescription(localized.description, 155 - englishTail.length - 1);
    const desc = lang === "en"
      ? `${englishExcerpt} ${englishTail}`
      : clampDescription(localized.description);
    const image = blogShareImage(loaderData.sharedImage,
      loaderData.image_url ||
      postVideoThumbnail(`${loaderData.content ?? ""} ${loaderData.embed_url ?? ""}`) ||
      vimeoThumbnail(loaderData.embed_url) ||
      OG_FALLBACK);
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
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "NewsArticle",
            headline: (lang === "en" ? localized.title : loaderData.title).slice(0, 110),
            description: desc,
            image: [image],
            url,
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            datePublished: loaderData.created_at,
            dateModified: (loaderData as { updated_at?: string }).updated_at ?? loaderData.created_at,
            inLanguage: lang === "en" ? "en" : "fr-FR",
            articleSection: "Blog InDi ArT CulTuRe",
            author: {
              "@type": "Person",
              name: loaderData.author?.pseudo ?? "La rédaction",
              ...(loaderData.author?.pseudo
                ? { url: `${BASE_URL}/u/${loaderData.author.pseudo}` }
                : {}),
            },
            publisher: {
              "@type": "Organization",
              name: "InDi RaDio",
              logo: {
                "@type": "ImageObject",
                url: `${BASE_URL}/icons/apple-touch-icon.png`,
              },
            },
          }),
        },
        breadcrumbLd([
          HOME_CRUMB,
          { name: "Blog InDi ArT CulTuRe", url: `${SITE_ORIGIN}/actus` },
          { name: loaderData.title, url },
        ]),
      ],
    };
  },
  notFoundComponent: () => (
    <div className="card-brut p-6 text-center">
      <p className="text-sm text-muted-foreground">Cette actu n'existe pas ou a été supprimée.</p>
      <Link to="/actus" className="mt-3 inline-block text-sm text-primary underline">Retour au Blog InDi ArT CulTuRe</Link>
    </div>
  ),
  errorComponent: () => (
    <div className="card-brut p-6 text-center text-sm text-muted-foreground">Erreur de chargement.</div>
  ),
  component: NewsDetailPage,
});

function NewsDetailPage() {
  const post = Route.useLoaderData();
  const { postId } = Route.useParams();
  const url = `${BASE_URL}/actus/${postId}`;
  const body = stripMediaUrls(post.content ?? "");
  const author = post.author?.pseudo ?? "La rédaction";
  return (
    <div className="space-y-4">
      <Link to="/actus" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Blog InDi ArT CulTuRe
      </Link>
      <article className="card-brut overflow-hidden">
        {post.image_url && <img src={post.image_url} alt="" className="h-64 w-full object-cover sm:h-80" />}
        <div className="space-y-4 p-4 sm:p-6">
          <h1 className="text-2xl font-bold leading-tight sm:text-3xl">
            <TranslatedText entityType="news_post" entityKey={post.id} field="title" text={post.title} />
          </h1>
          <div className="flex items-center justify-between gap-2">
            <UserBadge profile={post.author} className="text-xs" />
            <span className="text-[10px] text-muted-foreground">Publié par {author}</span>
          </div>
          {body && (
            <p className="whitespace-pre-wrap text-base leading-relaxed sm:text-[15px]">
              <TranslatedText entityType="news_post" entityKey={post.id} field="content" text={body}>
                {(txt) => <>{renderRich(txt)}</>}
              </TranslatedText>
            </p>
          )}
          <div className="-mx-4 sm:mx-0">
            <UrlEmbeds text={post.content ?? ""} />
          </div>
          {post.embed_url && (
            <EmbedFrame url={post.embed_url} height={post.embed_height} title={post.title} className="mt-3" />
          )}
          {post.author?.pseudo && (
            <div className="flex justify-end">
              <Link
                to="/u/$pseudo"
                params={{ pseudo: post.author.pseudo }}
                title={`Voir le profil public de @${post.author.pseudo}`}
                className="group inline-flex items-center gap-1.5 text-[11px] font-bold text-primary hover:underline"
              >
                <span className="inline-flex size-5 items-center justify-center rounded-full border-2 border-black bg-primary text-black shadow-[1.5px_1.5px_0_0_#000] transition-transform group-hover:-translate-y-0.5">
                  <ArrowUpRight className="size-3 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" strokeWidth={3} />
                </span>
                Profil public
              </Link>
            </div>
          )}
          <div className="pt-2">
            <ShareButton
              variant="chip"
              target={{ url, title: `${post.title} — Blog InDi ArT CulTuRe`, text: body.slice(0, 200) || post.title }}
            />
          </div>
        </div>
      </article>
    </div>
  );
}