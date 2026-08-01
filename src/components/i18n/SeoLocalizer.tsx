import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { resolveSeo } from "@/lib/i18n/seo-meta";
import type { Lang } from "@/lib/i18n/dict";
import { translateContent } from "@/lib/translate.functions";
import {
  fetchSeoOverrides,
  indexOverrides,
  findOverride,
} from "@/lib/seo-overrides";
import { SITE_ORIGIN as CANONICAL_ORIGIN, canonicalPath, canonicalUrl, hreflangUrls } from "@/lib/canonical";

const SITE_ORIGIN = CANONICAL_ORIGIN;

function setMeta(selector: string, attr: "content", value: string, create?: () => HTMLElement) {
  let el = document.head.querySelector<HTMLMetaElement>(selector);
  if (!el && create) {
    el = create() as HTMLMetaElement;
    document.head.appendChild(el);
  }
  if (el) el.setAttribute(attr, value);
}

function upsertLink(rel: string, hreflang: string, href: string) {
  const sel = `link[rel="${rel}"][hreflang="${hreflang}"]`;
  let el = document.head.querySelector<HTMLLinkElement>(sel);
  if (!el) {
    el = document.createElement("link");
    el.setAttribute("rel", rel);
    el.setAttribute("hreflang", hreflang);
    document.head.appendChild(el);
  }
  el.setAttribute("href", href);
}

/**
 * Client-only SEO localizer.
 * - Rewrites title / description / og:* / twitter:* to the active language.
 * - Keeps the original French SEO discoverable via <link rel="alternate" hreflang="fr">.
 * - Advertises English SEO via <link rel="alternate" hreflang="en">.
 */
export function SeoLocalizer() {
  const rawPathname = useRouterState({ select: (s) => s.location.pathname });
  // Langue SEO : dictée par l'URL (?hl=en), jamais par le navigateur.
  // Googlebot explore en `en-US` même pour Google France : si les métadonnées
  // suivaient la langue détectée, l'URL nue serait indexée en anglais.
  const lang = useRouterState({
    select: (s) => {
      const hl = (s.location.search as Record<string, unknown> | undefined)?.["hl"];
      return (hl === "en" ? "en" : "fr") as Lang;
    },
  });
  const pageParam = useRouterState({
    select: (s) => Number((s.location.search as Record<string, unknown> | undefined)?.["page"] ?? 0),
  });
  const pathname = canonicalPath(rawPathname);
  const { data: overrideRows } = useQuery({
    queryKey: ["seo-overrides"],
    queryFn: fetchSeoOverrides,
    staleTime: 5 * 60 * 1000,
  });

  useEffect(() => {
    if (typeof document === "undefined") return;
    const bundle = resolveSeo(pathname);
    if (bundle) {
      const entry = bundle[lang];
      document.title = entry.title;
      setMeta('meta[name="description"]', "content", entry.description, () => {
        const m = document.createElement("meta");
        m.setAttribute("name", "description");
        return m;
      });
      setMeta('meta[property="og:title"]', "content", entry.title, () => {
        const m = document.createElement("meta");
        m.setAttribute("property", "og:title");
        return m;
      });
      setMeta('meta[property="og:description"]', "content", entry.description, () => {
        const m = document.createElement("meta");
        m.setAttribute("property", "og:description");
        return m;
      });
      setMeta('meta[name="twitter:title"]', "content", entry.title, () => {
        const m = document.createElement("meta");
        m.setAttribute("name", "twitter:title");
        return m;
      });
      setMeta('meta[name="twitter:description"]', "content", entry.description, () => {
        const m = document.createElement("meta");
        m.setAttribute("name", "twitter:description");
        return m;
      });
      setMeta('meta[property="og:locale"]', "content", lang === "en" ? "en_US" : "fr_FR", () => {
        const m = document.createElement("meta");
        m.setAttribute("property", "og:locale");
        return m;
      });
      // Advertise the alternate locale so crawlers know it exists.
      const altLocale = lang === "en" ? "fr_FR" : "en_US";
      let altEl = document.head.querySelector<HTMLMetaElement>('meta[property="og:locale:alternate"]');
      if (!altEl) {
        altEl = document.createElement("meta");
        altEl.setAttribute("property", "og:locale:alternate");
        document.head.appendChild(altEl);
      }
      altEl.setAttribute("content", altLocale);
    } else {
      // Dynamic route (post, album, podcast, …) — the route's head() set FR
      // title/description. Auto-translate them so og:* stays in sync with the
      // rendered content for EN readers, and restore FR originals otherwise.
      const titleEl = document.head.querySelector<HTMLMetaElement>('meta[property="og:title"]');
      const descEl = document.head.querySelector<HTMLMetaElement>('meta[property="og:description"]');
      const twTitle = document.head.querySelector<HTMLMetaElement>('meta[name="twitter:title"]');
      const twDesc = document.head.querySelector<HTMLMetaElement>('meta[name="twitter:description"]');
      // Capture originals once.
      const capture = (el: HTMLMetaElement | null) => {
        if (el && !el.dataset.origContent) el.dataset.origContent = el.getAttribute("content") ?? "";
      };
      capture(titleEl); capture(descEl); capture(twTitle); capture(twDesc);
      const origTitle = titleEl?.dataset.origContent ?? document.title;
      const origDesc = descEl?.dataset.origContent ?? "";
      const docTitleOrig = (document.documentElement.dataset.origTitle ??= document.title);

      if (lang === "fr") {
        if (titleEl && origTitle) titleEl.setAttribute("content", origTitle);
        if (twTitle && origTitle) twTitle.setAttribute("content", origTitle);
        if (descEl && origDesc) descEl.setAttribute("content", origDesc);
        if (twDesc && origDesc) twDesc.setAttribute("content", origDesc);
        if (docTitleOrig) document.title = docTitleOrig;
      } else {
        let cancelled = false;
        const run = async (text: string, field: string) => {
          if (!text || text.trim().length < 2) return null;
          try {
            const r = await translateContent({
              data: {
                entityType: "seo",
                entityKey: pathname,
                field,
                text,
                targetLang: "en",
                sourceLang: "fr",
              },
            });
            return r?.text ?? null;
          } catch { return null; }
        };
        (async () => {
          const [tTitle, tDesc] = await Promise.all([
            run(origTitle, "og:title"),
            run(origDesc, "og:description"),
          ]);
          if (cancelled) return;
          if (tTitle) {
            if (titleEl) titleEl.setAttribute("content", tTitle);
            if (twTitle) twTitle.setAttribute("content", tTitle);
            document.title = tTitle;
          }
          if (tDesc) {
            if (descEl) descEl.setAttribute("content", tDesc);
            if (twDesc) twDesc.setAttribute("content", tDesc);
          }
        })();
        // best-effort; nothing to cancel besides the flag
        void cancelled;
      }
    }

    // og:url + canonical follow the active language so crawlers see the
    // localized page as the authoritative one.
    try {
      const selfUrl = canonicalUrl(pathname, { lang, page: pageParam });
      setMeta('meta[property="og:url"]', "content", selfUrl, () => {
        const m = document.createElement("meta");
        m.setAttribute("property", "og:url");
        return m;
      });
      setMeta('meta[name="twitter:url"]', "content", selfUrl, () => {
        const m = document.createElement("meta");
        m.setAttribute("name", "twitter:url");
        return m;
      });
      // Dédoublonnage : une seule balise canonical dans le document.
      const existing = Array.from(
        document.head.querySelectorAll<HTMLLinkElement>('link[rel="canonical"]'),
      );
      existing.slice(1).forEach((el) => el.remove());
      let canonical = existing[0] ?? null;
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", selfUrl);
    } catch {}

    // ── Admin overrides (panneau admin → onglet SEO) ────────────────────
    // Applied last so a hand-written title/description/image always wins
    // over both the code defaults and the auto-translated values.
    try {
      const ov = overrideRows
        ? findOverride(indexOverrides(overrideRows), pathname, lang)
        : null;
      const put = (selector: string, attrName: "name" | "property", attrValue: string, content: string) => {
        setMeta(selector, "content", content, () => {
          const m = document.createElement("meta");
          m.setAttribute(attrName, attrValue);
          return m;
        });
      };
      if (ov?.title) {
        document.title = ov.title;
        put('meta[property="og:title"]', "property", "og:title", ov.title);
        put('meta[name="twitter:title"]', "name", "twitter:title", ov.title);
      }
      if (ov?.description) {
        put('meta[name="description"]', "name", "description", ov.description);
        put('meta[property="og:description"]', "property", "og:description", ov.description);
        put('meta[name="twitter:description"]', "name", "twitter:description", ov.description);
      }
      if (ov?.og_image_url) {
        put('meta[property="og:image"]', "property", "og:image", ov.og_image_url);
        put('meta[name="twitter:image"]', "name", "twitter:image", ov.og_image_url);
      }
      if (ov?.keywords) {
        put('meta[name="keywords"]', "name", "keywords", ov.keywords);
      }
      if (ov?.canonical_url) {
        let c = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
        if (!c) {
          c = document.createElement("link");
          c.setAttribute("rel", "canonical");
          document.head.appendChild(c);
        }
        c.setAttribute("href", ov.canonical_url);
        put('meta[property="og:url"]', "property", "og:url", ov.canonical_url);
      }
      const robots = document.head.querySelector<HTMLMetaElement>('meta[name="robots"]');
      if (ov?.noindex) {
        put('meta[name="robots"]', "name", "robots", "noindex, nofollow");
      } else if (robots && /noindex/i.test(robots.getAttribute("content") ?? "")) {
        robots.setAttribute("content", "index, follow");
      }
    } catch {}

    // hreflang alternates — same URL with a hl query param so each language has its own indexable URL.
    try {
      const alts = hreflangUrls(pathname, pageParam);
      upsertLink("alternate", "fr", alts.fr);
      upsertLink("alternate", "en", alts.en);
      upsertLink("alternate", "x-default", alts.xDefault);
    } catch {}

  }, [lang, pathname, pageParam, overrideRows]);

  return null;
}