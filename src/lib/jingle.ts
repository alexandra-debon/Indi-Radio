/** True when the artist or title explicitly mentions "jingle" (whole word). */
export function isJingleTrack(t: { artist?: string | null; title?: string | null }): boolean {
  const s = `${t.artist ?? ""} ${t.title ?? ""}`
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
  return /\bjingles?\b/.test(s);
}
