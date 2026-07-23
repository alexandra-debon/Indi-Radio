import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { BASE_URL, sitemapHeaders, matchesConditional } from "@/lib/sitemap-entries";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function youtubeId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^www\./, "");
    if (host === "youtu.be") return u.pathname.slice(1).split("/")[0] || null;
    if (host.endsWith("youtube.com")) {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/);
      if (m) return m[1];
    }
  } catch {
    /* ignore */
  }
  return null;
}

function vimeoId(url: string | null | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!u.hostname.includes("vimeo.com")) return null;
    const m = u.pathname.match(/\/(\d+)/);
    return m ? m[1] : null;
  } catch {
    return null;
  }
}

interface VideoNode {
  loc: string;
  title: string;
  description: string;
  thumbnail: string;
  contentLoc?: string;
  playerLoc?: string;
  publicationDate: string;
}

function firstUrl(row: {
  video_url: string | null;
  video_urls: string[] | null;
  playlist_url: string | null;
}): string | null {
  if (row.video_url && row.video_url.trim()) return row.video_url.trim();
  if (Array.isArray(row.video_urls) && row.video_urls.length > 0) {
    const first = row.video_urls.find((u) => u && u.trim());
    if (first) return first.trim();
  }
  if (row.playlist_url && row.playlist_url.trim()) return row.playlist_url.trim();
  return null;
}

function buildVideo(row: {
  id: string;
  title: string;
  body: string | null;
  video_url: string | null;
  video_urls: string[] | null;
  playlist_url: string | null;
  created_at: string;
  updated_at: string;
}): VideoNode | null {
  const source = firstUrl(row);
  if (!source) return null;
  const ytId = youtubeId(source);
  const vmId = vimeoId(source);
  let thumbnail: string | null = null;
  let playerLoc: string | null = null;
  let contentLoc: string | null = null;

  if (ytId) {
    thumbnail = `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`;
    playerLoc = `https://www.youtube.com/embed/${ytId}`;
  } else if (vmId) {
    thumbnail = `https://vumbnail.com/${vmId}.jpg`;
    playerLoc = `https://player.vimeo.com/video/${vmId}`;
  } else if (/\.(mp4|webm|mov)(\?|$)/i.test(source)) {
    contentLoc = source;
    thumbnail = `${BASE_URL}/icons/apple-touch-icon.png`;
  }

  if (!thumbnail || (!playerLoc && !contentLoc)) return null;

  const description = (row.body?.trim() || row.title).slice(0, 2048);
  return {
    loc: `${BASE_URL}/clips/${row.id}`,
    title: row.title.slice(0, 100),
    description,
    thumbnail,
    contentLoc: contentLoc ?? undefined,
    playerLoc: playerLoc ?? undefined,
    publicationDate: new Date(row.created_at).toISOString(),
  };
}

async function collect(): Promise<{ videos: VideoNode[]; lastMod: string }> {
  let lastMod = new Date(0).toISOString();
  try {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );
    const { data } = await sb
      .from("clip_entries")
      .select("id,title,body,video_url,video_urls,playlist_url,created_at,updated_at")
      .order("updated_at", { ascending: false })
      .limit(5000);

    const videos: VideoNode[] = [];
    for (const row of data ?? []) {
      const v = buildVideo(row);
      if (!v) continue;
      videos.push(v);
      if (row.updated_at && row.updated_at > lastMod) lastMod = row.updated_at;
    }
    return { videos, lastMod };
  } catch {
    return { videos: [], lastMod: new Date().toISOString() };
  }
}

function renderVideoSitemap(videos: VideoNode[]): string {
  const urls = videos
    .map((v) => {
      const parts = [
        `    <video:thumbnail_loc>${esc(v.thumbnail)}</video:thumbnail_loc>`,
        `    <video:title>${esc(v.title)}</video:title>`,
        `    <video:description>${esc(v.description)}</video:description>`,
      ];
      if (v.contentLoc) parts.push(`    <video:content_loc>${esc(v.contentLoc)}</video:content_loc>`);
      if (v.playerLoc)
        parts.push(
          `    <video:player_loc allow_embed="yes" autoplay="autoplay=1">${esc(v.playerLoc)}</video:player_loc>`,
        );
      parts.push(
        `    <video:publication_date>${esc(v.publicationDate)}</video:publication_date>`,
        `    <video:family_friendly>yes</video:family_friendly>`,
        `    <video:live>no</video:live>`,
        `    <video:requires_subscription>no</video:requires_subscription>`,
      );
      return [
        `  <url>`,
        `    <loc>${esc(v.loc)}</loc>`,
        `    <video:video>`,
        ...parts,
        `    </video:video>`,
        `  </url>`,
      ].join("\n");
    })
    .join("\n");

  return [
    `<?xml version="1.0" encoding="UTF-8"?>`,
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:video="http://www.google.com/schemas/sitemap-video/1.1">`,
    urls,
    `</urlset>`,
  ].join("\n");
}

export const Route = createFileRoute("/sitemap-video.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const { videos, lastMod } = await collect();
        const body = renderVideoSitemap(videos);
        const headers = sitemapHeaders(body, lastMod);
        if (matchesConditional(request, lastMod, headers.get("ETag")!)) {
          return new Response(null, { status: 304, headers });
        }
        return new Response(body, { headers });
      },
    },
  },
});