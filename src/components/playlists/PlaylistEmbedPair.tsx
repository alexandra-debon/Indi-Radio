import { extractEmbedUrl } from "@/lib/playlist-embed";

function EmbedFrame({
  src,
  title,
  platform,
}: {
  src: string;
  title: string;
  platform: "spotify" | "apple";
}) {
  return (
    <div className="min-w-0 flex-1 space-y-1.5">
      <div className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {platform === "spotify" ? "Spotify" : "Apple Music"}
      </div>
      <iframe
        src={src}
        title={title}
        loading="lazy"
        className="h-[380px] w-full rounded-lg border border-border bg-muted/30"
        allow="autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation"
      />
    </div>
  );
}

/**
 * Rend les deux lecteurs (Spotify + Apple Music) d'une même playlist,
 * côte à côte sur desktop et empilés sur mobile.
 */
export function PlaylistEmbedPair({
  title,
  spotify,
  apple,
}: {
  title: string;
  spotify?: string | null;
  apple?: string | null;
}) {
  const spotifyUrl = extractEmbedUrl(spotify, "spotify");
  const appleUrl = extractEmbedUrl(apple, "apple");

  if (!spotifyUrl && !appleUrl) {
    return (
      <p className="rounded-lg border border-dashed border-border p-4 text-xs text-muted-foreground">
        Aucun lecteur disponible pour cette playlist.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-4 md:flex-row">
      {spotifyUrl && <EmbedFrame src={spotifyUrl} title={`${title} — Spotify`} platform="spotify" />}
      {appleUrl && <EmbedFrame src={appleUrl} title={`${title} — Apple Music`} platform="apple" />}
    </div>
  );
}