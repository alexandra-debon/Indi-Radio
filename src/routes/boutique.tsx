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
    introLead:
      "Les objets mis en boutique publique par les artistes indépendants d'InDi RaDio : disques, merch, billets de concert.",
    introBefore: "Chaque achat que vous effectuez va à ",
    introHighlight: "100\u00A0% directement à l'artiste",
    introAfter:
      ", sans la moindre retenue, via ses propres liens de paiement.",
    introThanks: "Merci de soutenir la culture indépendante et ses artistes !",
    by: "Par",
    empty: "Aucun objet en boutique pour le moment.",
    viewArtistShop: "Voir la boutique de l'artiste",
    allArtists: "Tous les artistes",
    filterArtist: "Artiste",
  },
  en: {
    title: "InDi Artists Shop",
    introLead:
      "Items put in the public shop by the independent artists of InDi RaDio: records, merch, gig tickets.",
    introBefore: "Every purchase you make goes ",
    introHighlight: "100% straight to the artist",
    introAfter: ", with no deduction at all, through the artist's own payment links.",
    introThanks: "Thank you for supporting independent culture and its artists!",
    by: "By",
    empty: "Nothing in the shop yet.",
    viewArtistShop: "View the artist's shop",
    allArtists: "All artists",
    filterArtist: "Artist",
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
    <div
      className={`flex min-w-0 flex-col border-2 border-border p-1.5 sm:p-2 ${
        compact ? "w-40 shrink-0 sm:w-52" : ""
      }`}
    >
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
      <div className="mt-1 truncate text-xs font-black sm:text-sm">{item.title}</div>
      {item.artist && artistName && (
        <div className="truncate text-[11px] text-muted-foreground sm:text-xs">
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
          className="mt-1 hidden line-clamp-4 whitespace-pre-wrap text-xs text-muted-foreground sm:block"
          entityType="shop_item"
          entityKey={item.id}
          field="summary"
          text={item.summary}
          manual={false}
        />
      )}
      {item.external_url && (
        <Button asChild size="sm" className="mt-2 h-7 px-1.5 text-[10px] sm:h-8 sm:px-3 sm:text-xs">
          <a href={item.external_url} target="_blank" rel="noopener noreferrer nofollow">
            <ExternalLink className="size-3 shrink-0 sm:size-4" />
            <span className="truncate">{shopCtaLabel(item.cta_kind, txt)}</span>
          </a>
        </Button>
      )}
      {item.artist && (
        <Button
          asChild
          size="sm"
          variant="outline"
          className="mt-1.5 h-7 px-1.5 text-[10px] sm:h-8 sm:px-3 sm:text-xs"
        >
          <Link to="/u/$pseudo" params={{ pseudo: item.artist.pseudo }} hash="boutique">
            <ShoppingBag className="size-3 shrink-0 sm:size-4" />
            <span className="truncate">{page.viewArtistShop}</span>
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
  const [artistId, setArtistId] = useState<string | null>(null);

  const artists = Array.from(
    new Map(
      items
        .filter((i) => i.artist)
        .map((i) => [i.artist!.id, i.artist!.stage_name || i.artist!.pseudo]),
    ).entries(),
  ).sort((a, b) => a[1].localeCompare(b[1], "fr"));

  const byArtist = artistId ? items.filter((i) => i.artist?.id === artistId) : items;
  const featured = byArtist.filter((i) => (i.tags ?? []).length > 0);
  const extraFormats = Array.from(new Set(byArtist.map((i) => i.format))).filter(
    (f) => !SHOP_FORMATS.includes(f as (typeof SHOP_FORMATS)[number]),
  );
  const availableFormats = [
    ...SHOP_FORMATS.filter((f) => byArtist.some((i) => i.format === f)),
    ...extraFormats,
  ];
  const visible = format ? byArtist.filter((i) => i.format === format) : byArtist;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight">
          <ShoppingBag className="size-6" /> {page.title}
        </h1>
        <div className="space-y-1.5 text-sm leading-relaxed text-muted-foreground">
          <p>{page.introLead}</p>
          <p>
            {page.introBefore}
            <span className="font-black text-radio-yellow">{page.introHighlight}</span>
            {page.introAfter}
          </p>
          <p className="font-black text-foreground">{page.introThanks}</p>
        </div>
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

          {artists.length > 1 && (
            <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={page.filterArtist}>
              <span className="mr-1 flex items-center gap-1 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
                <Filter className="size-3" /> {page.filterArtist}
              </span>
              <button
                type="button"
                onClick={() => setArtistId(null)}
                aria-pressed={artistId === null}
                className={
                  "rounded-full border-2 border-black px-2 py-0.5 text-[11px] font-semibold transition " +
                  (artistId === null
                    ? "bg-primary text-black shadow-[2px_2px_0_0_#000]"
                    : "bg-background hover:bg-muted")
                }
              >
                {page.allArtists}
              </button>
              {artists.map(([id, name]) => {
                const active = artistId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setArtistId(active ? null : id)}
                    aria-pressed={active}
                    className={
                      "rounded-full border-2 border-black px-2 py-0.5 text-[11px] font-semibold transition " +
                      (active
                        ? "bg-primary text-black shadow-[2px_2px_0_0_#000]"
                        : "bg-background hover:bg-muted")
                    }
                  >
                    {name}
                  </button>
                );
              })}
            </div>
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
                      <div className="grid grid-cols-3 gap-2 sm:gap-3">
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
