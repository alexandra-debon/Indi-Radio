import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { SmartImg } from "@/components/media/SmartImg";
import { toast } from "@/lib/toast";
import { SHOP_FORMATS } from "@/components/artist/ArtistShop";
import { ShieldAlert, Loader2, ShoppingBag, Tag, Eye, EyeOff, ExternalLink, Filter } from "lucide-react";

export const Route = createFileRoute("/_authenticated/admin/boutique")({
  head: () => ({
    meta: [{ title: "Objets boutique — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminShopPage,
});

type AdminShopItem = {
  id: string;
  artist_id: string;
  title: string;
  format: string;
  image_url: string | null;
  summary: string | null;
  external_url: string | null;
  tags: string[] | null;
  is_visible: boolean;
  created_at: string;
  artist: { id: string; pseudo: string; stage_name: string | null } | null;
};

const NO_TAG = "__none__";

function AdminShopPage() {
  const { isAdmin } = useAuth();
  const qc = useQueryClient();
  const [tag, setTag] = useState<string | null>(null);
  const [format, setFormat] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [tagDrafts, setTagDrafts] = useState<Record<string, string>>({});

  const { data: items = [], isLoading } = useQuery<AdminShopItem[]>({
    queryKey: ["admin-shop-items"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_shop_items")
        .select(
          "id, artist_id, title, format, image_url, summary, external_url, tags, is_visible, created_at, artist:profiles!artist_shop_items_artist_id_fkey(id, pseudo, stage_name)",
        )
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AdminShopItem[];
    },
  });

  const allTags = useMemo(() => {
    const set = new Set<string>();
    for (const i of items) for (const t of i.tags ?? []) set.add(t);
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [items]);

  const toggleVisible = useMutation({
    mutationFn: async ({ id, value }: { id: string; value: boolean }) => {
      const { error } = await supabase
        .from("artist_shop_items")
        .update({ is_visible: value } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["admin-shop-items"] });
      qc.invalidateQueries({ queryKey: ["artist-shop"] });
      qc.invalidateQueries({ queryKey: ["artistes-gallery-shops"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const saveTags = useMutation({
    mutationFn: async ({ id, raw }: { id: string; raw: string }) => {
      const tags = raw.split(",").map((s) => s.trim()).filter(Boolean);
      const { error } = await supabase
        .from("artist_shop_items")
        .update({ tags: tags.length ? tags : null } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tags mis à jour");
      qc.invalidateQueries({ queryKey: ["admin-shop-items"] });
      qc.invalidateQueries({ queryKey: ["artist-shop"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });

  const filtered = items.filter((i) => {
    if (tag === NO_TAG && (i.tags ?? []).length > 0) return false;
    if (tag && tag !== NO_TAG && !(i.tags ?? []).includes(tag)) return false;
    if (format && i.format !== format) return false;
    const q = search.trim().toLowerCase();
    if (q) {
      const hay = `${i.title} ${i.artist?.stage_name ?? ""} ${i.artist?.pseudo ?? ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });

  if (!isAdmin) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16 text-center">
        <ShieldAlert className="mx-auto mb-3 size-10 text-destructive" />
        <p className="text-muted-foreground">Cette page est réservée aux administrateurs.</p>
      </main>
    );
  }

  const pill = (active: boolean) =>
    "rounded-full border-2 border-black px-2.5 py-0.5 text-[11px] font-semibold transition " +
    (active ? "bg-primary text-black shadow-[2px_2px_0_0_#000]" : "bg-background hover:bg-muted");

  return (
    <main className="mx-auto max-w-5xl px-4 py-8">
      <h1 className="flex items-center gap-2 text-3xl font-black">
        <ShoppingBag className="size-7 text-primary" /> Objets boutique
      </h1>
      <p className="mt-1 text-muted-foreground">
        Tous les objets créés par les artistes. Active ou désactive leur affichage public et gère les tags éditoriaux.
      </p>

      <div className="mt-6 space-y-3 rounded-xl border border-border bg-card p-4">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Rechercher un objet ou un artiste…"
          className="h-9"
        />
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrer par tag éditorial">
          <span className="mr-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <Tag className="size-3" /> Tag éditorial
          </span>
          <button type="button" onClick={() => setTag(null)} aria-pressed={tag === null} className={pill(tag === null)}>
            Tous
          </button>
          {allTags.map((t) => (
            <button key={t} type="button" onClick={() => setTag(tag === t ? null : t)} aria-pressed={tag === t} className={pill(tag === t)}>
              {t}
            </button>
          ))}
          <button
            type="button"
            onClick={() => setTag(tag === NO_TAG ? null : NO_TAG)}
            aria-pressed={tag === NO_TAG}
            className={pill(tag === NO_TAG)}
          >
            Sans tag
          </button>
        </div>
        <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label="Filtrer par format">
          <span className="mr-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <Filter className="size-3" /> Format
          </span>
          <button type="button" onClick={() => setFormat(null)} aria-pressed={format === null} className={pill(format === null)}>
            Tous
          </button>
          {SHOP_FORMATS.map((f) => (
            <button key={f} type="button" onClick={() => setFormat(format === f ? null : f)} aria-pressed={format === f} className={pill(format === f)}>
              {f}
            </button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="py-16 text-center">
          <Loader2 className="mx-auto size-6 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <p className="mt-8 rounded-xl border border-border bg-card p-6 text-center text-muted-foreground">
          {items.length === 0 ? "Aucun objet boutique pour le moment." : "Aucun objet ne correspond à ces filtres."}
        </p>
      ) : (
        <>
          <p className="mt-4 text-xs text-muted-foreground">
            {filtered.length} objet{filtered.length > 1 ? "s" : ""} · {filtered.filter((i) => i.is_visible).length} visible
            {filtered.filter((i) => i.is_visible).length > 1 ? "s" : ""}
          </p>
          <ul className="mt-3 space-y-3">
            {filtered.map((i) => {
              const draft = tagDrafts[i.id] ?? (i.tags ?? []).join(", ");
              return (
                <li key={i.id} className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4 sm:flex-row">
                  {i.image_url ? (
                    <SmartImg
                      src={i.image_url}
                      alt={i.title}
                      width={200}
                      height={200}
                      className="size-24 shrink-0 border-2 border-border object-cover"
                    />
                  ) : (
                    <div className="grid size-24 shrink-0 place-items-center border-2 border-border bg-muted text-muted-foreground">
                      <ShoppingBag className="size-6" />
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="border border-border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
                        {i.format}
                      </span>
                      <span className="text-sm font-black">{i.title}</span>
                      {!i.is_visible && (
                        <span className="border-2 border-destructive px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-destructive">
                          Masqué
                        </span>
                      )}
                    </div>
                    <div className="mt-0.5 text-xs text-muted-foreground">
                      {i.artist ? (
                        <Link to="/u/$pseudo" params={{ pseudo: i.artist.pseudo }} hash="boutique" className="underline">
                          {i.artist.stage_name || i.artist.pseudo}
                        </Link>
                      ) : (
                        "Artiste inconnu"
                      )}
                      {" · "}
                      {new Date(i.created_at).toLocaleDateString("fr-FR")}
                    </div>
                    {i.summary && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{i.summary}</p>}
                    {i.external_url && (
                      <a
                        href={i.external_url}
                        target="_blank"
                        rel="noopener noreferrer nofollow"
                        className="mt-1 inline-flex items-center gap-1 text-xs underline"
                      >
                        <ExternalLink className="size-3" /> Lien d'achat
                      </a>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-1">
                      <Input
                        value={draft}
                        onChange={(e) => setTagDrafts((d) => ({ ...d, [i.id]: e.target.value }))}
                        placeholder="Tags éditoriaux, séparés par des virgules"
                        className="h-8 max-w-xs text-xs"
                      />
                      <Button
                        type="button"
                        size="sm"
                        onClick={() => saveTags.mutate({ id: i.id, raw: draft })}
                        disabled={saveTags.isPending}
                      >
                        <Tag className="size-3.5" /> Enregistrer
                      </Button>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2 sm:flex-col sm:justify-center">
                    <Switch
                      checked={i.is_visible}
                      onCheckedChange={(v) => toggleVisible.mutate({ id: i.id, value: v })}
                      aria-label={`Afficher « ${i.title} » dans la galerie`}
                    />
                    <span className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                      {i.is_visible ? <Eye className="size-3" /> : <EyeOff className="size-3" />}
                      {i.is_visible ? "Actif" : "Inactif"}
                    </span>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </main>
  );
}
