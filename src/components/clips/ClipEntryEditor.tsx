import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isValidVideoUrl } from "@/lib/media-embed";
import { X, Check, Plus, Trash2 } from "lucide-react";

type Section = "clips_actu" | "playlists_clips";
type Mode = "single" | "playlist" | "list";

export interface ClipEntryDraft {
  id?: string;
  section: Section;
  title: string;
  body: string | null;
  video_url: string | null;
  playlist_url: string | null;
  video_urls: string[] | null;
}

function detectMode(draft: ClipEntryDraft | null): Mode {
  if (!draft) return "single";
  if (draft.playlist_url) return "playlist";
  if (draft.video_urls && draft.video_urls.length > 0) return "list";
  return "single";
}

export function ClipEntryEditor({
  section,
  initial,
  onDone,
}: {
  section: Section;
  initial?: ClipEntryDraft | null;
  onDone: () => void;
}) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [mode, setMode] = useState<Mode>(detectMode(initial ?? null));
  const [videoUrl, setVideoUrl] = useState(initial?.video_url ?? "");
  const [playlistUrl, setPlaylistUrl] = useState(initial?.playlist_url ?? "");
  const [videoUrls, setVideoUrls] = useState<string[]>(initial?.video_urls ?? [""]);

  const save = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Non connecté");
      const trimmedTitle = title.trim();
      if (!trimmedTitle) throw new Error("Le titre est requis");

      const payload: {
        section: Section;
        title: string;
        body: string | null;
        video_url: string | null;
        playlist_url: string | null;
        video_urls: string[] | null;
        author_id: string;
      } = {
        section,
        title: trimmedTitle,
        body: body.trim() || null,
        video_url: null,
        playlist_url: null,
        video_urls: null,
        author_id: session.user.id,
      };

      if (mode === "single") {
        const u = videoUrl.trim();
        if (u && !isValidVideoUrl(u)) throw new Error("URL vidéo YouTube/Vimeo invalide");
        payload.video_url = u || null;
      } else if (mode === "playlist") {
        const u = playlistUrl.trim();
        if (u && !isValidVideoUrl(u)) throw new Error("URL playlist invalide (YouTube/Vimeo attendu)");
        payload.playlist_url = u || null;
      } else {
        const clean = videoUrls.map((v) => v.trim()).filter(Boolean);
        for (const u of clean) {
          if (!isValidVideoUrl(u)) throw new Error(`URL invalide : ${u}`);
        }
        payload.video_urls = clean.length > 0 ? clean : null;
      }

      if (initial?.id) {
        const { error } = await supabase.from("clip_entries").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clip_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(initial?.id ? "Entrée modifiée" : "Entrée publiée");
      qc.invalidateQueries({ queryKey: ["clip-entries"] });
      onDone();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="card-brut space-y-3 border-2 border-primary p-3">
      <div className="text-[10px] uppercase tracking-widest text-primary">
        {initial?.id ? "Modifier l'entrée" : "Nouvelle entrée"} — {section === "clips_actu" ? "Clips Actu" : "Playlists Clips"}
      </div>

      <Input placeholder="Titre" value={title} onChange={(e) => setTitle(e.target.value)} />
      <Textarea placeholder="Texte / article (optionnel)" rows={4} value={body} onChange={(e) => setBody(e.target.value)} />

      <RadioGroup value={mode} onValueChange={(v) => setMode(v as Mode)} className="flex flex-wrap gap-3 text-xs">
        <div className="flex items-center gap-1.5">
          <RadioGroupItem value="single" id={`m-single-${section}`} />
          <Label htmlFor={`m-single-${section}`} className="cursor-pointer">Vidéo unique</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <RadioGroupItem value="playlist" id={`m-playlist-${section}`} />
          <Label htmlFor={`m-playlist-${section}`} className="cursor-pointer">Playlist</Label>
        </div>
        <div className="flex items-center gap-1.5">
          <RadioGroupItem value="list" id={`m-list-${section}`} />
          <Label htmlFor={`m-list-${section}`} className="cursor-pointer">Liste manuelle</Label>
        </div>
      </RadioGroup>

      {mode === "single" && (
        <Input placeholder="Lien YouTube ou Vimeo" value={videoUrl} onChange={(e) => setVideoUrl(e.target.value)} />
      )}
      {mode === "playlist" && (
        <Input placeholder="Lien playlist YouTube (…/playlist?list=…)" value={playlistUrl} onChange={(e) => setPlaylistUrl(e.target.value)} />
      )}
      {mode === "list" && (
        <div className="space-y-2">
          {videoUrls.map((u, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder={`Vidéo ${i + 1} — lien YouTube/Vimeo`}
                value={u}
                onChange={(e) => setVideoUrls((arr) => arr.map((x, idx) => (idx === i ? e.target.value : x)))}
              />
              <button
                type="button"
                onClick={() => setVideoUrls((arr) => (arr.length > 1 ? arr.filter((_, idx) => idx !== i) : arr))}
                className="grid size-9 shrink-0 place-items-center rounded-md border border-border text-muted-foreground hover:bg-destructive hover:text-destructive-foreground"
                aria-label="Retirer"
              >
                <Trash2 className="size-4" />
              </button>
            </div>
          ))}
          <Button type="button" size="sm" variant="ghost" onClick={() => setVideoUrls((arr) => [...arr, ""])}>
            <Plus className="size-3.5" /> Ajouter une vidéo
          </Button>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDone}><X className="size-3.5" /> Annuler</Button>
        <Button size="sm" onClick={() => save.mutate()} disabled={!title.trim() || save.isPending}>
          <Check className="size-3.5" /> {initial?.id ? "Enregistrer" : "Publier"}
        </Button>
      </div>
    </div>
  );
}