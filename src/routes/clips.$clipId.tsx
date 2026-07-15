import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ShareButton } from "@/components/share/ShareButton";
import { ExplicitVideoEmbed, UrlEmbeds } from "@/components/media/UrlEmbeds";
import { parseMediaUrl } from "@/lib/media-embed";
import { ArrowLeft } from "lucide-react";
import ogClips from "@/assets/og-clips.jpg";

const BASE_URL = "https://radio.indi-art-culture.com";
const OG_FALLBACK = `${BASE_URL}${ogClips}`;

function pickThumb(row: {
  video_url: string | null;
  playlist_url: string | null;
  video_urls: string[] | null;
}): string | null {
  const candidates = [row.video_url, row.playlist_url, ...(row.video_urls ?? [])].filter(Boolean) as string[];
  for (const u of candidates) {
    const m = parseMediaUrl(u);
    if (m?.kind === "youtube" && m.type === "video") {
      return `https://i.ytimg.com/vi/${m.id}/hqdefault.jpg`;
    }
  }
  return null;
}

export const Route = createFileRoute("/clips/$clipId")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("clip_entries")
      .select("id,section,title,body,video_url,playlist_url,video_urls,created_at")
      .eq("id", params.clipId)
      .maybeSingle();
    if (error || !data) throw notFound();
    return data;
  },
  head: ({ params, loaderData }) => {
    const url = `${BASE_URL}/clips/${params.clipId}`;
    if (!loaderData) {
      return { meta: [{ title: "Clip introuvable — Clip Addict" }, { name: "robots", content: "noindex" }] };
    }
    const title = `${loaderData.title} — Clip Addict · Indi Radio`;
    const desc = (loaderData.body ?? loaderData.title).slice(0, 200);
    const image = pickThumb(loaderData) || OG_FALLBACK;
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
          <h1 className="text-2xl font-bold">{entry.title}</h1>
          <ShareButton
            variant="chip"
            target={{ url, title: `${entry.title} — Clip Addict · Indi Radio`, text: entry.body?.slice(0, 200) || entry.title }}
          />
        </div>
        {entry.body && <p className="whitespace-pre-wrap text-sm">{entry.body}</p>}
        {entry.body && <UrlEmbeds text={entry.body} />}
        <div className="space-y-3">
          {videos.map((v) => <ExplicitVideoEmbed key={v} url={v} />)}
        </div>
      </article>
    </div>
  );
}