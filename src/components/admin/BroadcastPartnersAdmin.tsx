import { useEffect, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { toast } from "@/lib/toast";
import { ImageUploader } from "@/components/media/ImageUploader";
import { ArrowDown, ArrowUp, GripVertical, Plus, Save, Trash2 } from "lucide-react";
import { PartnerItem } from "@/components/about/BroadcastPartners";
import {
  sanitizePartnerHtml,
  hasRenderableHtml,
  PARTNER_HTML_MAX_LENGTH,
} from "@/lib/sanitize-partner-html";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ALL_SURFACES, SURFACE_LABELS, type Surface } from "@/lib/surface";
import { Checkbox } from "@/components/ui/checkbox";

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
  visible_on: string[] | null;
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
  visible_on: [...ALL_SURFACES],
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
      let safeHtml: string | null = null;
      if (d.kind === "html") {
        const raw = d.html_snippet?.trim() ?? "";
        if (!raw) throw new Error("Snippet HTML requis");
        if (raw.length > PARTNER_HTML_MAX_LENGTH) {
          throw new Error(`Snippet trop long (max ${PARTNER_HTML_MAX_LENGTH} caractères)`);
        }
        safeHtml = sanitizePartnerHtml(raw);
        if (!hasRenderableHtml(safeHtml)) {
          throw new Error("Snippet HTML invalide après filtrage (aucun lien/image sûr détecté)");
        }
      }
      if (d.kind === "logo" && d.link_url) {
        try {
          const u = new URL(d.link_url);
          if (u.protocol !== "http:" && u.protocol !== "https:") {
            throw new Error("bad-proto");
          }
        } catch {
          throw new Error("Le lien au clic doit être une URL http(s) valide");
        }
      }

      const payload = {
        name: d.name.trim(),
        kind: d.kind,
        logo_url: d.kind === "logo" ? d.logo_url : null,
        link_url: d.link_url || null,
        alt_text: d.alt_text || null,
        html_snippet: safeHtml,
        is_active: d.is_active,
        visible_on: (d.visible_on && d.visible_on.length > 0
          ? d.visible_on
          : [...ALL_SURFACES]) as string[],
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

  // Local optimistic order for drag & drop
  const [order, setOrder] = useState<Partner[]>([]);
  useEffect(() => {
    setOrder(partners);
  }, [partners]);

  const reorder = useMutation({
    mutationFn: async (list: Partner[]) => {
      // Persist a normalized position for every row (0..n-1)
      const updates = list.map((p, i) =>
        supabase.from("broadcast_partners").update({ position: i }).eq("id", p.id),
      );
      const results = await Promise.all(updates);
      const err = results.find((r) => r.error)?.error;
      if (err) throw err;
    },
    onSuccess: () => {
      toast.success("Ordre mis à jour");
      invalidate();
    },
    onError: (e: Error) => {
      toast.error(e.message);
      setOrder(partners);
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = order.findIndex((p) => p.id === active.id);
    const newIndex = order.findIndex((p) => p.id === over.id);
    if (oldIndex < 0 || newIndex < 0) return;
    const next = arrayMove(order, oldIndex, newIndex);
    setOrder(next);
    reorder.mutate(next);
  };

  const moveByOne = (id: string, dir: -1 | 1) => {
    const idx = order.findIndex((p) => p.id === id);
    const j = idx + dir;
    if (idx < 0 || j < 0 || j >= order.length) return;
    const next = arrayMove(order, idx, j);
    setOrder(next);
    reorder.mutate(next);
  };

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
                value={draft.logo_url ?? ""}
                onChange={(url) => setDraft({ ...draft, logo_url: url })}
                folder="broadcast-partners"
                label="Logo"
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

        <div className="space-y-2 rounded border border-border/60 bg-muted/30 p-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Visibilité
            </span>
            <span className="text-[11px] text-muted-foreground">
              Toujours masqué sur les futures apps natives (App Store / Play Store)
            </span>
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {ALL_SURFACES.map((s) => {
              const list = draft.visible_on ?? [...ALL_SURFACES];
              const checked = list.includes(s);
              return (
                <label
                  key={s}
                  className="flex cursor-pointer items-start gap-2 rounded border border-border bg-background p-2 text-sm"
                >
                  <Checkbox
                    checked={checked}
                    onCheckedChange={(v) => {
                      const next = new Set(list);
                      if (v) next.add(s);
                      else next.delete(s);
                      setDraft({ ...draft, visible_on: Array.from(next) as Surface[] });
                    }}
                  />
                  <span>{SURFACE_LABELS[s]}</span>
                </label>
              );
            })}
          </div>
          {(draft.visible_on ?? []).length === 0 && (
            <p className="text-[11px] text-destructive">
              Sélectionne au moins une surface, sinon toutes seront réactivées par défaut.
            </p>
          )}
        </div>

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

        <div className="space-y-2 border-t border-border/60 pt-3">
          <div className="flex items-center justify-between">
            <h4 className="font-display text-xs uppercase tracking-wide text-muted-foreground">
              Aperçu en direct
            </h4>
            <span className="text-[11px] text-muted-foreground">
              Rendu identique à la page « À propos »
            </span>
          </div>
          <div className="card-brut flex min-h-[112px] items-center justify-center bg-muted/30 p-4">
            {(draft.kind === "logo" && draft.logo_url) ||
            (draft.kind === "html" && draft.html_snippet?.trim()) ? (
              <PartnerItem
                p={{
                  id: "preview",
                  name: draft.name || "Aperçu",
                  kind: draft.kind,
                  logo_url: draft.logo_url || null,
                  link_url: draft.link_url || null,
                  alt_text: draft.alt_text || null,
                  html_snippet: draft.html_snippet || null,
                }}
              />
            ) : (
              <p className="text-xs text-muted-foreground">
                Renseigne un logo ou un snippet HTML pour voir l'aperçu.
              </p>
            )}
          </div>
        </div>
      </section>

      <section className="space-y-2">
        <h3 className="font-display text-sm uppercase tracking-wide">Diffuseurs enregistrés</h3>
        {order.length === 0 ? (
          <p className="text-sm text-muted-foreground">Aucun diffuseur pour le moment.</p>
        ) : (
          <>
            <p className="text-[11px] text-muted-foreground">
              Glisser-déposer la poignée pour réordonner. L'ordre est enregistré immédiatement.
            </p>
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
              <SortableContext items={order.map((p) => p.id)} strategy={verticalListSortingStrategy}>
                <ul className="space-y-2">
                  {order.map((p, i) => (
                    <SortableRow
                      key={p.id}
                      p={p}
                      isFirst={i === 0}
                      isLast={i === order.length - 1}
                      onMoveUp={() => moveByOne(p.id, -1)}
                      onMoveDown={() => moveByOne(p.id, 1)}
                      onEdit={() => setDraft({ ...p })}
                      onToggle={() => toggleActive.mutate(p)}
                      onDelete={() => {
                        if (confirm(`Supprimer « ${p.name} » ?`)) remove.mutate(p.id);
                      }}
                    />
                  ))}
                </ul>
              </SortableContext>
            </DndContext>
          </>
        )}
      </section>
    </div>
  );
}

function SortableRow({
  p,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onEdit,
  onToggle,
  onDelete,
}: {
  p: Partner;
  isFirst: boolean;
  isLast: boolean;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: p.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.6 : 1,
    zIndex: isDragging ? 10 : undefined,
  };
  return (
    <li ref={setNodeRef} style={style} className="card-brut flex items-center gap-3 p-3">
      <button
        type="button"
        className="flex h-10 w-6 cursor-grab touch-none items-center justify-center rounded text-muted-foreground hover:bg-muted active:cursor-grabbing"
        aria-label="Réordonner (glisser-déposer)"
        {...attributes}
        {...listeners}
      >
        <GripVertical className="size-4" />
      </button>

      <div className="flex flex-col gap-1">
        <Button size="icon" variant="outline" disabled={isFirst} onClick={onMoveUp} aria-label="Monter">
          <ArrowUp className="size-3" />
        </Button>
        <Button size="icon" variant="outline" disabled={isLast} onClick={onMoveDown} aria-label="Descendre">
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

      <Switch checked={p.is_active} onCheckedChange={onToggle} aria-label="Actif" />
      <Button size="sm" variant="outline" onClick={onEdit}>
        Modifier
      </Button>
      <Button size="icon" variant="ghost" onClick={onDelete} aria-label="Supprimer">
        <Trash2 className="size-4 text-destructive" />
      </Button>
    </li>
  );
}