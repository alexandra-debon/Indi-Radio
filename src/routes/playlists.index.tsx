import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { PlaylistEmbedPair } from "@/components/playlists/PlaylistEmbedPair";
import { SpotifyNotice, useSpotifyNotice } from "@/components/playlists/SpotifyNotice";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { useLang } from "@/lib/i18n";
import { ShareButton } from "@/components/share/ShareButton";
import { renderRich } from "@/lib/rich-text";
import { canonicalUrl } from "@/lib/canonical";
import { Info, ListMusic, Sparkles, Star } from "lucide-react";

const TITLE = "Playlists InDi RaDio — Radio 24/7 de la musique indépendante";
const DESCRIPTION =
  "IndéGraal, InDiscovery et playlists thématiques : les sélections de InDi RaDio, la radio 24/7 de la musique indépendante, à écouter sur Spotify et Apple Music.";

export const Route = createFileRoute("/playlists/")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESCRIPTION },
      { name: "keywords", content: "playlists musique indé, IndéGraal, InDiscovery, playlist Spotify, playlist Apple Music, InDi RaDio" },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESCRIPTION },
      { property: "og:url", content: canonicalUrl("/playlists") },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
      { name: "twitter:title", content: TITLE },
      { name: "twitter:description", content: DESCRIPTION },
    ],
    links: [{ rel: "canonical", href: canonicalUrl("/playlists") }],
  }),
  component: PlaylistsPage,
});

interface PlaylistRow {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  title_en: string | null;
  description_en: string | null;
  category: string;
  year: number | null;
  spotify_embed: string | null;
  apple_embed: string | null;
  position: number;
  is_published: boolean;
}

function PlaylistCard({ row, featured = false }: { row: PlaylistRow; featured?: boolean }) {
  const { lang } = useLang();
  // Version manuelle saisie par l'admin pour la langue active : elle a priorité
  // sur la traduction automatique.
  const manualTitle = lang === "en" ? row.title_en?.trim() : null;
  const manualDescription = lang === "en" ? row.description_en?.trim() : null;
  const title = manualTitle || row.title;

  return (
    <article
      id={`playlist-${row.slug}`}
      className={`card-brut scroll-mt-24 space-y-3 p-4 ${featured ? "border-2 border-primary" : ""}`}
    >
      <header className="flex items-start justify-between gap-2">
        <h3 className={featured ? "text-xl font-black uppercase tracking-tight text-primary" : "text-base font-bold"}>
          <Link to="/playlists/$slug" params={{ slug: row.slug }} className="hover:underline">
            {manualTitle ? (
              <span>{manualTitle}</span>
            ) : (
              <TranslatedText entityType="playlist_entries" entityKey={row.id} field="title" text={row.title} as="span" />
            )}
          </Link>
        </h3>
        <ShareButton
          target={{
            url: canonicalUrl(`/playlists/${row.slug}`),
            title: `${title} — Playlists InDi RaDio`,
            text: manualDescription || row.description || DESCRIPTION,
          }}
        />
      </header>

      {manualDescription ? (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {renderRich(manualDescription)}
        </div>
      ) : row.description ? (
        <TranslatedText
          entityType="playlist_entries"
          entityKey={row.id}
          field="description"
          text={row.description}
        >
          {(rendered) => (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {renderRich(rendered)}
            </div>
          )}
        </TranslatedText>
      ) : null}

      <PlaylistEmbedPair title={title} spotify={row.spotify_embed} apple={row.apple_embed} />
    </article>
  );
}

function PlaylistsPage() {
  const { open, setOpen } = useSpotifyNotice();

  const { data: rows = [], isLoading } = useQuery({
    queryKey: ["playlist-entries"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("playlist_entries")
        .select("*")
        .eq("is_published", true)
        .order("position", { ascending: true })
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as PlaylistRow[];
    },
  });

  const graal = rows.filter((r) => r.category === "indegraal");
  const discovery = rows.filter((r) => r.category === "indiscovery");
  const themed = rows.filter((r) => r.category === "thematique");

  const years = useMemo(
    () => Array.from(new Set(discovery.map((r) => r.year ?? 0))).sort((a, b) => b - a),
    [discovery],
  );
  const [activeYear, setActiveYear] = useState<number | null>(null);
  const currentYear = activeYear ?? years[0] ?? null;

  return (
    <div className="mx-auto max-w-4xl space-y-8 px-3 py-6 sm:px-6">
      <SpotifyNotice open={open} onOpenChange={setOpen} />

      <header className="space-y-2">
        <h1 className="section-title flex items-center gap-2">
          <ListMusic className="size-6 text-primary" /> Playlists InDi RaDio
        </h1>
        <p className="text-sm text-muted-foreground">
          Les sélections de la radio 24/7 de la musique indépendante, disponibles sur Spotify et Apple Music.
        </p>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement des playlists…</p>}

      {graal.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <Star className="size-4" /> IndéGraal
          </h2>
          {graal.map((r) => <PlaylistCard key={r.id} row={r} featured />)}
        </section>
      )}

      {discovery.length > 0 && (
        <section className="space-y-3">
          <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-primary">
            <Sparkles className="size-4" /> InDiscovery
          </h2>
          {years.length > 1 && (
            <div className="flex flex-wrap gap-2">
              {years.map((y) => (
                <button
                  key={y}
                  onClick={() => setActiveYear(y)}
                  className={`rounded-full border px-3 py-1 text-xs font-bold transition ${
                    y === currentYear ? "border-primary bg-primary/10 text-primary" : "border-border hover:bg-muted"
                  }`}
                >
                  {y || "—"}
                </button>
              ))}
            </div>
          )}
          {discovery
            .filter((r) => (r.year ?? 0) === currentYear)
            .map((r) => <PlaylistCard key={r.id} row={r} />)}
        </section>
      )}

      {themed.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-widest text-primary">Playlists thématiques</h2>
          <div className="grid grid-cols-1 gap-4">
            {themed.map((r) => <PlaylistCard key={r.id} row={r} />)}
          </div>
        </section>
      )}

      {!isLoading && rows.length === 0 && (
        <p className="text-sm text-muted-foreground">Les playlists arrivent très bientôt.</p>
      )}

      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground"
      >
        <Info className="size-3.5" /> Lire notre message au sujet de Spotify
      </button>
    </div>
  );
}