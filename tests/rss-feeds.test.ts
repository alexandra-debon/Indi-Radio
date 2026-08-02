/**
 * Validation structurelle des flux RSS.
 *
 * Objectif : bloquer un déploiement dont les flux seraient cassés
 * (tags requis manquants, liens non canoniques, GUID instables ou
 * dupliqués, dates non conformes RFC 822).
 *
 * Base testée : RSS_BASE_URL ou CHECK_BASE_URL, sinon le serveur de dev
 * local s'il répond, sinon la production.
 */
import { describe, it, expect, beforeAll } from "vitest";

const LOCAL = "http://localhost:8080";
const PROD = "https://radio.indi-art-culture.com";

/** Domaine canonique attendu dans tous les liens/GUID. */
const CANONICAL_ORIGIN = PROD;

const FEEDS = [
  { path: "/rss.xml", label: "flux principal", podcast: false },
  { path: "/rss-chroniques.xml", label: "chroniques album", podcast: false },
  { path: "/rss-actus.xml", label: "actus Indi Rézo", podcast: false },
  { path: "/rss-clips.xml", label: "Clip Addict", podcast: false },
  { path: "/rss-magazine.xml", label: "magazine", podcast: false },
  { path: "/rss-coups-de-coeur.xml", label: "coups de cœur", podcast: false },
  { path: "/podcast.xml", label: "podcast (émissions)", podcast: true },
] as const;

const TIMEOUT = 45_000;

async function fetchText(url: string, ms = 20_000) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: ctrl.signal,
      headers: { "user-agent": "indi-rss-structure-test/1.0" },
    });
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
  console.log(`[rss-feeds] base testée : ${BASE}`);
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

/** RFC 822 / RFC 2822 tel que produit par Date#toUTCString(). */
const RFC822 = /^[A-Z][a-z]{2}, \d{2} [A-Z][a-z]{2} \d{4} \d{2}:\d{2}:\d{2} GMT$/;

describe("Structure des flux RSS", () => {
  for (const feed of FEEDS) {
    describe(`${feed.path} (${feed.label})`, () => {
      let doc: Document;
      let channel: Element;
      let items: Element[];
      let status = 0;
      let contentType = "";

      beforeAll(async () => {
        const { res, body } = await fetchText(`${BASE}${feed.path}`);
        status = res.status;
        contentType = res.headers.get("content-type") ?? "";
        doc = parse(body);
        channel = doc.querySelector("rss > channel")!;
        items = Array.from(doc.querySelectorAll("rss > channel > item"));
      }, TIMEOUT);

      it("répond en 200 avec un Content-Type RSS", () => {
        expect(status).toBe(200);
        expect(contentType).toMatch(/application\/rss\+xml|application\/xml|text\/xml/);
      });

      it("expose un <rss version=\"2.0\"> avec les namespaces attendus", () => {
        const rss = doc.documentElement;
        expect(rss.nodeName).toBe("rss");
        expect(rss.getAttribute("version")).toBe("2.0");
        expect(rss.getAttribute("xmlns:atom")).toBe("http://www.w3.org/2005/Atom");
        expect(rss.getAttribute("xmlns:media")).toBe("http://search.yahoo.com/mrss/");
        if (feed.podcast) {
          expect(rss.getAttribute("xmlns:itunes")).toBe(
            "http://www.itunes.com/dtds/podcast-1.0.dtd",
          );
        }
      });

      it("déclare les tags obligatoires du <channel>", () => {
        expect(channel).toBeTruthy();
        for (const tag of ["title", "link", "description", "language"]) {
          const el = Array.from(channel.children).find((c) => c.nodeName === tag);
          expect(text(el), `<${tag}> du channel`).not.toBe("");
        }
        expect(text(channel.querySelector("language"))).toMatch(/^(fr|en)(-[A-Z]{2})?$/);
        expect(text(channel.querySelector("link"))).toMatch(
          new RegExp(`^${CANONICAL_ORIGIN}`),
        );
      });

      it("déclare un <atom:link rel=\"self\"> pointant sur sa propre URL canonique", () => {
        const self = Array.from(channel.getElementsByTagName("atom:link")).find(
          (el) => el.getAttribute("rel") === "self",
        );
        expect(self, "atom:link rel=self").toBeTruthy();
        expect(self!.getAttribute("href")).toBe(`${CANONICAL_ORIGIN}${feed.path}`);
        expect(self!.getAttribute("type")).toBe("application/rss+xml");
      });

      it("a des dates de channel au format RFC 822", () => {
        for (const tag of ["lastBuildDate", "pubDate"]) {
          const value = text(channel.querySelector(tag));
          expect(value, `<${tag}>`).toMatch(RFC822);
          expect(Number.isNaN(Date.parse(value)), `<${tag}> parsable`).toBe(false);
        }
      });

      it("contient au moins un <item>", () => {
        expect(items.length).toBeGreaterThan(0);
      });

      it("chaque item a titre, lien, GUID et date valides", () => {
        for (const item of items) {
          const title = text(item.querySelector("title"));
          const link = text(item.querySelector("link"));
          const guidEl = item.querySelector("guid");
          const guid = text(guidEl);
          const pub = text(item.querySelector("pubDate"));

          expect(title, "titre d'item non vide").not.toBe("");
          expect(link, `lien canonique de « ${title} »`).toMatch(
            new RegExp(`^${CANONICAL_ORIGIN}/[^\\s]*$`),
          );
          expect(link, "pas de slash final").not.toMatch(/[^/]\/$/);
          expect(link, "pas de paramètre de tracking").not.toMatch(/[?&](utm_|fbclid|gclid)/);

          expect(guid, `GUID de « ${title} »`).not.toBe("");
          expect(guidEl!.getAttribute("isPermaLink")).toBe("true");
          // GUID stable = URL canonique de la ressource, jamais une date
          // ni un identifiant regénéré à chaque build.
          expect(guid, "GUID = lien canonique (stabilité)").toBe(link);

          expect(pub, `pubDate de « ${title} »`).toMatch(RFC822);
          const ts = Date.parse(pub);
          expect(Number.isNaN(ts), "pubDate parsable").toBe(false);
          expect(ts, "pubDate pas dans le futur (tolérance 24h)").toBeLessThan(
            Date.now() + 24 * 3600 * 1000,
          );
          expect(ts, "pubDate postérieure à 2000").toBeGreaterThan(Date.parse("2000-01-01"));
        }
      });

      it("n'a aucun GUID dupliqué", () => {
        const guids = items.map((i) => text(i.querySelector("guid")));
        expect(new Set(guids).size, `${guids.length} items`).toBe(guids.length);
      });

      it("trie les items du plus récent au plus ancien", () => {
        const dates = items.map((i) => Date.parse(text(i.querySelector("pubDate"))));
        const sorted = [...dates].sort((a, b) => b - a);
        expect(dates).toEqual(sorted);
      });

      it("expose des enclosures cohérentes (url absolue, type MIME, taille > 0)", () => {
        for (const enc of Array.from(doc.querySelectorAll("enclosure"))) {
          expect(enc.getAttribute("url")).toMatch(/^https?:\/\//);
          expect(enc.getAttribute("type")).toMatch(/^[\w.-]+\/[\w.+-]+$/);
          expect(Number(enc.getAttribute("length"))).toBeGreaterThan(0);
        }
      });

      if (feed.podcast) {
        it("déclare les tags iTunes requis pour Apple Podcasts", () => {
          for (const tag of [
            "itunes:author",
            "itunes:summary",
            "itunes:explicit",
            "itunes:image",
            "itunes:category",
            "itunes:owner",
          ]) {
            expect(
              channel.getElementsByTagName(tag).length,
              `<${tag}> du channel`,
            ).toBeGreaterThan(0);
          }
          const owner = channel.getElementsByTagName("itunes:owner")[0];
          expect(text(owner.getElementsByTagName("itunes:email")[0])).toMatch(/@/);
          for (const item of items) {
            expect(
              item.getElementsByTagName("itunes:explicit").length,
              "itunes:explicit par item",
            ).toBeGreaterThan(0);
          }
        });

        it("chaque épisode audio porte une enclosure téléchargeable", () => {
          for (const item of items) {
            const enc = item.querySelector("enclosure");
            if (!enc) continue;
            expect(enc.getAttribute("type")).toMatch(/^audio\//);
          }
        });
      }
    });
  }
});
