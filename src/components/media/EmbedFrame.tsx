/**
 * Rendu d'une intégration externe (Gamma, Canva, Spotify…) dans une iframe
 * sandboxée et responsive. L'URL est déjà validée par `parseEmbedCode`.
 */
export function EmbedFrame({
  url,
  height,
  title = "Contenu intégré",
  className = "",
}: {
  url: string;
  height?: number | null;
  title?: string;
  className?: string;
}) {
  const h = height && height > 0 ? Math.min(Math.max(height, 200), 2000) : null;
  return (
    <div className={`overflow-hidden rounded-md border-2 border-border bg-black/40 ${className}`}>
      <iframe
        src={url}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; fullscreen; picture-in-picture"
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-forms allow-presentation"
        className="w-full"
        style={h ? { height: `${h}px` } : { aspectRatio: "16 / 9", height: "auto" }}
      />
    </div>
  );
}
