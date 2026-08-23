import { safeParseEmbedCode, embedAllowAttr } from "@/lib/embed-code";

/**
 * Rendu d'une intégration externe (Gamma, Canva, Spotify…) dans une iframe
 * sandboxée et responsive.
 *
 * Défense en profondeur :
 * - l'URL est re-validée ici (liste blanche d'hôtes, https forcé), même si
 *   elle vient de la base : une valeur non conforme n'est jamais rendue ;
 * - `sandbox` sans `allow-top-navigation` ni `allow-popups-to-escape-sandbox`
 *   ni `allow-downloads` : le contenu ne peut pas détourner la navigation ;
 * - `allow` est restreint par plateforme (pas de caméra/micro/géoloc) ;
 * - `referrerPolicy="no-referrer"` et `credentialless` évitent les fuites.
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
  const safe = safeParseEmbedCode(url);
  if (!safe) return null;

  const h = height && height > 0 ? Math.min(Math.max(height, 200), 2000) : null;
  return (
    <div className={`overflow-hidden rounded-md border-2 border-border bg-black/40 ${className}`}>
      <iframe
        src={safe.url}
        title={title}
        loading="lazy"
        referrerPolicy="no-referrer"
        {...({ credentialless: "true" } as Record<string, string>)}
        allow={embedAllowAttr(safe.url)}
        allowFullScreen
        sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-presentation"
        className="w-full"
        style={h ? { height: `${h}px` } : { aspectRatio: "16 / 9", height: "auto" }}
      />
    </div>
  );
}
