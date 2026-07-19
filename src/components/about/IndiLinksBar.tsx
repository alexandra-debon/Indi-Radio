import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Pencil, Check, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  SocialLinksBar,
  SocialLinksEditor,
  sanitizeLinks,
  type SocialLinks,
} from "@/components/social/SocialLinksBar";
import { toast } from "sonner";

const KEY = "indi_links";

export function IndiLinksBar() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState<SocialLinks>({});

  const { data: links } = useQuery({
    queryKey: ["site_settings", KEY],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("site_settings")
        .select("value")
        .eq("key", KEY)
        .maybeSingle();
      if (error) throw error;
      return (data?.value ?? {}) as SocialLinks;
    },
    staleTime: 60_000,
  });

  const save = useMutation({
    mutationFn: async (v: SocialLinks) => {
      const clean = sanitizeLinks(v);
      const { error } = await supabase
        .from("site_settings")
        .upsert({ key: KEY, value: clean as any }, { onConflict: "key" });
      if (error) throw error;
      return clean;
    },
    onSuccess: (clean) => {
      qc.setQueryData(["site_settings", KEY], clean);
      setEditing(false);
      toast.success("Liens Indi mis à jour");
    },
    onError: (e: unknown) => toast.error(e instanceof Error ? e.message : "Erreur"),
  });

  const hasLinks = links && Object.keys(sanitizeLinks(links)).some((k) => k !== "__order" && k !== "__labels");

  if (!hasLinks && !isAdmin) return null;

  return (
    <section className="relative overflow-hidden rounded-2xl border-2 border-primary/70 bg-gradient-to-br from-primary/15 via-background to-background p-4 shadow-lg">
      <div className="mb-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-primary" aria-hidden />
          <h2 className="text-sm font-black uppercase tracking-widest">Les liens Indi</h2>
        </div>
        {isAdmin && !editing && (
          <button
            type="button"
            onClick={() => {
              setDraft(links ?? {});
              setEditing(true);
            }}
            className="inline-flex items-center gap-1 rounded-full border border-border bg-background px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground transition hover:text-foreground"
          >
            <Pencil className="size-3" /> Éditer
          </button>
        )}
      </div>

      {editing ? (
        <div className="space-y-2">
          <SocialLinksEditor value={draft} onChange={setDraft} />
          <div className="flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="inline-flex items-center gap-1 rounded-full border border-border px-3 py-1 text-xs"
            >
              <X className="size-3" /> Annuler
            </button>
            <button
              type="button"
              disabled={save.isPending}
              onClick={() => save.mutate(draft)}
              className="inline-flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground disabled:opacity-50"
            >
              <Check className="size-3" /> Enregistrer
            </button>
          </div>
        </div>
      ) : hasLinks ? (
        <SocialLinksBar links={links ?? null} />
      ) : (
        <p className="text-xs italic text-muted-foreground">Aucun lien renseigné. Cliquez sur « Éditer » pour ajouter les réseaux et plateformes Indi.</p>
      )}
    </section>
  );
}
