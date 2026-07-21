import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useState } from "react";
import { Headphones } from "lucide-react";
import { EpisodeRow } from "@/components/EpisodeRow";
import { ShareButton } from "@/components/share/ShareButton";
import { ContentLikeButton, ContentRatingSection, ContentCommentsSection } from "@/components/content/ContentReactions";
import ogPodcasts from "@/assets/og-podcasts.jpg";
import { useT } from "@/lib/i18n";
import { TranslatedText } from "@/components/i18n/TranslatedText";

const OG_PODCASTS = `https://radio.indi-art-culture.com${ogPodcasts}`;

export const Route = createFileRoute("/podcasts")({
  head: () => ({
    meta: [
      { title: "Podcasts — Indi Radio" },
      { name: "description", content: "Découvre, écoute et note les podcasts de la rédaction Indi Radio : interviews, chroniques et sessions exclusives." },
      { property: "og:title", content: "Podcasts — Indi Radio" },
      { property: "og:description", content: "Découvre, écoute et note les podcasts de la rédaction Indi Radio : interviews, chroniques et sessions exclusives." },
      { property: "og:url", content: "https://radio.indi-art-culture.com/podcasts" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_PODCASTS },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_PODCASTS },
    ],
    links: [{ rel: "canonical", href: "https://radio.indi-art-culture.com/podcasts" }],
  }),
  component: PodcastsPage,
});

function PodcastsPage() {
  const t = useT();
  const [openId, setOpenId] = useState<string | null>(null);
  const { data: podcasts = [] } = useQuery({
    queryKey: ["podcasts"],
    queryFn: async () => {
      const { data } = await supabase.from("podcasts").select("*").order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <h1 className="section-title">{t("page.podcasts.title")}</h1>
      {podcasts.length === 0 && (
        <div className="card-brut p-4 text-center text-sm text-muted-foreground">{t("page.podcasts.empty")}</div>
      )}
      <div className="grid grid-cols-2 gap-3">
        {podcasts.map((p) => (
          <div key={p.id} className="card-brut relative overflow-hidden">
            <div className="absolute right-1.5 top-1.5 z-10">
              <ShareButton
                target={{
                  url: `/podcasts#podcast-${p.id}`,
                  title: `${p.title} — Podcasts Indi Radio`,
                  text: p.description ?? p.title,
                }}
                className="bg-background/80 backdrop-blur"
              />
            </div>
            <button onClick={() => setOpenId(openId === p.id ? null : p.id)} id={`podcast-${p.id}`} className="block w-full scroll-mt-24 text-left">
            <div className="aspect-square bg-muted">
              {p.cover_url ? (
                <img src={p.cover_url} alt={p.title} className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center"><Headphones className="size-8 text-muted-foreground" /></div>
              )}
            </div>
            <div className="p-2">
              <TranslatedText as="div" className="truncate text-sm font-semibold" entityType="podcast" entityKey={p.id} field="title" text={p.title} />
              {p.description && (
                <TranslatedText as="div" className="line-clamp-2 text-xs text-muted-foreground" entityType="podcast" entityKey={p.id} field="description" text={p.description} />
              )}
              {p.duration_seconds ? (
                <div className="mt-0.5 text-[10px] font-medium uppercase tracking-widest text-primary">
                  {Math.round(p.duration_seconds / 60)} min
                </div>
              ) : null}
            </div>
            </button>
          </div>
        ))}
      </div>

      {openId && <PodcastEpisodes podcastId={openId} />}
    </div>
  );
}

function PodcastEpisodes({ podcastId }: { podcastId: string }) {
  const t = useT();
  const { data: episodes = [] } = useQuery({
    queryKey: ["episodes", podcastId],
    queryFn: async () => {
      const { data } = await supabase.from("episodes").select("*").eq("podcast_id", podcastId).order("published_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <section className="space-y-2">
      <div className="card-brut space-y-3 p-3">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-widest text-primary">{t("page.podcasts.rate")}</h2>
          <ContentLikeButton contentType="podcast" contentId={podcastId} />
        </div>
        <ContentRatingSection contentType="podcast" contentId={podcastId} />
        <div className="border-t pt-3">
          <h3 className="mb-2 text-xs font-bold uppercase tracking-widest text-muted-foreground">{t("page.podcasts.commentsTitle")}</h3>
          <ContentCommentsSection contentType="podcast" contentId={podcastId} />
        </div>
      </div>
      <h2 className="text-sm font-bold uppercase tracking-widest text-primary">{t("page.podcasts.episodes")}</h2>
      {episodes.length === 0 && <div className="card-brut p-3 text-sm text-muted-foreground">{t("page.podcasts.noEpisode")}</div>}
      {episodes.map((ep) => <EpisodeRow key={ep.id} ep={ep} />)}
    </section>
  );
}