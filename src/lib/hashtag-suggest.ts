import { supabase } from "@/integrations/supabase/client";

export type HashtagSuggestion = { tag: string; count: number };

/**
 * Suggest existing hashtags whose lowercased text starts with `prefix`.
 * Scans up to 200 recent posts (title + content), aggregates counts client-side.
 * Prefix is optional — empty prefix returns the most popular tags overall.
 */
export async function suggestHashtags(
  prefix: string,
  opts: { limit?: number; signal?: AbortSignal } = {},
): Promise<HashtagSuggestion[]> {
  const limit = opts.limit ?? 6;
  const needle = prefix.trim().toLowerCase();
  const like = `%#${needle}%`;

  let req = supabase
    .from("posts")
    .select("content, title")
    .order("created_at", { ascending: false })
    .limit(200);

  // Narrow the scan when we have a prefix; otherwise take the recent window.
  if (needle.length > 0) {
    req = req.or(`content.ilike.${like},title.ilike.${like}`);
  }

  const { data, error } = await (opts.signal ? req.abortSignal(opts.signal) : req);
  if (error || !data) return [];

  const counts = new Map<string, number>();
  const re = /#([\p{L}\p{N}_.-]+)/gu;
  for (const row of data as Array<{ content: string | null; title: string | null }>) {
    const text = `${row.title ?? ""}\n${row.content ?? ""}`;
    for (const m of text.matchAll(re)) {
      const raw = m[1];
      const key = raw.toLowerCase();
      if (needle.length > 0 && !key.startsWith(needle)) continue;
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag))
    .slice(0, limit);
}