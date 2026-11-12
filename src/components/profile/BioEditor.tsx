import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { useLang } from "@/lib/i18n";

export const BIO_MAX = 4000;

const TXT = {
  fr: { edit: "Modifier ma biographie", write: "Écrire ma biographie", save: "Enregistrer", cancel: "Annuler", saved: "Biographie enregistrée", error: "Impossible d'enregistrer la biographie", placeholder: "Présente-toi : ton parcours, ta musique, tes projets…" },
  en: { edit: "Edit my biography", write: "Write my biography", save: "Save", cancel: "Cancel", saved: "Biography saved", error: "Could not save the biography", placeholder: "Introduce yourself: your journey, your music, your projects…" },
};

export function BioEditor({ userId, bio, onSaved }: { userId: string; bio: string | null; onSaved?: (bio: string | null) => void }) {
  const { lang } = useLang();
  const T = TXT[lang === "en" ? "en" : "fr"];
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(bio ?? "");
  const save = useMutation({
    mutationFn: async (value: string) => {
      const next = value.trim() || null;
      const { error } = await supabase.from("profiles").update({ bio: next }).eq("id", userId);
      if (error) throw error;
      return next;
    },
    onSuccess: (next) => {
      toast.success(T.saved);
      setOpen(false);
      onSaved?.(next);
      qc.invalidateQueries({ queryKey: ["profile"] });
    },
    onError: () => toast.error(T.error),
  });

  if (!open) {
    return (
      <Button size="sm" variant="outline" onClick={() => { setDraft(bio ?? ""); setOpen(true); }}>
        <Pencil className="size-3.5" /> {bio ? T.edit : T.write}
      </Button>
    );
  }
  return (
    <div className="space-y-2">
      <Textarea value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={BIO_MAX} rows={8} placeholder={T.placeholder} disabled={save.isPending} autoFocus />
      <p className="text-[11px] text-muted-foreground">{draft.length}/{BIO_MAX}</p>
      <div className="flex gap-2">
        <Button size="sm" disabled={save.isPending} onClick={() => save.mutate(draft)}>{T.save}</Button>
        <Button size="sm" variant="ghost" disabled={save.isPending} onClick={() => setOpen(false)}>{T.cancel}</Button>
      </div>
    </div>
  );
}
