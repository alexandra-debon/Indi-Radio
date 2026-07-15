import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ShareButton } from "@/components/share/ShareButton";
import { EpisodeRow } from "@/components/EpisodeRow";
import { ArrowLeft } from "lucide-react";
import ogPodcasts from "@/assets/og-podcasts.jpg";

const BASE_URL = "https://radio.indi-art-culture.com";
const OG_FALLBACK = `${BASE_URL}${ogPodcasts}`;

export const Route = createFileRoute("/episodes/$episodeId")({
  loader: async ({ params }) => {
    const { data: ep, error } = await supabase
      .from("episodes")
      .select("id,title,description,audio_url,external_url,duration_seconds,published_at,cover_url,podcast_id,show_id")
      .eq("id", params.episodeId)
      .maybeSingle();
    if (error || !ep) throw notFound();
    let parentCover: string | null = null;
    let parentTitle: string | null = null;
    if (!ep.cover_url) {
      if (ep.podcast_id) {
        const { data } = await supabase.from("podcasts").select("title,cover_url").eq("id", ep.podcast_id).maybeSingle();
        parentCover = data?.cover_url ?? null;
        parentTitle = data?.title ?? null;
      } else if (ep.show_id) {
        const { data } = await supabase.from("shows").select("title,cover_url").eq("id", ep.show_id).maybeSingle();
        parentCover = data?.cover_url ?? null;
        parentTitle = data?.title ?? null;
      }
    }
    return { ep, parentCover, parentTitle };
  },
  head: ({ params, loaderData }) => {
    const url = `${BASE_URL}/episodes/${params.episodeId}`;
    if (!loaderData) {
      return { meta: [{ title: "Épisode introuvable — Indi Radio" }, { name: "robots", content: "noindex" }] };
    }
    const { ep, parentCover, parentTitle } = loaderData;
    const title = `${ep.title}${parentTitle ? ` — ${parentTitle}` : ""} · Indi Radio`;
    const desc = (ep.description ?? ep.title).slice(0, 200);
    const image = ep.cover_url || parentCover || OG_FALLBACK;
    return {
      meta: [
        { title },
        { name: "description", content: desc },
        { property: "og:title", content: title },
        { property: "og:description", content: desc },
        { property: "og:url", content: url },
        { property: "og:type", content: "article" },
        { property: "og:image", content: image },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:image", content: image },
      ],
      links: [{ rel: "canonical", href: url }],
    };
  },
  notFoundComponent: () => (
    <div className="card-brut p-6 text-center">
      <p className="text-sm text-muted-foreground">Cet épisode n'existe pas ou a été supprimé.</p>
      <Link to="/podcasts" className="mt-3 inline-block text-sm text-primary underline">Voir les podcasts</Link>
    </div>
  ),
  errorComponent: () => (
    <div className="card-brut p-6 text-center text-sm text-muted-foreground">Erreur de chargement.</div>
  ),
  component: EpisodeDetailPage,
});

function EpisodeDetailPage() {
  const { ep, parentCover, parentTitle } = Route.useLoaderData();
  const { episodeId } = Route.useParams();
  const url = `${BASE_URL}/episodes/${episodeId}`;
  const cover = ep.cover_url || parentCover;
  const backTo = ep.podcast_id ? "/podcasts" : "/emissions";
  return (
    <div className="space-y-4">
      <Link to={backTo} className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> {ep.podcast_id ? "Podcasts" : "Émissions"}
      </Link>
      {cover && (
        <div className="card-brut overflow-hidden">
          <img src={cover} alt="" className="h-64 w-full object-cover" />
        </div>
      )}
      {parentTitle && (
        <div className="text-[10px] uppercase tracking-widest text-primary">{parentTitle}</div>
      )}
      <EpisodeRow ep={ep} />
      <div>
        <ShareButton
          variant="chip"
          target={{ url, title: `${ep.title}${parentTitle ? ` — ${parentTitle}` : ""} · Indi Radio`, text: ep.description ?? ep.title }}
        />
      </div>
    </div>
  );
}