/**
 * Configuration centralisée de la radio Indi Radio.
 * Ne PAS coder ces valeurs en dur ailleurs dans le projet.
 *
 * Note ATS iOS : ce flux est en HTTP non chiffré. Pour un futur wrapper natif
 * (Capacitor / React Native), ajouter une exception ATS ciblée uniquement sur
 * `ecmanager6.pro-fhi.net` (NSExceptionDomains). Ne JAMAIS activer
 * NSAllowsArbitraryLoads globalement (rejeté par la review App Store).
 */

export const RADIO_CONFIG = {
  streamUrl: "http://ecmanager6.pro-fhi.net:2180/stream",
  statusPageUrl: "http://ecmanager6.pro-fhi.net:2180/",
  // Endpoint Icecast metadata (best-effort ; peut ne pas répondre en HTTPS)
  statusJsonUrl: "http://ecmanager6.pro-fhi.net:2180/status-json.xsl",
  stationName: "Indi Radio",
  parentStructure: "InDi ArT CulTuRe",
} as const;