import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SmartImg } from "@/components/media/SmartImg";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { toast } from "@/lib/toast";
import { useLang } from "@/lib/i18n";
import { ShoppingBag, ExternalLink, Sparkles, Tag } from "lucide-react";

export type ShopItem = {
  id: string;
  title: string;
  format: string;
  image_url: string | null;
  summary: string | null;
  external_url: string | null;
  tags: string[] | null;
  is_visible: boolean;
};

export const SHOP_FORMATS = ["Vinyle", "CD", "K7", "Livre", "Merch", "Autre"] as const;

const TXT = {
  fr: {
    shop: "Boutique",
    empty: "Aucun objet en boutique pour le moment.",
    buy: "Acheter",
    featured: "Mise en avant",
    tags: "Tags éditoriaux (admin)",
    save: "Enregistrer les tags",
    tagsHint: "Séparés par des virgules",
  },
  en: {
    shop: "Shop",
    empty: "Nothing in the shop yet.",
    buy: "Buy",
    featured: "Featured",
    tags: "Editorial tags (admin)",
    save: "Save tags",
    tagsHint: "Comma separated",
  },
} as const;

export function useShopTxt() {
  const { lang } = useLang();
  return TXT[lang === "en" ? "en" : "fr"];
}

export function useArtistShopItems(artistId: string, opts: { onlyVisible?: boolean } = {}) {
  return useQuery<ShopItem[]>({
    queryKey: ["artist-shop", artistId, opts.onlyVisible !== false],
    queryFn: async () => {
      let q = supabase
        .from("artist_shop_items")
        .select("id, title, format, image_url, summary, external_url, tags, is_visible")
        .eq("artist_id", artistId)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (opts.onlyVisible !== false) q = q.eq("is_visible", true);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as ShopItem[];
    },
  });
}

function AdminTags({ item }: { item: ShopItem }) {
  const txt = useShopTxt();
  const qc = useQueryClient();
  const [value, setValue] = useState((item.tags ?? []).join(", "));
  const save = useMutation({
    mutationFn: async () => {
      const tags = value
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const { error } = await supabase
        .from("artist_shop_items")
        .update({ tags: tags.length ? tags : null } as any)
        .eq("id", item.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Tags mis à jour");
      qc.invalidateQueries({ queryKey: ["artist-shop"] });
    },
    onError: (e) => toast.error((e as Error).message),
  });
  return (
    <div className="mt-2 space-y-1 border-t-2 border-dashed border-border pt-2">
      <label className="flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        <Tag className="size-3" /> {txt.tags}
      </label>
      <div className="flex gap-1">
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={txt.tagsHint} className="h-8 text-xs" />
        <Button type="button" size="sm" onClick={() => save.mutate()} disabled={save.isPending}>
          {txt.save}
        </Button>
      </div>
    </div>
  );
}

function ShopCard({ item, accent, isAdmin, compact }: { item: ShopItem; accent?: string | null; isAdmin: boolean; compact?: boolean }) {
  const txt = useShopTxt();
  return (
    <div className={`flex flex-col border-2 border-border p-2 ${compact ? "w-52 shrink-0" : ""}`} style={accent ? { borderColor: accent } : undefined}>
      {item.image_url ? (
        <SmartImg src={item.image_url} alt={item.title} width={400} height={400} className="aspect-square w-full border-2 border-border object-cover" />
      ) : (
        <div className="grid aspect-square w-full place-items-center border-2 border-border bg-muted text-muted-foreground">
          <ShoppingBag className="size-8" />
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className="border border-border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">{item.format}</span>
        {(item.tags ?? []).map((tg) => (
          <span
            key={tg}
            className="border-2 border-border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest"
            style={accent ? { backgroundColor: accent, color: "#000", borderColor: accent } : { backgroundColor: "hsl(var(--primary))" }}
          >
            {tg}
          </span>
        ))}
      </div>
      <div className="mt-1 text-sm font-black">{item.title}</div>
      {item.summary && (
        <TranslatedText
          as="p"
          className="mt-1 line-clamp-4 whitespace-pre-wrap text-xs text-muted-foreground"
          entityType="shop_item"
          entityKey={item.id}
          field="summary"
          text={item.summary}
          manual={false}
        />
      )}
      {item.external_url && (
        <Button
          asChild
          size="sm"
          className="mt-2"
          style={accent ? { backgroundColor: accent, color: "#000", borderColor: accent } : undefined}
        >
          <a href={item.external_url} target="_blank" rel="noopener noreferrer nofollow">
            <ExternalLink className="size-4" /> {txt.buy}
          </a>
        </Button>
      )}
      {isAdmin && <AdminTags item={item} />}
    </div>
  );
}

export function ArtistShop({ artistId, accent }: { artistId: string; accent?: string | null }) {
  const txt = useShopTxt();
  const { isAdmin } = useAuth();
  const { data: items = [] } = useArtistShopItems(artistId);

  const featured = items.filter((i) => (i.tags ?? []).length > 0);

  return (
    <div className="card-brut p-4" style={accent ? { borderColor: accent } : undefined}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide">
        <ShoppingBag className="size-4" style={accent ? { color: accent } : undefined} /> {txt.shop}
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{txt.empty}</p>
      ) : (
        <>
          {featured.length > 0 && (
            <div className="mb-4">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Sparkles className="size-3.5" style={accent ? { color: accent } : undefined} /> {txt.featured}
              </div>
              <div className="flex snap-x gap-3 overflow-x-auto pb-2">
                {featured.map((i) => (
                  <div key={i.id} className="snap-start">
                    <ShopCard item={i} accent={accent} isAdmin={isAdmin} compact />
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((i) => (
              <ShopCard key={i.id} item={i} accent={accent} isAdmin={isAdmin} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
