import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Film, Pencil, Trash2, Plus, ListMusic } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { ClipEntryEditor, type ClipEntryDraft } from "@/components/clips/ClipEntryEditor";
import { ExplicitVideoEmbed, UrlEmbeds } from "@/components/media/UrlEmbeds";
import { ShareButton } from "@/components/share/ShareButton";
import ogClips from "@/assets/og-clips.jpg";

const BASE_URL = "https://radio.indi-art-culture.com";
const OG_CLIPS = `${BASE_URL}${ogClips}`;

export const Route = createFileRoute("/clips")({
  head: () => ({
    meta: [
      { title: "Clip Addict — Clips & playlists vidéo Indi Radio" },
      { name: "description", content: "Clip Addict : les clips actu et playlists vidéo sélectionnés par la rédaction d'Indi Radio. YouTube et Vimeo directement dans l'app." },
      { property: "og:title", content: "Clip Addict — Indi Radio" },
      { property: "og:description", content: "Clips actu et playlists vidéo sélectionnés par la rédaction d'Indi Radio." },
      { property: "og:url", content: `${BASE_URL}/clips` },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_CLIPS },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_CLIPS },
    ],
    links: [{ rel: "canonical", href: `${BASE_URL}/clips` }],
  }),
  component: ClipsPage,
});

type Section = "clips_actu" | "playlists_clips";

interface ClipRow {
  id: string;
  section: Section;
  title: string;
  body: string | null;
  video_url: string | null;
  playlist_url: string | null;
  video_urls: string[] | null;
  author_id: string | null;
  pinned_at: string | null;
  created_at: string;
  updated_at: string;
}

function ClipsPage() {
  const { data: entries = [] } = useQuery<ClipRow[]>({
    queryKey: ["clip-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("clip_entries")
        .select("*")
        .order("pinned_at", { ascending: false, nullsFirst: false })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as ClipRow[];
    },
  });

  const actu = entries.filter((e) => e.section === "clips_actu");
  const playlists = entries.filter((e) => e.section === "playlists_clips");

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <div className="flex items-center gap-2">
          <Film className="size-5 text-primary" />
          <h1 className="section-title">Clip Addict</h1>
        </div>
        <p className="text-sm text-muted-foreground">
          Clips actu et playlists vidéo — sélectionnés par la rédaction. On regarde tout ici, sans quitter l'appli.
        </p>
      </header>

      <ClipsSection
        section="clips_actu"
        title="Clips Actu"
        subtitle="La sélection vidéo du moment"
        icon={<Film className="size-4" />}
        entries={actu}
      />

      <ClipsSection
        section="playlists_clips"
        title="Playlists Clips"
        subtitle="Playlists thématiques"
        icon={<ListMusic className="size-4" />}
        entries={playlists}
      />
    </div>
  );
}

function ClipsSection({
  section,
  title,
  subtitle,
  icon,
  entries,
}: {
  section: Section;
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  entries: ClipRow[];
}) {
  const { isAdmin } = useAuth();
  const [creating, setCreating] = useState(false);

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <div>
          <h2 className="section-title text-lg flex items-center gap-2">{icon} {title}</h2>
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
        {isAdmin && !creating && (
          <Button size="sm" onClick={() => setCreating(true)}>
            <Plus className="size-3.5" /> Nouvelle entrée
          </Button>
        )}
      </div>

      {creating && (
        <ClipEntryEditor section={section} onDone={() => setCreating(false)} />
      )}

      {entries.length === 0 && !creating && (
        <div className="card-brut p-4 text-center text-sm text-muted-foreground">
          Rien pour l'instant.
        </div>
      )}

      <ul className="space-y-4">
        {entries.map((e) => (
          <ClipCard key={e.id} entry={e} />
        ))}
      </ul>
    </section>
  );
}

function ClipCard({ entry }: { entry: ClipRow }) {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);

  const del = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("clip_entries").delete().eq("id", entry.id);
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Entrée supprimée"); qc.invalidateQueries({ queryKey: ["clip-entries"] }); },
    onError: (e) => toast.error((e as Error).message),
  });

  if (editing) {
    const draft: ClipEntryDraft = {
      id: entry.id,
      section: entry.section,
      title: entry.title,
      body: entry.body,
      video_url: entry.video_url,
      playlist_url: entry.playlist_url,
      video_urls: entry.video_urls,
    };
    return <ClipEntryEditor section={entry.section} initial={draft} onDone={() => setEditing(false)} />;
  }

  const videos: string[] = [];
  if (entry.video_url) videos.push(entry.video_url);
  if (entry.playlist_url) videos.push(entry.playlist_url);
  if (entry.video_urls) videos.push(...entry.video_urls);

  return (
    <li id={`clip-${entry.id}`} className="card-brut scroll-mt-24 space-y-3 p-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-lg font-bold leading-tight">{entry.title}</h3>
        <div className="flex shrink-0 items-center gap-1">
          <span className="text-[10px] text-muted-foreground">
            {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true, locale: fr })}
          </span>
          <ShareButton
            target={{
              url: `/clips/${entry.id}`,
              title: `${entry.title} — Clip Addict · Indi Radio`,
              text: entry.body?.slice(0, 200) || entry.title,
            }}
          />
        </div>
      </div>

      {entry.body && (
        <p className="whitespace-pre-wrap text-sm text-foreground">{entry.body}</p>
      )}

      {entry.body && <UrlEmbeds text={entry.body} />}

      <div className="space-y-3">
        {videos.map((url) => (
          <ExplicitVideoEmbed key={url} url={url} />
        ))}
      </div>

      {isAdmin && (
        <div className="flex justify-end gap-1 pt-1">
          <button
            onClick={() => setEditing(true)}
            className="rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Modifier"
          >
            <Pencil className="size-3.5" />
          </button>
          <button
            onClick={() => { if (confirm("Supprimer cette entrée ?")) del.mutate(); }}
            className="rounded p-1 text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
            aria-label="Supprimer"
          >
            <Trash2 className="size-3.5" />
          </button>
        </div>
      )}
    </li>
  );
}