import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { ArrowLeft, Pencil, Trash2 } from "lucide-react";
import { UserBadge } from "@/components/UserBadge";
import { VillageCategoryBadge, FreeTagBadge } from "@/components/village/VillageCategory";
import { ShareButton } from "@/components/share/ShareButton";
import { VillageSubscribeButton } from "@/components/village/VillageSubscribeButton";
import { UrlEmbeds } from "@/components/media/UrlEmbeds";
import { renderRich } from "@/lib/rich-text";
import { clampDescription } from "@/lib/i18n/seo-meta";
import { ogImageTags } from "@/lib/og-tags";
import { hlFromSearch, ogLocaleTags, withHl } from "@/lib/og-lang";
import { localizedOgText } from "@/lib/og-lang-head";
import { ogImageForLang } from "@/lib/og-image";
import { breadcrumbLd, HOME_CRUMB, SITE_ORIGIN } from "@/lib/seo-breadcrumb";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { ContentLikeButton, ContentCommentsSection } from "@/components/content/ContentReactions";
import { useVillageTxt, VILLAGE_NAME } from "@/components/village/village-i18n";
import {
  VillageArticleEditor,
  type VillageArticle,
} from "@/components/village/VillageArticleEditor";

const BASE_URL = "https://www.radio.indi-art-culture.com";
const OG_FALLBACK = ogImageForLang("fr");

export const Route = createFileRoute("/redak-village/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("village_articles")
      .select(
        "id, author_id, title, slug, excerpt, content, cover_url, video_url, category, free_tag, visibility, created_at, updated_at, author:profiles!village_articles_author_id_fkey(id, pseudo, role, is_certified, is_team_indi, badges, level)",
      )
      .eq("slug", params.slug)
      .maybeSingle();
    if (error || !data) throw notFound();
    return data as unknown as VillageArticle;
  },
  head: async ({ params, loaderData, match }) => {
    const lang = hlFromSearch(match.search);
    const url = withHl(`${BASE_URL}/redak-village/${params.slug}`, lang);
    if (!loaderData) {
      return {
        meta: [
          { title: `Article introuvable — ${VILLAGE_NAME}` },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const baseTitle = `${loaderData.title} · ${VILLAGE_NAME} — InDi RaDio`;
    const baseDesc = clampDescription(
      loaderData.excerpt || loaderData.content.replace(/\s+/g, " ").slice(0, 300),
    );
    const localized = await localizedOgText(lang, {
      entityType: "village_article",
      entityKey: loaderData.id,
      title: baseTitle,
      description: baseDesc,
    });
    const title = localized.title;
    const desc = clampDescription(localized.description);
    const image = loaderData.cover_url || OG_FALLBACK;
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
            "@type": "Article",
            headline: loaderData.title.slice(0, 110),
            description: desc,
            image: [image],
            url,
            mainEntityOfPage: { "@type": "WebPage", "@id": url },
            datePublished: loaderData.created_at,
            dateModified: loaderData.updated_at,
            articleSection: VILLAGE_NAME,
            author: {
              "@type": "Person",
              name: loaderData.author?.pseudo ?? "Communauté InDi",
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
          { name: VILLAGE_NAME, url: `${SITE_ORIGIN}/redak-village` },
          { name: loaderData.title, url },
        ]),
      ],
    };
  },
  notFoundComponent: () => <VillageMissing />,
  errorComponent: () => <VillageMissing />,
  component: VillageArticlePage,
});

function VillageMissing() {
  return (
    <div className="card-brut p-6 text-center">
      <Link to="/redak-village" className="text-sm text-primary underline">
        {VILLAGE_NAME}
      </Link>
    </div>
  );
}

function VillageArticlePage() {
  const article = Route.useLoaderData();
  const txt = useVillageTxt();
  const { session, isAdmin } = useAuth();
  const qc = useQueryClient();
  const navigate = Route.useNavigate();
  const [editing, setEditing] = useState(false);
  const canEdit = !!session && (session.user.id === article.author_id || isAdmin);
  const url = `${BASE_URL}/redak-village/${article.slug}`;

  const remove = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("village_articles").delete().eq("id", article.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(txt.deleted);
      qc.invalidateQueries({ queryKey: ["village-articles"] });
      qc.invalidateQueries({ queryKey: ["wall-compact"] });
      navigate({ to: "/redak-village" });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (editing) {
    return (
      <div className="space-y-4">
        <VillageArticleEditor
          article={article}
          onCancel={() => setEditing(false)}
          onDone={(slug) => {
            setEditing(false);
            navigate({ to: "/redak-village/$slug", params: { slug } });
          }}
        />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link
        to="/redak-village"
        className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" /> {VILLAGE_NAME}
      </Link>

      <article className="card-brut overflow-hidden">
        {article.cover_url && (
          <img src={article.cover_url} alt="" className="h-56 w-full object-cover" />
        )}
        <div className="space-y-3 p-4">
          <div className="flex flex-wrap items-center gap-2">
            <VillageCategoryBadge category={article.category} />
            <FreeTagBadge tag={article.free_tag} />
            {article.author && <UserBadge profile={article.author} className="text-xs" />}
          </div>
          <h1 className="text-2xl font-bold">
            <TranslatedText
              entityType="village_article"
              entityKey={article.id}
              field="title"
              text={article.title}
            />
          </h1>
          {article.excerpt && (
            <p className="text-sm font-semibold text-muted-foreground">
              <TranslatedText
                entityType="village_article"
                entityKey={article.id}
                field="excerpt"
                text={article.excerpt}
              />
            </p>
          )}
          <div className="whitespace-pre-wrap text-sm">
            <TranslatedText
              entityType="village_article"
              entityKey={article.id}
              field="content"
              text={article.content}
            >
              {(tr) => <>{renderRich(tr)}</>}
            </TranslatedText>
          </div>
          {article.video_url && <UrlEmbeds text={article.video_url} />}

          <div className="flex flex-wrap items-center gap-2 pt-2">
            <ContentLikeButton contentType="village_article" contentId={article.id} />
            <VillageSubscribeButton />
            <ShareButton
              variant="chip"
              target={{
                url,
                title: `${article.title} — ${VILLAGE_NAME}`,
                text: (article.excerpt || article.content).slice(0, 200),
              }}
            />
            {canEdit && (
              <>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setEditing(true)}
                  className="gap-1"
                >
                  <Pencil className="size-3.5" /> {txt.edit}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="gap-1 text-destructive"
                  onClick={() => {
                    if (window.confirm(txt.removeConfirm)) remove.mutate();
                  }}
                >
                  <Trash2 className="size-3.5" /> {txt.remove}
                </Button>
              </>
            )}
          </div>
          {canEdit && <p className="text-[11px] text-muted-foreground">{txt.warnBody}</p>}
        </div>
      </article>

      <ContentCommentsSection contentType="village_article" contentId={article.id} />
    </div>
  );
}
