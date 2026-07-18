import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Disc3, Star } from "lucide-react";
import { ShareButton } from "@/components/share/ShareButton";
import { ContentLikeButton } from "@/components/content/ContentReactions";
import ogChroniques from "@/assets/og-chroniques.jpg";

const OG_CHRONIQUES = `https://radio.indi-art-culture.com${ogChroniques}`;

export const Route = createFileRoute("/chroniques")({
  head: () => ({
    meta: [
      { title: "Chroniques d'albums indépendants — Indi Radio" },
      { name: "description", content: "Chroniques d'albums de la scène indépendante française : découverte musicale, nouvelles sorties, artistes émergents. Résumés, notes et liens d'écoute." },
      { property: "og:title", content: "Chroniques d'albums indépendants — Indi Radio" },
      { property: "og:description", content: "Découverte musicale : chroniques d'albums de la scène indé française par la rédaction d'Indi Radio." },
      { property: "og:type", content: "website" },
      { property: "og:url", content: "https://radio.indi-art-culture.com/chroniques" },
      { property: "og:image", content: OG_CHRONIQUES },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:image", content: OG_CHRONIQUES },
    ],
    links: [{ rel: "canonical", href: "https://radio.indi-art-culture.com/chroniques" }],
  }),
  component: ChroniquesPage,
});

function ChroniquesPage() {
  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["album-reviews"],
    queryFn: async () => {
      const { data } = await supabase
        .from("album_reviews")
        .select("id, slug, title, artist, label, cover_url, release_date, rating, excerpt, created_at")
        .eq("published", true)
        .order("created_at", { ascending: false });
      return data ?? [];
    },
  });

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="section-title">Chroniques d'albums</h1>
        <p className="text-sm text-muted-foreground">
          Découverte musicale — nos chroniques d'albums de la scène indépendante française. Résumés, notes et liens pour écouter.
        </p>
      </header>

      {isLoading && <div className="card-brut p-4 text-sm text-muted-foreground">Chargement…</div>}

      {!isLoading && reviews.length === 0 && (
        <div className="card-brut p-4 text-center text-sm text-muted-foreground">
          Aucune chronique publiée pour le moment. Reviens bientôt.
        </div>
      )}

      <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {reviews.map((r) => (
          <li key={r.id} className="relative">
            <div className="absolute right-2 top-2 z-10 flex items-center gap-1">
              <ContentLikeButton contentType="album_review" contentId={r.id} />
              <ShareButton
                target={{
                  url: `/chroniques/${r.slug}`,
                  title: `${r.title} — ${r.artist} · Chronique Indi Radio`,
                  text: r.excerpt ?? `Chronique de ${r.title} par ${r.artist}`,
                }}
                className="bg-background/80 backdrop-blur"
              />
            </div>
            <Link
              to="/chroniques/$slug"
              params={{ slug: r.slug }}
              className="card-brut flex h-full gap-3 overflow-hidden p-2 transition hover:bg-muted"
            >
              <div className="size-24 shrink-0 overflow-hidden rounded bg-muted">
                {r.cover_url ? (
                  <img src={r.cover_url} alt={`Pochette de ${r.title} par ${r.artist}`} className="size-full object-cover" loading="lazy" />
                ) : (
                  <div className="grid size-full place-items-center">
                    <Disc3 className="size-8 text-muted-foreground" />
                  </div>
                )}
              </div>
              <div className="flex min-w-0 flex-1 flex-col">
                <div className="truncate text-sm font-bold">{r.title}</div>
                <div className="truncate text-xs text-muted-foreground">
                  {r.artist}{r.label ? ` · ${r.label}` : ""}
                </div>
                {r.rating != null && (
                  <div className="mt-1 flex items-center gap-1 text-xs text-primary">
                    <Star className="size-3 fill-primary" />
                    <span>{Number(r.rating).toFixed(1)}/5</span>
                  </div>
                )}
                {r.excerpt && (
                  <p className="mt-1 line-clamp-3 text-xs text-muted-foreground">{r.excerpt}</p>
                )}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}