import { createServerFn } from "@tanstack/react-start";
import { RADIO_CONFIG } from "@/config/radio";

/**
 * Scrape Icecast status-json.xsl and upsert the current track into track_history.
 * Public endpoint (no auth) — called by the client every 30s while listening.
 * De-duplicates: only inserts when title/artist changes vs the last row.
 */
export const scrapeCurrentTrack = createServerFn({ method: "POST" }).handler(async () => {
  const res = await fetch(RADIO_CONFIG.statusJsonUrl, {
    headers: { accept: "application/json" },
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
  if (!res || !res.ok) return { ok: false, reason: "fetch_failed" as const };

  const json = (await res.json().catch(() => null)) as any;
  const src = json?.icestats?.source;
  const source = Array.isArray(src) ? src[0] : src;
  const raw: string | undefined = source?.title ?? source?.yp_currently_playing;
  if (!raw || typeof raw !== "string") return { ok: false, reason: "no_title" as const };

  // "Artist - Title" convention; fallback: whole string as title
  const idx = raw.indexOf(" - ");
  const artist = idx > 0 ? raw.slice(0, idx).trim() : "Inconnu";
  const title = idx > 0 ? raw.slice(idx + 3).trim() : raw.trim();
  if (!title) return { ok: false, reason: "empty" as const };

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: last } = await supabaseAdmin
    .from("track_history")
    .select("id,title,artist")
    .order("played_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (last && last.title === title && last.artist === artist) {
    return { ok: true, changed: false as const };
  }

  const { error } = await supabaseAdmin.from("track_history").insert({ title, artist });
  if (error) return { ok: false, reason: error.message };
  return { ok: true, changed: true as const, title, artist };
});