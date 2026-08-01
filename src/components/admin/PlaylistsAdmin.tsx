import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { Pencil, Trash2, Plus, Eye, EyeOff, ArrowUp, ArrowDown } from "lucide-react";
import { PlaylistEntryEditor, type PlaylistEntryDraft } from "@/components/playlists/PlaylistEntryEditor";

const LABELS: Record<string, string> = {
  indegraal: "IndéGraal",
  indiscovery: "InDiscovery",
  thematique: "Thématique",
};

export function PlaylistsAdmin() {
  const qc = useQueryClient();
  const router = useRouter();
  const [editing, setEditing] = useState<PlaylistEntryDraft | null | undefined>(undefined);

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["admin-playlist-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playlist_entries")
        .select("*")
        .order("category", { ascending: true })
        .order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as PlaylistEntryDraft[];
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("playlist_entries").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Playlist supprimée");
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin-playlist-entries"] });
    qc.invalidateQueries({ queryKey: ["playlist-entries"] });
    router.invalidate();
  };

  const togglePublish = useMutation({
    mutationFn: async (r: PlaylistEntryDraft) => {
      const { error } = await supabase
        .from("playlist_entries")
        .update({ is_published: !r.is_published })
        .eq("id", r.id!);
      if (error) throw error;
      return !r.is_published;
    },
    onSuccess: (nowPublished) => {
      toast.success(nowPublished ? "Playlist publiée" : "Playlist repassée en brouillon");
      invalidate();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const swap = useMutation({
    mutationFn: async ({ a, b }: { a: PlaylistEntryDraft; b: PlaylistEntryDraft }) => {
      const res = await Promise.all([
        supabase.from("playlist_entries").update({ position: b.position }).eq("id", a.id!),
        supabase.from("playlist_entries").update({ position: a.position }).eq("id", b.id!),
      ]);
      const err = res.find((r) => r.error)?.error;
      if (err) throw err;
    },
    onSuccess: invalidate,
    onError: (e) => toast.error((e as Error).message),
  });

  const move = (r: PlaylistEntryDraft, dir: -1 | 1) => {
    const siblings = rows.filter((x) => x.category === r.category && (x.year ?? null) === (r.year ?? null));
    const i = siblings.findIndex((x) => x.id === r.id);
    const target = siblings[i + dir];
    if (!target) return;
    // Ensure distinct positions even if both are equal
    const a = { ...r, position: r.position === target.position ? r.position + dir : r.position };
    swap.mutate({ a, b: target });
  };

  return (
    <div className="space-y-3">
      {editing !== undefined ? (
        <PlaylistEntryEditor initial={editing} onDone={() => setEditing(undefined)} />
      ) : (
        <Button size="sm" onClick={() => setEditing(null)}>
          <Plus className="size-3.5" /> Nouvelle playlist
        </Button>
      )}

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      <div className="space-y-2">
        {rows.map((r) => (
          <div key={r.id} className="card-brut flex items-center justify-between gap-3 p-3">
            <div className="min-w-0">
              <div className="truncate text-sm font-bold">{r.title}</div>
              <div className="text-[10px] uppercase tracking-widest text-muted-foreground">
                {LABELS[r.category] ?? r.category}
                {r.year ? ` ${r.year}` : ""} · position {r.position}
                {r.is_published ? "" : " · brouillon"}
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <Button
                size="icon"
                variant="ghost"
                aria-label="Monter"
                disabled={swap.isPending}
                onClick={() => move(r, -1)}
              >
                <ArrowUp className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Descendre"
                disabled={swap.isPending}
                onClick={() => move(r, 1)}
              >
                <ArrowDown className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label={r.is_published ? "Repasser en brouillon" : "Publier"}
                title={r.is_published ? "Publiée — cliquer pour repasser en brouillon" : "Brouillon — cliquer pour publier"}
                disabled={togglePublish.isPending}
                onClick={() => togglePublish.mutate(r)}
              >
                {r.is_published ? <Eye className="size-4" /> : <EyeOff className="size-4 text-muted-foreground" />}
              </Button>
              <Button size="icon" variant="ghost" aria-label="Modifier" onClick={() => setEditing(r)}>
                <Pencil className="size-4" />
              </Button>
              <Button
                size="icon"
                variant="ghost"
                aria-label="Supprimer"
                onClick={() => r.id && remove.mutate(r.id)}
              >
                <Trash2 className="size-4 text-destructive" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}