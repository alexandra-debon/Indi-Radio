import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { RichTextArea } from "@/components/text/RichTextArea";
import { PlaylistEmbedPair } from "@/components/playlists/PlaylistEmbedPair";
import { extractEmbedUrl } from "@/lib/playlist-embed";
import { X, Check } from "lucide-react";

export type PlaylistCategory = "indegraal" | "indiscovery" | "thematique";

export interface PlaylistEntryDraft {
  id?: string;
  title: string;
  description: string | null;
  category: string;
  year: number | null;
  spotify_embed: string | null;
  apple_embed: string | null;
  position: number;
  is_published: boolean;
}

const CATEGORIES: { value: PlaylistCategory; label: string }[] = [
  { value: "indegraal", label: "IndéGraal" },
  { value: "indiscovery", label: "InDiscovery (annuelle)" },
  { value: "thematique", label: "Thématique" },
];

export function PlaylistEntryEditor({
  initial,
  onDone,
}: {
  initial?: PlaylistEntryDraft | null;
  onDone: () => void;
}) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [category, setCategory] = useState<string>(initial?.category ?? "thematique");
  const [year, setYear] = useState(initial?.year ? String(initial.year) : String(new Date().getFullYear()));
  const [spotify, setSpotify] = useState(initial?.spotify_embed ?? "");
  const [apple, setApple] = useState(initial?.apple_embed ?? "");
  const [position, setPosition] = useState(String(initial?.position ?? 0));
  const [published, setPublished] = useState(initial?.is_published ?? true);

  const spotifyOk = !spotify.trim() || !!extractEmbedUrl(spotify, "spotify");
  const appleOk = !apple.trim() || !!extractEmbedUrl(apple, "apple");

  const save = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Non connecté");
      const trimmedTitle = title.trim();
      if (!trimmedTitle) throw new Error("Le titre est requis");
      if (!spotifyOk) throw new Error("Code d'intégration Spotify invalide (open.spotify.com attendu)");
      if (!appleOk) throw new Error("Code d'intégration Apple Music invalide (embed.music.apple.com attendu)");
      if (!spotify.trim() && !apple.trim()) throw new Error("Ajoute au moins un lecteur");

      const payload = {
        title: trimmedTitle,
        description: description.trim() || null,
        category,
        year: category === "indiscovery" ? Number(year) || null : null,
        spotify_embed: spotify.trim() || null,
        apple_embed: apple.trim() || null,
        position: Number(position) || 0,
        is_published: published,
        author_id: session.user.id,
      };

      if (initial?.id) {
        const { error } = await supabase.from("playlist_entries").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("playlist_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(initial?.id ? "Playlist modifiée" : "Playlist publiée");
      qc.invalidateQueries({ queryKey: ["playlist-entries"] });
      qc.invalidateQueries({ queryKey: ["admin-playlist-entries"] });
      onDone();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="card-brut space-y-3 border-2 border-primary p-3">
      <div className="text-[10px] uppercase tracking-widest text-primary">
        {initial?.id ? "Modifier la playlist" : "Nouvelle playlist"}
      </div>

      <Input placeholder="Titre (ex. IndéGraal)" value={title} onChange={(e) => setTitle(e.target.value)} />

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
        <select
          aria-label="Catégorie"
          className="h-9 rounded-md border border-input bg-background px-2 text-sm"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
        >
          {CATEGORIES.map((c) => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
        <Input
          aria-label="Année"
          placeholder="Année (InDiscovery)"
          value={year}
          disabled={category !== "indiscovery"}
          onChange={(e) => setYear(e.target.value)}
        />
        <Input
          aria-label="Position"
          placeholder="Position (0 = en premier)"
          value={position}
          onChange={(e) => setPosition(e.target.value)}
        />
      </div>

      <RichTextArea
        value={description}
        onChange={setDescription}
        rows={5}
        ariaLabel="Présentation de la playlist"
        placeholder="Présentation de la playlist (commune aux deux lecteurs)"
      />

      <Textarea
        rows={3}
        placeholder="Code d'intégration Spotify (<iframe src=…open.spotify.com/embed/playlist/…>)"
        value={spotify}
        onChange={(e) => setSpotify(e.target.value)}
        className={!spotifyOk ? "border-destructive" : undefined}
      />
      <Textarea
        rows={3}
        placeholder="Code d'intégration Apple Music (<iframe src=…embed.music.apple.com/…>)"
        value={apple}
        onChange={(e) => setApple(e.target.value)}
        className={!appleOk ? "border-destructive" : undefined}
      />

      <label className="flex items-center gap-2 text-xs">
        <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
        Publiée (visible par tous)
      </label>

      {(spotify.trim() || apple.trim()) && (
        <div className="space-y-2 rounded-lg border border-dashed border-border p-2">
          <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Aperçu</div>
          <PlaylistEmbedPair title={title || "Playlist"} spotify={spotify} apple={apple} />
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDone}>
          <X className="size-3.5" /> Annuler
        </Button>
        <Button size="sm" onClick={() => save.mutate()} disabled={!title.trim() || save.isPending}>
          <Check className="size-3.5" /> {initial?.id ? "Enregistrer" : "Publier"}
        </Button>
      </div>
    </div>
  );
}