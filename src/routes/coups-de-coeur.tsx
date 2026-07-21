import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Heart, Disc3, Calendar } from "lucide-react";
import { ShareButton } from "@/components/share/ShareButton";
import { SocialLinksBar, type SocialLinks } from "@/components/social/SocialLinksBar";

type CoupRow = {
  id: string;
  featured_date: string;
  cover_url: string | null;
  artist: string;
  title: string;
  kind: string;
  comment: string;
  discovery_story: string | null;
  social_links: SocialLinks | null;
};

export const Route = createFileRoute("/coups-de-coeur")({
  head: () => ({
    meta: [
      { title: "Coups de Cœur InDi RaDiO — Découvertes musicales" },
      {
        name: "description",
        content:
          "Nos coups de cœur InDi RaDiO : artistes découverts, albums qui nous ont marqués, histoires de découverte et liens vers leurs plateformes.",
      },
      { property: "og:title", content: "Coups de Cœur InDi RaDiO" },
      {
        property: "og:description",
        content: "Découvertes musicales, artistes indépendants qu'on aime partager.",
      },
      { property: "og:type", content: "website" },
      {
        property: "og:url",
        content: "https://radio.indi-art-culture.com/coups-de-coeur",
      },
    ],
    links: [
      {
        rel: "canonical",
        href: "https://radio.indi-art-culture.com/coups-de-coeur",
      },
    ],
  }),
  component: CoupsDeCoeurPage,
});

function formatDate(d: string): string {
  try {
    return new Date(d).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  } catch {
    return d;
  }
}

function CoupsDeCoeurPage() {
  const { data: items = [], isLoading } = useQuery({
    queryKey: ["coups-de-coeur"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("coups_de_coeur" as any)
        .select(
          "id, featured_date, cover_url, artist, title, kind, comment, discovery_story, social_links",
        )
        .eq("published", true)
        .order("featured_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CoupRow[];
    },
  });

  return (
    <div className="space-y-4">
      <header className="space-y-1">
        <h1 className="section-title flex items-center gap-2">
          <Heart className="size-6 fill-primary text-primary" />
          Coups de Cœur InDi RaDiO
        </h1>
        <p className="text-sm text-muted-foreground">
          Nos découvertes, nos histoires de rencontre avec des artistes indépendants.
        </p>
      </header>

      {isLoading && (
        <div className="card-brut p-4 text-sm text-muted-foreground">
          Chargement…
        </div>
      )}

      {!isLoading && items.length === 0 && (
        <div className="card-brut p-6 text-center text-sm text-muted-foreground">
          Aucun coup de cœur pour l'instant. Reviens vite !
        </div>
      )}

      <ul className="space-y-4">
        {items.map((c) => (
          <li key={c.id} className="card-brut relative p-4">
            <div className="absolute right-3 top-3 z-10">
              <ShareButton
                target={{
                  url: "/coups-de-coeur",
                  title: `Coup de cœur InDi RaDiO : ${c.title} — ${c.artist}`,
                  text: c.comment.slice(0, 180),
                }}
                className="bg-background/80 backdrop-blur"
              />
            </div>

            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="w-full shrink-0 sm:w-48">
                <div className="aspect-square overflow-hidden rounded-md bg-muted">
                  {c.cover_url ? (
                    <img
                      src={c.cover_url}
                      alt={`${c.title} — ${c.artist}`}
                      className="size-full object-cover"
                      loading="lazy"
                    />
                  ) : (
                    <div className="grid size-full place-items-center">
                      <Disc3 className="size-12 text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                  <Calendar className="size-3.5" />
                  <time dateTime={c.featured_date}>
                    {formatDate(c.featured_date)}
                  </time>
                </div>
              </div>

              <div className="min-w-0 flex-1 space-y-3">
                <div>
                  <div className="text-xs font-bold uppercase tracking-widest text-primary">
                    {c.kind === "single"
                      ? "Chanson"
                      : c.kind === "ep"
                        ? "EP"
                        : "Album"}
                  </div>
                  <h2 className="text-xl font-bold leading-tight">{c.title}</h2>
                  <div className="text-sm text-muted-foreground">
                    par <span className="font-medium text-foreground">{c.artist}</span>
                  </div>
                </div>

                <div className="whitespace-pre-wrap text-sm leading-relaxed">
                  {c.comment}
                </div>

                {c.discovery_story && (
                  <div className="rounded-md border-l-4 border-primary bg-muted/40 p-3">
                    <div className="mb-1 text-[10px] font-bold uppercase tracking-widest text-primary">
                      Comment on l'a découvert·e
                    </div>
                    <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
                      {c.discovery_story}
                    </div>
                  </div>
                )}

                {c.social_links && (
                  <SocialLinksBar links={c.social_links} className="pt-1" />
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}