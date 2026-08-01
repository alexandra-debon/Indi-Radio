import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ListMusic } from "lucide-react";
import { PlaylistEmbedPair } from "@/components/playlists/PlaylistEmbedPair";
import { SpotifyNotice, useSpotifyNotice } from "@/components/playlists/SpotifyNotice";
import { TranslatedText } from "@/components/i18n/TranslatedText";
import { useLang } from "@/lib/i18n";
import { ShareButton } from "@/components/share/ShareButton";
import { renderRich } from "@/lib/rich-text";
import { canonicalUrl } from "@/lib/canonical";

function plainText(html: string | null | undefined, fallback: string): string {
  if (!html) return fallback;
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text ? text.slice(0, 155) : fallback;
}

export const Route = createFileRoute("/playlists/$slug")({
  loader: async ({ params }) => {
    const { data, error } = await supabase
      .from("playlist_entries")
      .select("*")
      .eq("slug", params.slug)
      .eq("is_published", true)
      .maybeSingle();
    if (error) throw error;
    if (!data) throw notFound();
    return data;
  },
  head: ({ loaderData, params }) => {
    if (!loaderData) {
      return {
        meta: [
          { title: "Playlist introuvable — InDi RaDio" },
          { name: "robots", content: "noindex" },
        ],
      };
    }
    const title = `${loaderData.title} — Playlist InDi RaDio, la radio 24/7 de la musique indépendante`;
    const description = plainText(
      loaderData.description,
      `Écoutez la playlist « ${loaderData.title} » de InDi RaDio, la radio 24/7 de la musique indépendante, sur Spotify et Apple Music.`,
    );
    const url = canonicalUrl(`/playlists/${params.slug}`);
    return {
      meta: [
        { title },
        { name: "description", content: description },
        { property: "og:title", content: title },
        { property: "og:description", content: description },
        { property: "og:type", content: "music.playlist" },
        { property: "og:url", content: url },
        { name: "twitter:card", content: "summary_large_image" },
        { name: "twitter:title", content: title },
        { name: "twitter:description", content: description },
      ],
      links: [{ rel: "canonical", href: url }],
      scripts: [
        {
          type: "application/ld+json",
          children: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "MusicPlaylist",
            name: loaderData.title,
            description,
            url,
          }),
        },
      ],
    };
  },
  component: PlaylistDetail,
});

function PlaylistDetail() {
  const row = Route.useLoaderData();
  const { slug } = Route.useParams();
  const { lang } = useLang();
  const { open, setOpen } = useSpotifyNotice();

  const manualTitle = lang === "en" ? row.title_en?.trim() : null;
  const manualDescription = lang === "en" ? row.description_en?.trim() : null;
  const title = manualTitle || row.title;

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-3 py-6 sm:px-6">
      <SpotifyNotice open={open} onOpenChange={setOpen} />

      <Link to="/playlists" className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground">
        <ArrowLeft className="size-3.5" /> Toutes les playlists
      </Link>

      <header className="flex items-start justify-between gap-3">
        <h1 className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight text-primary">
          <ListMusic className="size-6" />
          {manualTitle ? (
            <span>{manualTitle}</span>
          ) : (
            <TranslatedText entityType="playlist_entries" entityKey={row.id} field="title" text={row.title} as="span" />
          )}
        </h1>
        <ShareButton
          variant="chip"
          target={{
            url: canonicalUrl(`/playlists/${slug}`),
            title: `${title} — Playlist InDi RaDio`,
            text: plainText(manualDescription || row.description, title),
          }}
        />
      </header>

      {manualDescription ? (
        <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
          {renderRich(manualDescription)}
        </div>
      ) : row.description ? (
        <TranslatedText entityType="playlist_entries" entityKey={row.id} field="description" text={row.description}>
          {(rendered) => (
            <div className="whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {renderRich(rendered)}
            </div>
          )}
        </TranslatedText>
      ) : null}

      <PlaylistEmbedPair title={title} spotify={row.spotify_embed} apple={row.apple_embed} />
    </div>
  );
}
