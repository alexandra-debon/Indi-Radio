import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast";
import { ImageUploader } from "@/components/media/ImageUploader";
import { ArrowDown, ArrowUp, Plus, Save, Trash2 } from "lucide-react";

type Partner = {
  id: string;
  name: string;
  kind: "logo" | "html";
  logo_url: string | null;
  link_url: string | null;
  alt_text: string | null;
  html_snippet: string | null;
  position: number;
  is_active: boolean;
};

type Draft = Omit<Partner, "id" | "position"> & { id?: string; position?: number };

const EMPTY: Draft = {
  name: "",
  kind: "logo",
  logo_url: "",
  link_url: "",
  alt_text: "",
  html_snippet: "",
  is_active: true,
};

export function BroadcastPartnersAdmin() {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<Draft>(EMPTY);

  const { data: partners = [] } = useQuery({
    queryKey: ["admin", "broadcast-partners"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("broadcast_partners")
        .select("*")
        .order("position", { ascending: true })
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Partner[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["admin", "broadcast-partners"] });
    qc.invalidateQueries({ queryKey: ["broadcast-partners"] });
  };

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      if (!d.name.trim()) throw new Error("Nom requis");
      if (d.kind === "logo" && !d.logo_url) throw new Error("URL du logo requise");
      if (d.kind === "html" && !d.html_snippet?.trim()) throw new Error("Snippet HTML requis");

      const payload = {
        name: d.name.trim(),
        kind: d.kind,
        logo_url: d.kind === "logo" ? d.logo_url : null,
        link_url: d.link_url || null,
        alt_text: d.alt_text || null,
        html_snippet: d.kind === "html" ? d.html_snippet : null,
        is_active: d.is_active,
      };

      if (d.id) {
        const { error } = await supabase.from("broadcast_partners").update(payload).eq("id", d.id);
        if (error) throw error;
      } else {
        const nextPos = (partners.at(-1)?.position ?? -1) + 1;
        const { error } = await supabase
          .from("broadcast_partners")
          .insert({ ...payload, position: nextPos });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Diffuseur enregistré");
      setDraft(EMPTY);
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("broadcast_partners").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Diffuseur supprimé");
      invalidate();
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const move = useMutation({
    mutationFn: async ({ id, dir }: { id: string; dir: -1 | 1 }) => {
      const idx = partners.findIndex((p) => p.id === id);
      const swap = partners[idx + dir];
      if (!swap) return;
      const a = partners[idx];
      const { error: e1 } = await supabase
        .from("broadcast_partners")
        .update({ position: swap.position })
        .eq("id", a.id);
      const { error: e2 } = await supabase
        .from("broadcast_partners")
        .update({ position: a.position })
        .eq("id", swap.id);
      if (e1 || e2) throw e1 ?? e2;
    },
    onSuccess: invalidate,
    onError: (e: Error) => toast.error(e.message),
  });

  const toggleActive = useMutation({
    mutationFn: async (p: Partner) => {
      const { error } = await supabase
        .from("broadcast_partners")
        .update({ is_active: !p.is_active })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  return (
    <div className="space-y-6">
      <section className="card-brut space-y-3 p-4">
        <h3 className="font-display text-sm uppercase tracking-wide">
          {draft.id ? "Modifier le diffuseur" : "Ajouter un diffuseur"}
        </h3>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Nom</label>
            <Input
              value={draft.name}
              onChange={(e) => setDraft({ ...draft, name: e.target.value })}
              placeholder="TuneIn, Internet Radio…"
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Type</label>
            <Select
              value={draft.kind}
              onValueChange={(v) => setDraft({ ...draft, kind: v as "logo" | "html" })}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="logo">Logo + lien</SelectItem>
                <SelectItem value="html">Bannière HTML fournie</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {draft.kind === "logo" ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1 sm:col-span-2">
              <label className="text-xs text-muted-foreground">Logo</label>
              <ImageUploader
                value={draft.logo_url ?? null}
                onChange={(url) => setDraft({ ...draft, logo_url: url ?? "" })}
                bucket="content-images"
                folder="broadcast-partners"
              />
              <Input
                value={draft.logo_url ?? ""}
                onChange={(e) => setDraft({ ...draft, logo_url: e.target.value })}
                placeholder="…ou colle une URL de logo distant"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Lien au clic</label>
              <Input
                value={draft.link_url ?? ""}
                onChange={(e) => setDraft({ ...draft, link_url: e.target.value })}
                placeholder="https://tunein.com/…"
              />
            </div>
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">Texte alternatif</label>
              <Input
                value={draft.alt_text ?? ""}
                onChange={(e) => setDraft({ ...draft, alt_text: e.target.value })}
                placeholder="Logo TuneIn"
              />
            </div>
          </div>
        ) : (
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Snippet HTML (bannière fournie)</label>
            <Textarea
              rows={4}
              value={draft.html_snippet ?? ""}
              onChange={(e) => setDraft({ ...draft, html_snippet: e.target.value })}
              placeholder='<a href="https://…"><img src="https://…" alt="…"></a>'
            />
            <p className="text-[11px] text-muted-foreground">
              Assaini côté client : seuls &lt;a&gt;, &lt;img&gt;, &lt;span&gt;, &lt;div&gt;, &lt;br&gt; et les attributs sûrs sont conservés.
            </p>
          </div>
        )}

        <div className="flex items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm">
            <Switch
              checked={draft.is_active}
              onCheckedChange={(v) => setDraft({ ...draft, is_active: v })}
            />
            Actif
          </label>
          <div className="flex gap-2">
            {draft.id && (
              <Button variant="outline" onClick={() => setDraft(EMPTY)}>Annuler</Button>
            )}
            <Button onClick={() => save.mutate(draft)} disabled={save.isPending}>
              {draft.id ? <Save className="mr-1 size-4" /> : <Plus className="mr-1 size-4" />}
              {draft.id ? "Enregistrer" : "Ajouter"}
            </Button>
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-sm uppercase tracking-wide">Diffuseurs enregistrés</h3>
        {partners.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun diffuseur pour le moment.</p>
        ) : (
          <ul className="space-y-2">
            {partners.map((p, i) => (
              <li key={p.id} className="card-brut flex items-center gap-3 p-3">
                <div className="flex flex-col gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={i === 0}
                    onClick={() => move.mutate({ id: p.id, dir: -1 })}
                    aria-label="Monter"
                  >
                    <ArrowUp className="size-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="outline"
                    disabled={i === partners.length - 1}
                    onClick={() => move.mutate({ id: p.id, dir: 1 })}
                    aria-label="Descendre"
                  >
                    <ArrowDown className="size-3" />
                  </Button>
                </div>

                <div className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded border border-border bg-muted/40">
                  {p.kind === "logo" && p.logo_url ? (
                    <img src={p.logo_url} alt={p.alt_text ?? p.name} className="max-h-14 max-w-14 object-contain" />
                  ) : (
                    <span className="text-[10px] uppercase text-muted-foreground">HTML</span>
                  )}
                </div>

                <div className="min-w-0 flex-1">
                  <div className="truncate font-semibold">{p.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {p.kind === "logo" ? p.link_url || "(sans lien)" : "Bannière HTML"}
                  </div>
                </div>

                <Switch
                  checked={p.is_active}
                  onCheckedChange={() => toggleActive.mutate(p)}
                  aria-label="Actif"
                />
                <Button size="sm" variant="outline" onClick={() => setDraft({ ...p })}>
                  Modifier
                </Button>
                <Button
                  size="icon"
                  variant="ghost"
                  onClick={() => {
                    if (confirm(`Supprimer « ${p.name} » ?`)) remove.mutate(p.id);
                  }}
                  aria-label="Supprimer"
                >
                  <Trash2 className="size-4 text-destructive" />
                </Button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}