import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ShieldAlert, Loader2, ShoppingCart, ExternalLink } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { useLang } from "@/lib/i18n";

export const Route = createFileRoute("/_authenticated/admin/achats")({
  head: () => ({
    meta: [{ title: "Achats — Admin" }, { name: "robots", content: "noindex" }],
  }),
  component: AdminPurchasesPage,
});

type ClickEvent = {
  id: string;
  created_at: string;
  item_title: string;
  artist_pseudo: string | null;
  artist_id: string | null;
  cta_kind: string;
  format: string | null;
  external_url: string | null;
  source: string;
};

const TXT = {
  fr: {
    title: "Achats — clics boutique",
    intro: "Chaque clic sur un bouton d'achat, de pré-commande ou de billet.",
    search: "Rechercher un objet, un artiste…",
    empty: "Aucun clic enregistré pour le moment.",
    denied: "Réservé à l'équipe.",
    count: (n: number) => `${n} clic${n > 1 ? "s" : ""}`,
    date: "Date",
    item: "Objet",
    artist: "Artiste",
    action: "Action",
    link: "Lien",
    open: "Ouvrir",
    source: "Origine",
    unknownArtist: "Artiste inconnu",
    cta: { buy: "Acheter", preorder: "Pré-commande", ticket: "Billet" } as Record<string, string>,
    src: { artist: "Page artiste", boutique: "Boutique InDi" } as Record<string, string>,
  },
  en: {
    title: "Purchases — shop clicks",
    intro: "Every click on a buy, pre-order or ticket button.",
    search: "Search an item, an artist…",
    empty: "No click recorded yet.",
    denied: "Team only.",
    count: (n: number) => `${n} click${n > 1 ? "s" : ""}`,
    date: "Date",
    item: "Item",
    artist: "Artist",
    action: "Action",
    link: "Link",
    open: "Open",
    source: "Source",
    unknownArtist: "Unknown artist",
    cta: { buy: "Buy", preorder: "Pre-order", ticket: "Ticket" } as Record<string, string>,
    src: { artist: "Artist page", boutique: "InDi shop" } as Record<string, string>,
  },
};

function AdminPurchasesPage() {
  const { isAdmin } = useAuth();
  const { lang } = useLang();
  const txt = TXT[lang === "en" ? "en" : "fr"];
  const [search, setSearch] = useState("");

  const { data: events = [], isLoading } = useQuery<ClickEvent[]>({
    queryKey: ["admin-shop-clicks"],
    enabled: isAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("shop_click_events")
        .select("id, created_at, item_title, artist_pseudo, artist_id, cta_kind, format, external_url, source")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ClickEvent[];
    },
  });

  const { data: artists = {} } = useQuery<Record<string, string>>({
    queryKey: ["admin-shop-clicks-artists", events.map((e) => e.artist_id).join(",")],
    enabled: isAdmin && events.length > 0,
    queryFn: async () => {
      const ids = Array.from(new Set(events.map((e) => e.artist_id).filter(Boolean))) as string[];
      if (ids.length === 0) return {};
      const { data, error } = await supabase.from("profiles").select("id, pseudo, stage_name").in("id", ids);
      if (error) throw error;
      const map: Record<string, string> = {};
      for (const p of data ?? []) map[p.id] = p.pseudo;
      return map;
    },
  });

  if (!isAdmin) {
    return (
      <div className="mx-auto max-w-3xl p-4">
        <p className="flex items-center gap-2 text-sm text-destructive">
          <ShieldAlert className="size-4" /> {txt.denied}
        </p>
      </div>
    );
  }

  const q = search.trim().toLowerCase();
  const rows = q
    ? events.filter((e) =>
        [e.item_title, e.artist_pseudo ?? "", artists[e.artist_id ?? ""] ?? "", e.format ?? ""]
          .join(" ")
          .toLowerCase()
          .includes(q),
      )
    : events;

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-lg font-black uppercase tracking-wide">
          <ShoppingCart className="size-5" /> {txt.title}
        </h1>
        <p className="text-xs text-muted-foreground">{txt.intro}</p>
      </header>

      <div className="flex items-center gap-2">
        <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder={txt.search} className="h-9" />
        <span className="whitespace-nowrap text-xs font-bold text-muted-foreground">{txt.count(rows.length)}</span>
      </div>

      {isLoading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="size-4 animate-spin" /> …
        </p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-muted-foreground">{txt.empty}</p>
      ) : (
        <div className="overflow-x-auto border-2 border-border">
          <table className="w-full min-w-[720px] text-left text-xs">
            <thead className="bg-muted text-[10px] font-black uppercase tracking-widest">
              <tr>
                <th className="p-2">{txt.date}</th>
                <th className="p-2">{txt.item}</th>
                <th className="p-2">{txt.artist}</th>
                <th className="p-2">{txt.action}</th>
                <th className="p-2">{txt.source}</th>
                <th className="p-2">{txt.link}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((e) => {
                const pseudo = artists[e.artist_id ?? ""] ?? e.artist_pseudo;
                return (
                  <tr key={e.id} className="border-t border-border align-top">
                    <td className="whitespace-nowrap p-2 text-muted-foreground">
                      {new Date(e.created_at).toLocaleString(lang === "en" ? "en-GB" : "fr-FR")}
                    </td>
                    <td className="p-2 font-bold">
                      {e.item_title}
                      {e.format && <span className="ml-1 text-[10px] text-muted-foreground">({e.format})</span>}
                    </td>
                    <td className="p-2">
                      {pseudo ? (
                        <Link
                          to="/u/$pseudo"
                          params={{ pseudo }}
                          hash="boutique"
                          className="font-bold underline underline-offset-2 hover:text-primary"
                        >
                          {pseudo}
                        </Link>
                      ) : (
                        <span className="text-muted-foreground">{txt.unknownArtist}</span>
                      )}
                    </td>
                    <td className="p-2">{txt.cta[e.cta_kind] ?? e.cta_kind}</td>
                    <td className="p-2 text-muted-foreground">{txt.src[e.source] ?? e.source}</td>
                    <td className="max-w-[220px] p-2">
                      {e.external_url ? (
                        <a
                          href={e.external_url}
                          target="_blank"
                          rel="noopener noreferrer nofollow"
                          className="flex items-center gap-1 truncate underline underline-offset-2 hover:text-primary"
                        >
                          <ExternalLink className="size-3 shrink-0" />
                          <span className="truncate">{txt.open}</span>
                        </a>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
