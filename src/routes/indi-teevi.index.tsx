import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, Tv, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { localizedStaticMeta } from "@/lib/og-static-head";
import { ExplicitVideoEmbed } from "@/components/media/UrlEmbeds";
import { TeeviVideoEditor } from "@/components/teevi/TeeviVideoEditor";
import { TeeviLikeButton } from "@/components/teevi/TeeviReactions";
import { useTeeviTxt, type TeeviVideo } from "@/components/teevi/teevi-i18n";

const BASE_URL = "https://www.radio.indi-art-culture.com";
const TITLE = "InDi TeeVi — La chaîne vidéo gratuite d'InDi RaDio";
const DESC =
  "InDi TeeVi : les vidéos indépendantes en accès libre d'InDi RaDio, la radio 24/7 de la musique indépendante. Lives, interviews et documentaires.";

export const Route = createFileRoute("/indi-teevi/")({
  head: async ({ match }) => ({
    meta: await localizedStaticMeta("/indi-teevi", match.search, [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESC },
      { property: "og:url", content: `${BASE_URL}/indi-teevi` },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ]),
    links: [{ rel: "canonical", href: `${BASE_URL}/indi-teevi` }],
  }),
  component: TeeviIndexPage,
});

function TeeviIndexPage() {
  const txt = useTeeviTxt();
  const { isAdmin } = useAuth();
  const [creating, setCreating] = useState(false);

  const { data: videos = [] } = useQuery<TeeviVideo[]>({
    queryKey: ["teevi-videos"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("teevi_videos")
        .select("id, title, video_url, summary, tags, published, author_id, created_at, updated_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TeeviVideo[];
    },
  });

  return (
    <div className="space-y-5">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Tv className="size-5 text-primary" />
          <h1 className="section-title">{txt.title}</h1>
        </div>
        <p className="text-sm text-muted-foreground">{txt.intro}</p>
      </header>

      {isAdmin && !creating && (
        <Button size="sm" onClick={() => setCreating(true)}>
          <Plus className="size-3.5" /> {txt.add}
        </Button>
      )}
      {creating && <TeeviVideoEditor onDone={() => setCreating(false)} onCancel={() => setCreating(false)} />}

      {videos.length === 0 && !creating && (
        <p className="card-brut p-4 text-center text-sm text-muted-foreground">{txt.empty}</p>
      )}

      <ul className="space-y-4">
        {videos.map((v) => (
          <li key={v.id}>
            <TeeviCard video={v} />
          </li>
        ))}
      </ul>
    </div>
  );
}

function TeeviCard({ video }: { video: TeeviVideo }) {
  const txt = useTeeviTxt();
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("teevi_videos").delete().eq("id", video.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success(txt.deleted);
      qc.invalidateQueries({ queryKey: ["teevi-videos"] });
      qc.invalidateQueries({ queryKey: ["wall-compact-teasers"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  if (editing) {
    return <TeeviVideoEditor video={video} onDone={() => setEditing(false)} onCancel={() => setEditing(false)} />;
  }

  return (
    <article className="card-brut space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-2">
        <Link
          to="/indi-teevi/$videoId"
          params={{ videoId: video.id }}
          className="min-w-0 text-lg font-bold leading-tight hover:underline"
        >
          {video.title}
        </Link>
        {!video.published && (
          <span className="border-2 border-destructive px-1.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-destructive">
            {txt.draft}
          </span>
        )}
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

      <div className="flex items-center gap-2">
        <TeeviLikeButton videoId={video.id} />
        {isAdmin && (
          <>
            <button
              type="button"
              onClick={() => setEditing(true)}
              aria-label={txt.edit}
              className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <Pencil className="size-3.5" />
            </button>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(txt.confirmDelete)) del.mutate();
              }}
              aria-label={txt.remove}
              className="rounded p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
            >
              <Trash2 className="size-3.5" />
            </button>
          </>
        )}
      </div>
    </article>
  );
}
