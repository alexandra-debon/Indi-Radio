import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";
import { Pencil, Trash2, Plus, Eye, EyeOff } from "lucide-react";
import { PlaylistEntryEditor, type PlaylistEntryDraft } from "@/components/playlists/PlaylistEntryEditor";

const LABELS: Record<string, string> = {
  indegraal: "IndéGraal",
  indiscovery: "InDiscovery",
  thematique: "Thématique",
};

export function PlaylistsAdmin() {
  const qc = useQueryClient();
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
      qc.invalidateQueries({ queryKey: ["admin-playlist-entries"] });
      qc.invalidateQueries({ queryKey: ["playlist-entries"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

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
              <span className="text-muted-foreground">
                {r.is_published ? <Eye className="size-4" /> : <EyeOff className="size-4" />}
              </span>
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