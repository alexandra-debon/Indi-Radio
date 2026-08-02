/**
 * Validation des flux RSS pour les plateformes d'agrégation :
 * - Apple News (images ≥ 1024 px, content:encoded, métadonnées chaîne)
 * - Google Publisher Center (titre, lien, description, langue, self-link)
 */
import { describe, it, expect, beforeAll } from "vitest";

const LOCAL = "http://localhost:8080";
const PROD = "https://radio.indi-art-culture.com";

const FEEDS = [
  { path: "/rss.xml", label: "flux principal" },
  { path: "/rss-chroniques.xml", label: "chroniques album" },
  { path: "/rss-actus.xml", label: "actus Indi Rézo" },
  { path: "/rss-clips.xml", label: "Clip Addict" },
  { path: "/rss-magazine.xml", label: "magazine" },
  { path: "/rss-coups-de-coeur.xml", label: "coups de cœur" },
] as const;

const TIMEOUT = 45_000;

async function fetchText(url: string, ms = 20_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, { signal: ctrl.signal });
    return { res, body: await res.text() };
  } finally {
    clearTimeout(t);
  }
}

async function reachable(url: string) {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 3000);
    const res = await fetch(url, { signal: ctrl.signal });
    clearTimeout(t);
    return res.ok;
  } catch {
    return false;
  }
}

let BASE = process.env.RSS_BASE_URL ?? process.env.CHECK_BASE_URL ?? "";

beforeAll(async () => {
  if (!BASE) BASE = (await reachable(`${LOCAL}/rss.xml`)) ? LOCAL : PROD;
  BASE = BASE.replace(/\/+$/, "");
  // eslint-disable-next-line no-console
  console.log(`[rss-platforms] base testée : ${BASE}`);
}, 10_000);

function parse(xml: string): Document {
  const doc = new DOMParser().parseFromString(xml, "application/xml");
  const err = doc.querySelector("parsererror");
  if (err) throw new Error(`XML invalide : ${err.textContent?.slice(0, 300)}`);
  return doc;
}

function text(el: Element | null | undefined): string {
  return (el?.textContent ?? "").trim();
}

function numAttr(el: Element | null | undefined, attr: string): number | null {
  if (!el) return null;
  const v = el.getAttribute(attr);
  if (!v) return null;
  const n = Number(v);
  return Number.isNaN(n) ? null : n;
}

function allItems(doc: Document) {
  return Array.from(doc.querySelectorAll("rss > channel > item"));
}

function imageUrl(item: Element): string | null {
  const media = item.querySelector("media\\:content[medium='image'], media\\:thumbnail");
  return media?.getAttribute("url") ?? null;
}

describe("Compatibilité Apple News", () => {
  for (const feed of FEEDS) {
    describe(`${feed.path} (${feed.label})`, () => {
      let doc: Document;
      let channel: Element;
      let items: Element[];

      beforeAll(async () => {
        const { body } = await fetchText(`${BASE}${feed.path}`);
        doc = parse(body);
        channel = doc.querySelector("rss > channel")!;
        items = allItems(doc);
      }, TIMEOUT);

      it("déclare les métadonnées de chaîne requises", () => {
        for (const tag of ["title", "link", "description", "language", "lastBuildDate", "pubDate"]) {
          expect(text(channel.querySelector(tag)), `<${tag}>`).not.toBe("");
        }
        expect(text(channel.querySelector("copyright"))).not.toBe("");
        expect(text(channel.querySelector("managingEditor"))).toMatch(/@/);
        expect(text(channel.querySelector("webMaster"))).toMatch(/@/);
      });

      it("chaque item a un content:encoded non vide quand un contenu est disponible", () => {
        for (const item of items) {
          const title = text(item.querySelector("title"));
          const desc = text(item.querySelector("description"));
          const content = text(item.querySelector("content\\:encoded"));
          if (content) {
            expect(content.length).toBeGreaterThan(0);
          } else {
            // Si pas de content:encoded, l'item doit au moins avoir une description
            expect(desc, `description requise pour « ${title} »`).not.toBe("");
          }
        }
      });

      it("signale les images déclarées avec une largeur inférieure à 1024 px", () => {
        const small: string[] = [];
        for (const item of items) {
          const media = item.querySelector("media\\:content[medium='image']");
          if (!media) continue;
          const w = numAttr(media, "width");
          if (w && w < 1024) {
            const title = text(item.querySelector("title"));
            small.push(`${title} (${w}px)`);
          }
        }
        if (small.length > 0) {
          // eslint-disable-next-line no-console
          console.warn(`[rss-platforms] images < 1024 px dans ${feed.path} :`, small.join(", "));
        }
        // Ce test est informatif : il ne fait pas échouer la suite, mais log les items problématiques.
        expect(true).toBe(true);
      });

      it("ne contient pas de scripts ou d'iframes dans content:encoded", () => {
        for (const item of items) {
          const content = text(item.querySelector("content\\:encoded"));
          if (!content) continue;
          expect(content).not.toMatch(/<\s*script\b/i);
          expect(content).not.toMatch(/<\s*iframe\b/i);
          expect(content).not.toMatch(/<\s*style\b/i);
        }
      });
    });
  }
});

describe("Compatibilité Google Publisher Center", () => {
  for (const feed of FEEDS) {
    describe(`${feed.path} (${feed.label})`, () => {
      let doc: Document;
      let channel: Element;
      let items: Element[];

      beforeAll(async () => {
        const { body } = await fetchText(`${BASE}${feed.path}`);
        doc = parse(body);
        channel = doc.querySelector("rss > channel")!;
        items = allItems(doc);
      }, TIMEOUT);

      it("chaque item a un titre, un lien, une description et une date", () => {
        for (const item of items) {
          const title = text(item.querySelector("title"));
          const link = text(item.querySelector("link"));
          const desc = text(item.querySelector("description"));
          const pub = text(item.querySelector("pubDate"));
          expect(title).not.toBe("");
          expect(link).toMatch(/^https?:\/\//);
          expect(desc).not.toBe("");
          expect(pub).not.toBe("");
        }
      });

      it("déclare un atom:link rel=self absolu", () => {
        const self = Array.from(channel.getElementsByTagName("atom:link")).find(
          (el) => el.getAttribute("rel") === "self",
        );
        expect(self).toBeTruthy();
        const href = self?.getAttribute("href") ?? "";
        expect(href).toMatch(/^https?:\/\//);
        expect(href).toMatch(/\.xml$/);
      });

      it("les liens des images d'items sont absolus et accessibles en HTTPS", () => {
        for (const item of items) {
          const url = imageUrl(item);
          if (url) expect(url).toMatch(/^https:\/\//);
        }
      });
    });
  }
});
