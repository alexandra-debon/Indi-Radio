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
import { ShoppingBag, ExternalLink, Sparkles, Tag, Filter } from "lucide-react";
import { ShopMissionNote } from "@/components/artist/ShopMissionNote";

export type ShopItem = {
  id: string;
  title: string;
  format: string;
  image_url: string | null;
  summary: string | null;
  external_url: string | null;
  tags: string[] | null;
  is_visible: boolean;
  cta_kind?: string | null;
  in_public_shop?: boolean | null;
};

export const SHOP_CTA_KINDS = ["buy", "preorder", "ticket"] as const;
export type ShopCtaKind = (typeof SHOP_CTA_KINDS)[number];

export const SHOP_FORMATS = ["Vinyle", "CD", "K7", "Livre", "Merch", "Autre"] as const;

const TXT = {
  fr: {
    shop: "Boutique",
    empty: "Aucun objet en boutique pour le moment.",
    buy: "Acheter",
    preorder: "Pré-commander",
    ticket: "Acheter mon billet",
    publicShop: "Boutique publique InDi",
    featured: "Mise en avant",
    tags: "Tags éditoriaux (admin)",
    save: "Enregistrer les tags",
    tagsHint: "Séparés par des virgules",
    filterLabel: "Format",
    allFormats: "Tout",
    noneForFormat: "Aucun objet dans ce format.",
    refundBefore: "Chaque achat que vous effectuez va à ",
    refundHighlight: "100\u00A0% directement à l'artiste",
    refundAfter: ", sans la moindre retenue.",
  },
  en: {
    shop: "Shop",
    empty: "Nothing in the shop yet.",
    buy: "Buy",
    preorder: "Pre-order",
    ticket: "Get my ticket",
    publicShop: "InDi public shop",
    featured: "Featured",
    tags: "Editorial tags (admin)",
    save: "Save tags",
    tagsHint: "Comma separated",
    filterLabel: "Format",
    allFormats: "All",
    noneForFormat: "No item in this format.",
    refundBefore: "Every purchase you make goes ",
    refundHighlight: "100% straight to the artist",
    refundAfter: ", with no deduction at all.",
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
        .select("id, title, format, image_url, summary, external_url, tags, is_visible, cta_kind, in_public_shop")
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

/** Libellé du bouton d'action choisi par l'artiste pour cet objet. */
export function shopCtaLabel(
  kind: string | null | undefined,
  txt: { buy: string; preorder: string; ticket: string },
) {
  if (kind === "preorder") return txt.preorder;
  if (kind === "ticket") return txt.ticket;
  return txt.buy;
}

function ShopCard({ item, accent, isAdmin, compact, artistId }: { item: ShopItem; accent?: string | null; isAdmin: boolean; compact?: boolean; artistId?: string }) {
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
          <a
            href={item.external_url}
            target="_blank"
            rel="noopener noreferrer nofollow"
            onClick={() =>
              void logShopClick({
                itemId: item.id,
                artistId: artistId ?? null,
                itemTitle: item.title,
                ctaKind: item.cta_kind,
                format: item.format,
                externalUrl: item.external_url,
                source: "artist",
              })
            }
          >
            <ExternalLink className="size-4" /> {shopCtaLabel(item.cta_kind, txt)}
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
  const [format, setFormat] = useState<string | null>(null);

  const featured = items.filter((i) => (i.tags ?? []).length > 0);
  const availableFormats = SHOP_FORMATS.filter((f) => items.some((i) => i.format === f));
  const visible = format ? items.filter((i) => i.format === format) : items;

  return (
    <div id="boutique" className="card-brut scroll-mt-24 p-4" style={accent ? { borderColor: accent } : undefined}>
      <h2 className="mb-3 flex items-center gap-2 text-sm font-black uppercase tracking-wide">
        <ShoppingBag className="size-4" style={accent ? { color: accent } : undefined} /> {txt.shop}
      </h2>
      <p className="mb-3 text-xs font-semibold leading-snug text-muted-foreground">
        {txt.refundBefore}
        <span className="font-black text-radio-yellow">{txt.refundHighlight}</span>
        {txt.refundAfter}
      </p>
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
          {availableFormats.length > 1 && (
            <div className="mb-3 flex flex-wrap items-center gap-1.5" role="group" aria-label={txt.filterLabel}>
              <span className="mr-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Filter className="size-3" /> {txt.filterLabel}
              </span>
              <button
                type="button"
                onClick={() => setFormat(null)}
                aria-pressed={format === null}
                className={
                  "rounded-full border-2 border-black px-2 py-0.5 text-[11px] font-semibold transition " +
                  (format === null ? "bg-primary text-black shadow-[2px_2px_0_0_#000]" : "bg-background hover:bg-muted")
                }
                style={format === null && accent ? { backgroundColor: accent, color: "#000" } : undefined}
              >
                {txt.allFormats}
              </button>
              {availableFormats.map((f) => {
                const active = format === f;
                return (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFormat(active ? null : f)}
                    aria-pressed={active}
                    className={
                      "rounded-full border-2 border-black px-2 py-0.5 text-[11px] font-semibold transition " +
                      (active ? "bg-primary text-black shadow-[2px_2px_0_0_#000]" : "bg-background hover:bg-muted")
                    }
                    style={active && accent ? { backgroundColor: accent, color: "#000" } : undefined}
                  >
                    {f}
                  </button>
                );
              })}
            </div>
          )}
          {visible.length === 0 ? (
            <p className="text-sm text-muted-foreground">{txt.noneForFormat}</p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {visible.map((i) => (
                <ShopCard key={i.id} item={i} accent={accent} isAdmin={isAdmin} />
              ))}
            </div>
          )}
        </>
      )}
      <ShopMissionNote accent={accent} />
    </div>
  );
}
