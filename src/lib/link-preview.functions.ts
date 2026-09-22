import { createServerFn } from "@tanstack/react-start";

type Preview = {
  url: string;
  title: string | null;
  description: string | null;
  image: string | null;
  siteName: string | null;
};

const cache = new Map<string, { at: number; data: Preview }>();
const TTL_MS = 1000 * 60 * 30; // 30 minutes

function pickMeta(html: string, patterns: RegExp[]): string | null {
  for (const re of patterns) {
    const m = html.match(re);
    if (m && m[1]) return decodePreviewText(m[1]);
  }
  return null;
}

function decodeEntitiesOnce(value: string): string {
  return value
    .replace(/&#x([0-9a-f]+);?/gi, (entity, hex: string) => {
      const codePoint = Number.parseInt(hex, 16);
      try { return String.fromCodePoint(codePoint); } catch { return entity; }
    })
    .replace(/&#([0-9]+);?/g, (entity, decimal: string) => {
      const codePoint = Number.parseInt(decimal, 10);
      try { return String.fromCodePoint(codePoint); } catch { return entity; }
    })
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

export function decodePreviewText(value: string): string {
  let decoded = value;
  // Instagram and some other providers return entities encoded twice, for
  // example `&amp;#039;`. A bounded loop handles those safely.
  for (let pass = 0; pass < 3; pass += 1) {
    const next = decodeEntitiesOnce(decoded);
    if (next === decoded) break;
    decoded = next;
  }
  return decoded.replace(/\s+/g, " ").trim();
}

function metaRegex(prop: string, key: "property" | "name"): RegExp {
  const p = prop.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return new RegExp(
    `<meta[^>]+${key}=["']${p}["'][^>]*content=["']([^"']+)["']`,
    "i",
  );
}

function absolutize(image: string | null, base: string): string | null {
  if (!image) return null;
  try { return new URL(image, base).toString(); } catch { return null; }
}

export const fetchLinkPreview = createServerFn({ method: "GET" })
  .inputValidator((data: { url: string }) => data)
  .handler(async ({ data }): Promise<Preview | null> => {
    const rawUrl = data.url;
    // Validate + normalize
    let parsed: URL;
    try { parsed = new URL(rawUrl); } catch { return null; }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;

    const cached = cache.get(rawUrl);
    if (cached && Date.now() - cached.at < TTL_MS) return cached.data;

    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 5000);
      const res = await fetch(rawUrl, {
        signal: controller.signal,
        headers: {
          "User-Agent": "IndiRadioBot/1.0 (+https://www.radio.indi-art-culture.com)",
          Accept: "text/html,application/xhtml+xml",
        },
        redirect: "follow",
      });
      clearTimeout(timer);
      const contentType = res.headers.get("content-type") || "";
      if (!res.ok || !contentType.includes("text/html")) return null;

      // Read only the first ~200KB — plenty for <head>.
      const buf = await res.arrayBuffer();
      const bytes = new Uint8Array(buf).slice(0, 200_000);
      const html = new TextDecoder("utf-8").decode(bytes);

      const title =
        pickMeta(html, [metaRegex("og:title", "property"), metaRegex("twitter:title", "name")]) ??
        (html.match(/<title>([^<]+)<\/title>/i)?.[1]
          ? decodePreviewText(html.match(/<title>([^<]+)<\/title>/i)?.[1] ?? "")
          : null);
      const description = pickMeta(html, [
        metaRegex("og:description", "property"),
        metaRegex("twitter:description", "name"),
        metaRegex("description", "name"),
      ]);
      const rawImage = pickMeta(html, [
        metaRegex("og:image", "property"),
        metaRegex("twitter:image", "name"),
      ]);
      const siteName = pickMeta(html, [metaRegex("og:site_name", "property")]);

      const preview: Preview = {
        url: rawUrl,
        title,
        description,
        image: absolutize(rawImage, rawUrl),
        siteName: siteName ?? parsed.hostname.replace(/^www\./, ""),
      };
      cache.set(rawUrl, { at: Date.now(), data: preview });
      return preview;
    } catch {
      return null;
    }
  });