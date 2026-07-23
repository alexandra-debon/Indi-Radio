import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { BASE_URL, sitemapHeaders, matchesConditional } from "@/lib/sitemap-entries";

const GEO = "France";

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function absUrl(u: string | null | undefined): string | null {
  if (!u) return null;
  const trimmed = u.trim();
  if (!trimmed) return null;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("//")) return `https:${trimmed}`;
  if (trimmed.startsWith("/")) return `${BASE_URL}${trimmed}`;
  return null;
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

interface ImageRef {
  loc: string;
  title?: string;
  caption?: string;
}

interface PageImages {
  path: string;
  images: ImageRef[];
  lastmod?: string;
}

function pushIfImage(list: ImageRef[], url: string | null, title?: string | null, caption?: string | null) {
  const abs = absUrl(url);
  if (!abs) return;
  list.push({
    loc: abs,
    title: title?.trim() || undefined,
    caption: caption?.trim() || undefined,
  });
}

async function collect(): Promise<PageImages[]> {
  const pages: PageImages[] = [];
  try {
    const sb = createClient<Database>(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_PUBLISHABLE_KEY!,
      { auth: { storage: undefined, persistSession: false, autoRefreshToken: false } },
    );

    const [shows, episodes, magazines, clips, reviews, news, profiles] = await Promise.all([
      sb.from("shows").select("id, title, cover_url, updated_at").limit(2000),
      sb.from("episodes").select("id, title, cover_url, updated_at").limit(5000),
      sb.from("magazine_entries").select("id, title, cover_url, updated_at").limit(1000),
      sb.from("clip_entries").select("id, title, video_url, updated_at").limit(2000),
      sb.from("album_reviews").select("slug, title, cover_url, updated_at").eq("published", true).limit(2000),
      sb.from("news_posts").select("id, title, image_url, image_urls, updated_at").limit(2000),
      sb.from("profiles").select("pseudo, avatar_url, updated_at").not("avatar_url", "is", null).limit(2000),
    ]);

    for (const r of shows.data ?? []) {
      const imgs: ImageRef[] = [];
      pushIfImage(imgs, r.cover_url, r.title, r.title);
      if (imgs.length) pages.push({ path: `/emissions/${r.id}`, images: imgs, lastmod: r.updated_at ?? undefined });
    }
    for (const r of episodes.data ?? []) {
      const imgs: ImageRef[] = [];
      pushIfImage(imgs, r.cover_url, r.title, r.title);
      if (imgs.length) pages.push({ path: `/episodes/${r.id}`, images: imgs, lastmod: (r as any).updated_at ?? undefined });
    }
    for (const r of magazines.data ?? []) {
      const imgs: ImageRef[] = [];
      pushIfImage(imgs, r.cover_url, r.title, r.title);
      if (imgs.length) pages.push({ path: `/magazines/${r.id}`, images: imgs, lastmod: r.updated_at ?? undefined });
    }
    for (const r of clips.data ?? []) {
      const yt = youtubeId(r.video_url);
      const imgs: ImageRef[] = [];
      if (yt) pushIfImage(imgs, `https://i.ytimg.com/vi/${yt}/hqdefault.jpg`, r.title, r.title);
      if (imgs.length) pages.push({ path: `/clips/${r.id}`, images: imgs, lastmod: r.updated_at ?? undefined });
    }
    for (const r of reviews.data ?? []) {
      const imgs: ImageRef[] = [];
      pushIfImage(imgs, r.cover_url, r.title, r.title);
      if (imgs.length) pages.push({ path: `/chroniques/${r.slug}`, images: imgs, lastmod: r.updated_at ?? undefined });
    }
    for (const r of news.data ?? []) {
      const imgs: ImageRef[] = [];
      pushIfImage(imgs, r.image_url, r.title, r.title);
      for (const extra of (r.image_urls ?? []) as string[]) {
        pushIfImage(imgs, extra, r.title, r.title);
      }
      if (imgs.length) pages.push({ path: `/actus/${r.id}`, images: imgs, lastmod: (r as any).updated_at ?? undefined });
    }
    for (const r of profiles.data ?? []) {
      if (!r.pseudo) continue;
      const imgs: ImageRef[] = [];
      pushIfImage(imgs, r.avatar_url, `@${r.pseudo}`, `Avatar ${r.pseudo}`);
      if (imgs.length) pages.push({ path: `/u/${encodeURIComponent(r.pseudo)}`, images: imgs, lastmod: (r as any).updated_at ?? undefined });
    }
  } catch {
    /* fail-soft */
  }
  return pages;
}

function render(pages: PageImages[]): string {
  const urls = pages
    .map((p) => {
      const imgs = p.images
        .slice(0, 1000) // Google cap per URL
        .map((img) =>
          [
            `    <image:image>`,
            `      <image:loc>${esc(img.loc)}</image:loc>`,
            img.title ? `      <image:title>${esc(img.title)}</image:title>` : null,
            img.caption ? `      <image:caption>${esc(img.caption)}</image:caption>` : null,
            `      <image:geo_location>${GEO}</image:geo_location>`,
            `    </image:image>`,
          ]
            .filter(Boolean)
            .join("\n"),
        )
        .join("\n");
      return `  <url>\n    <loc>${BASE_URL}${p.path}</loc>\n${imgs}\n  </url>`;
    })
    .join("\n");
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:image="http://www.google.com/schemas/sitemap-image/1.0">\n${urls}\n</urlset>`;
}

export const Route = createFileRoute("/sitemap-images.xml")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const pages = await collect();
        const body = render(pages);
        let maxTs = 0;
        for (const p of pages) {
          if (!p.lastmod) continue;
          const t = Date.parse(p.lastmod);
          if (!Number.isNaN(t) && t > maxTs) maxTs = t;
        }
        const lastModified = new Date(maxTs || Date.now()).toUTCString();
        const headers = sitemapHeaders(body, lastModified);
        if (matchesConditional(request, lastModified, headers.get("ETag")!)) {
          return new Response(null, { status: 304, headers });
        }
        return new Response(body, { headers });
      },
    },
  },
});