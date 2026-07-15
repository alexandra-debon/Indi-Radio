import { scanText, type MediaEmbed } from "@/lib/media-embed";
import { VideoPlayer } from "./VideoPlayer";
import { LinkPreviewCard } from "./LinkPreviewCard";

/**
 * Scan free text and render inline media (YouTube / Vimeo) + Open Graph preview
 * cards for other URLs. Non-media links stay inline in the original text.
 */
export function UrlEmbeds({
  text,
  compact = false,
  hidePreviews = false,
}: {
  text: string;
  compact?: boolean;
  hidePreviews?: boolean;
}) {
  const { media, other } = scanText(text || "");
  if (media.length === 0 && (hidePreviews || other.length === 0)) return null;

  return (
    <div className={compact ? "space-y-1.5" : "space-y-2"}>
      {media.map((m: MediaEmbed) => (
        <VideoPlayer key={`${m.kind}-${m.type}-${m.id}`} embed={m} />
      ))}
      {!hidePreviews && other.map((url) => <LinkPreviewCard key={url} url={url} />)}
    </div>
  );
}

export function ExplicitVideoEmbed({ url }: { url: string }) {
  // Renders a video from a single explicit URL (e.g. clip_entries.video_url).
  const { media } = scanText(url);
  const embed = media[0];
  if (!embed) return null;
  return <VideoPlayer embed={embed} />;
}