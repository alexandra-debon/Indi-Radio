import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { PenSquare, Feather } from "lucide-react";
import { UserBadge } from "@/components/UserBadge";
import { CategoryBadge } from "@/components/social/PostCategory";
import { SmartImg } from "@/components/media/SmartImg";
import { localizedStaticMeta } from "@/lib/og-static-head";
import { breadcrumbLd, HOME_CRUMB, SITE_ORIGIN } from "@/lib/seo-breadcrumb";
import { ogImageForLang } from "@/lib/og-image";
import { useVillageTxt, VILLAGE_NAME } from "@/components/village/village-i18n";
import { VillageArticleEditor, type VillageArticle } from "@/components/village/VillageArticleEditor";

const BASE_URL = "https://www.radio.indi-art-culture.com";
const OG_VILLAGE = ogImageForLang("fr");
const TITLE = "RéDaK'Village — Les articles de la communauté InDi RaDio";
const DESC =
  "RéDaK'Village : espace de découverte et d'écriture de la communauté InDi RaDio. Articles sur la musique indé et la culture indé signés par les auditeurs, artistes et médias.";

export const Route = createFileRoute("/redak-village/")({
  head: async ({ match }) => ({
    meta: await localizedStaticMeta("/redak-village", match.search, [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { property: "og:url", content: `${BASE_URL}/redak-village` },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_VILLAGE },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_VILLAGE },
    ]),
    links: [{ rel: "canonical", href: `${BASE_URL}/redak-village` }],
    scripts: [
      breadcrumbLd([HOME_CRUMB, { name: VILLAGE_NAME, url: `${SITE_ORIGIN}/redak-village` }]),
    ],
  }),
  component: VillagePage,
});

function VillagePage() {
  const txt = useVillageTxt();
  const { session, requireAuth } = useAuth();
  const [writing, setWriting] = useState(false);

  const { data: articles = [] } = useQuery<VillageArticle[]>({
    queryKey: ["village-articles"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("village_articles")
        .select(
          "id, author_id, title, slug, excerpt, content, cover_url, video_url, category, visibility, created_at, updated_at, author:profiles!village_articles_author_id_fkey(id, pseudo, role, is_certified, is_team_indi, badges, level)",
        )
        .eq("published", true)
        .order("created_at", { ascending: false })
        .limit(60);
      if (error) throw error;
      return (data ?? []) as unknown as VillageArticle[];
    },
  });

  return (
    <div className="space-y-4">
      <header className="card-brut space-y-2 p-4">
        <h1 className="flex items-center gap-2 text-2xl font-black">
          <Feather className="size-6 text-primary" /> {VILLAGE_NAME}
        </h1>
        <p className="text-sm font-semibold">{txt.intro}</p>
        <p className="text-xs text-muted-foreground">{txt.subtitle}</p>
        <div className="pt-1">
          <Button
            type="button"
            onClick={() => requireAuth(() => setWriting((w) => !w))}
            className="gap-1.5"
          >
            <PenSquare className="size-4" /> {txt.write}
          </Button>
        </div>
      </header>

      {writing && session && (
        <VillageArticleEditor onDone={() => setWriting(false)} onCancel={() => setWriting(false)} />
      )}

      {articles.length === 0 ? (
        <p className="card-brut p-6 text-center text-sm text-muted-foreground">{txt.empty}</p>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {articles.map((a) => (
            <li key={a.id}>
              <Link
                to="/redak-village/$slug"
                params={{ slug: a.slug }}
                className="card-brut block h-full overflow-hidden transition hover:-translate-y-0.5"
              >
                {a.cover_url && (
                  <SmartImg
                    src={a.cover_url}
                    width={640}
                    height={360}
                    responsive={[320, 640]}
                    alt=""
                    className="h-40 w-full object-cover"
                  />
                )}
                <div className="space-y-1.5 p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <CategoryBadge category={a.category} />
                    {a.author && <UserBadge profile={a.author} compact />}
                  </div>
                  <h2 className="text-base font-bold leading-tight">{a.title}</h2>
                  <p className="line-clamp-3 text-xs text-muted-foreground">
                    {a.excerpt || a.content.slice(0, 200)}
                  </p>
                  <span className="inline-block text-[11px] font-bold text-primary">
                    {txt.readMore} →
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
