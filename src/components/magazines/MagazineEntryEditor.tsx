import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/lib/toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { isValidFlipHtml5Url, normalizeFlipHtml5Url } from "@/lib/fliphtml5";
import { X, Check } from "lucide-react";

export interface MagazineEntryDraft {
  id?: string;
  title: string;
  body: string | null;
  magazine_url: string;
  cover_url: string | null;
}

export function MagazineEntryEditor({
  initial,
  onDone,
}: {
  initial?: MagazineEntryDraft | null;
  onDone: () => void;
}) {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [title, setTitle] = useState(initial?.title ?? "");
  const [body, setBody] = useState(initial?.body ?? "");
  const [magazineUrl, setMagazineUrl] = useState(initial?.magazine_url ?? "");
  const [coverUrl, setCoverUrl] = useState(initial?.cover_url ?? "");

  const save = useMutation({
    mutationFn: async () => {
      if (!session) throw new Error("Non connecté");
      const trimmedTitle = title.trim();
      const trimmedUrl = magazineUrl.trim();
      if (!trimmedTitle) throw new Error("Le titre est requis");
      if (!trimmedUrl) throw new Error("Le lien du magazine est requis");
      if (!isValidFlipHtml5Url(trimmedUrl)) {
        throw new Error("Lien FlipHTML5 invalide (ex. https://online.fliphtml5.com/xxxx/yyyy/)");
      }

      const payload = {
        title: trimmedTitle,
        body: body.trim() || null,
        magazine_url: normalizeFlipHtml5Url(trimmedUrl),
        cover_url: coverUrl.trim() || null,
        author_id: session.user.id,
      };

      if (initial?.id) {
        const { error } = await supabase.from("magazine_entries").update(payload).eq("id", initial.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("magazine_entries").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success(initial?.id ? "Article modifié" : "Article publié");
      qc.invalidateQueries({ queryKey: ["magazine-entries"] });
      onDone();
    },
    onError: (e) => toast.error((e as Error).message),
  });

  return (
    <div className="card-brut space-y-3 border-2 border-primary p-3">
      <div className="text-[10px] uppercase tracking-widest text-primary">
        {initial?.id ? "Modifier l'article" : "Nouvel article interactif"}
      </div>

      <Input
        placeholder="Titre (ex. Damien Rice — Artiste Indé de Légende)"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
      />
      <Textarea
        placeholder="Présentation / résumé de l'article (optionnel)"
        rows={4}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <Input
        placeholder="Lien FlipHTML5 (https://online.fliphtml5.com/…/…/)"
        value={magazineUrl}
        onChange={(e) => setMagazineUrl(e.target.value)}
      />
      <Input
        placeholder="URL de la couverture — optionnel (aperçu image plus rapide)"
        value={coverUrl}
        onChange={(e) => setCoverUrl(e.target.value)}
      />

      <div className="flex justify-end gap-2">
        <Button size="sm" variant="ghost" onClick={onDone}>
          <X className="size-3.5" /> Annuler
        </Button>
        <Button
          size="sm"
          onClick={() => save.mutate()}
          disabled={!title.trim() || !magazineUrl.trim() || save.isPending}
        >
          <Check className="size-3.5" /> {initial?.id ? "Enregistrer" : "Publier"}
        </Button>
      </div>
    </div>
  );
}