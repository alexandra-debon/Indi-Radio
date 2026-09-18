import { localizedStaticMeta } from "@/lib/og-static-head";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { SmartImg } from "@/components/media/SmartImg";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { SHOP_FORMATS, shopCtaLabel, useShopTxt } from "@/components/artist/ArtistShop";
import { useLang } from "@/lib/i18n";
import { ShoppingBag, ExternalLink, Sparkles, Filter } from "lucide-react";

export const Route = createFileRoute("/boutique")({
  head: async ({ match }) => ({
    meta: await localizedStaticMeta("/boutique", match.search, [
      { title: "Boutique Artistes InDi — Vinyles, CD, merch et billets des artistes indépendants" },
      { name: "description", content: "Tous les objets en vente par les artistes indépendants diffusés sur InDi RaDio : vinyles, CD, K7, livres et merch, en soutien direct aux artistes." },
      { property: "og:title", content: "Boutique Artistes InDi — Vinyles, CD, merch et billets des artistes indépendants" },
      { property: "og:description", content: "Vinyles, CD, K7, livres et merch des artistes indépendants diffusés sur InDi RaDio." },
      { name: "twitter:title", content: "Boutique Artistes InDi — Artistes indépendants" },
      { name: "twitter:description", content: "Vinyles, CD, K7, livres et merch des artistes indépendants diffusés sur InDi RaDio." },
      { property: "og:url", content: "https://www.radio.indi-art-culture.com/boutique" },
      { property: "og:type", content: "website" },
    ]),
    links: [{ rel: "canonical", href: "https://www.radio.indi-art-culture.com/boutique" }],
  }),
  component: BoutiquePage,
  errorComponent: ({ error }) => (
    <div className="p-4 text-sm text-destructive" role="alert">
      {error.message}
    </div>
  ),
  notFoundComponent: () => <div className="p-4">Introuvable.</div>,
});

type GlobalShopItem = {
  id: string;
  title: string;
  format: string;
  image_url: string | null;
  summary: string | null;
  external_url: string | null;
  tags: string[] | null;
  cta_kind: string | null;
  created_at: string;
  artist: { id: string; pseudo: string; stage_name: string | null } | null;
};

const PAGE_TXT = {
  fr: {
    title: "Boutique Artistes InDi",
    intro:
      "Les objets mis en boutique publique par les artistes indépendants d'InDi RaDio : disques, merch, billets de concert. Chaque achat va directement à l'artiste.",
    by: "Par",
    empty: "Aucun objet en boutique pour le moment.",
    viewArtistShop: "Voir la boutique de l'artiste",
  },
  en: {
    title: "InDi Artists Shop",
    intro:
      "Items put in the public shop by the independent artists of InDi RaDio: records, merch, gig tickets. Every purchase goes straight to the artist.",
    by: "By",
    empty: "Nothing in the shop yet.",
    viewArtistShop: "View the artist's shop",
  },
} as const;

function useItems() {
  return useQuery<GlobalShopItem[]>({
    queryKey: ["global-shop-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("artist_shop_items")
        .select(
          "id, title, format, image_url, summary, external_url, tags, cta_kind, created_at, artist:profiles!artist_shop_items_artist_id_fkey(id, pseudo, stage_name)",
        )
        .eq("is_visible", true)
        .eq("in_public_shop", true)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as GlobalShopItem[];
    },
  });
}

function ItemCard({ item, compact }: { item: GlobalShopItem; compact?: boolean }) {
  const txt = useShopTxt();
  const { lang } = useLang();
  const page = PAGE_TXT[lang === "en" ? "en" : "fr"];
  const artistName = item.artist ? item.artist.stage_name || item.artist.pseudo : null;
  return (
    <div className={`flex flex-col border-2 border-border p-2 ${compact ? "w-52 shrink-0" : ""}`}>
      {item.image_url ? (
        <SmartImg
          src={item.image_url}
          alt={item.title}
          width={400}
          height={400}
          className="aspect-square w-full border-2 border-border object-cover"
        />
      ) : (
        <div className="grid aspect-square w-full place-items-center border-2 border-border bg-muted text-muted-foreground">
          <ShoppingBag className="size-8" />
        </div>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-1">
        <span className="border border-border px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-muted-foreground">
          {item.format}
        </span>
        {(item.tags ?? []).map((tg) => (
          <span
            key={tg}
            className="border-2 border-border bg-primary px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest"
          >
            {tg}
          </span>
        ))}
      </div>
      <div className="mt-1 text-sm font-black">{item.title}</div>
      {item.artist && artistName && (
        <div className="text-xs text-muted-foreground">
          {page.by}{" "}
          <Link
            to="/u/$pseudo"
            params={{ pseudo: item.artist.pseudo }}
            hash="boutique"
            className="font-bold underline underline-offset-2 hover:text-primary"
          >
            {artistName}
          </Link>
        </div>
      )}
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
        <Button asChild size="sm" className="mt-2">
          <a href={item.external_url} target="_blank" rel="noopener noreferrer nofollow">
            <ExternalLink className="size-4" /> {shopCtaLabel(item.cta_kind, txt)}
          </a>
        </Button>
      )}
      {item.artist && (
        <Button asChild size="sm" variant="outline" className="mt-1.5">
          <Link to="/u/$pseudo" params={{ pseudo: item.artist.pseudo }} hash="boutique">
            <ShoppingBag className="size-4" /> {page.viewArtistShop}
          </Link>
        </Button>
      )}
    </div>
  );
}

function BoutiquePage() {
  const txt = useShopTxt();
  const { lang } = useLang();
  const page = PAGE_TXT[lang === "en" ? "en" : "fr"];
  const { data: items = [], isLoading } = useItems();
  const [format, setFormat] = useState<string | null>(null);

  const featured = items.filter((i) => (i.tags ?? []).length > 0);
  const availableFormats = SHOP_FORMATS.filter((f) => items.some((i) => i.format === f));
  const visible = format ? items.filter((i) => i.format === format) : items;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight">
          <ShoppingBag className="size-6" /> {page.title}
        </h1>
        <p className="text-sm text-muted-foreground">{page.intro}</p>
      </header>

      {isLoading ? null : items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{page.empty}</p>
      ) : (
        <>
          {featured.length > 0 && (
            <section className="card-brut p-3">
              <div className="mb-1.5 flex items-center gap-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Sparkles className="size-3.5" /> {txt.featured}
              </div>
              <div className="flex snap-x gap-3 overflow-x-auto pb-2">
                {featured.map((i) => (
                  <div key={i.id} className="snap-start">
                    <ItemCard item={i} compact />
                  </div>
                ))}
              </div>
            </section>
          )}

          {availableFormats.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={txt.filterLabel}>
              <span className="mr-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Filter className="size-3" /> {txt.filterLabel}
              </span>
              <button
                type="button"
                onClick={() => setFormat(null)}
                aria-pressed={format === null}
                className={
                  "rounded-full border-2 border-black px-2 py-0.5 text-[11px] font-semibold transition " +
                  (format === null
                    ? "bg-primary text-black shadow-[2px_2px_0_0_#000]"
                    : "bg-background hover:bg-muted")
                }
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
                      (active
                        ? "bg-primary text-black shadow-[2px_2px_0_0_#000]"
                        : "bg-background hover:bg-muted")
                    }
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
            <div className="space-y-5">
              {availableFormats
                .filter((f) => (format ? f === format : true))
                .map((f) => {
                  const group = visible.filter((i) => i.format === f);
                  if (group.length === 0) return null;
                  return (
                    <section key={f} className="card-brut p-3">
                      <h2 className="mb-2 flex items-center gap-2 text-sm font-black uppercase tracking-widest">
                        {f}
                        <span className="border border-border px-1.5 py-0.5 text-[9px] font-black text-muted-foreground">
                          {group.length}
                        </span>
                      </h2>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {group.map((i) => (
                          <ItemCard key={i.id} item={i} />
                        ))}
                      </div>
                    </section>
                  );
                })}
            </div>
          )}
        </>
      )}
    </div>
  );
}
