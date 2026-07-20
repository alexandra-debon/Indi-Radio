import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { resolveSeo } from "@/lib/i18n/seo-meta";

const SITE_ORIGIN = "https://radio.indi-art-culture.com";

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
  const { lang } = useLang();
  const pathname = useRouterState({ select: (s) => s.location.pathname });

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
    }

    // hreflang alternates — same URL with a hl query param so each language has its own indexable URL.
    try {
      const base = SITE_ORIGIN + pathname;
      upsertLink("alternate", "fr", `${base}?hl=fr`);
      upsertLink("alternate", "en", `${base}?hl=en`);
      upsertLink("alternate", "x-default", base);
    } catch {}

    try { document.documentElement.lang = lang; } catch {}
  }, [lang, pathname]);

  return null;
}