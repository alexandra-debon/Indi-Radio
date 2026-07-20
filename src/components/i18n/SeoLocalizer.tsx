import { useEffect } from "react";
import { useRouterState } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";
import { resolveSeo } from "@/lib/i18n/seo-meta";
import { translateContent } from "@/lib/translate.functions";

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
      const selfUrl = `${SITE_ORIGIN}${pathname}${lang === "fr" ? "" : `?hl=${lang}`}`;
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
      let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
      if (!canonical) {
        canonical = document.createElement("link");
        canonical.setAttribute("rel", "canonical");
        document.head.appendChild(canonical);
      }
      canonical.setAttribute("href", selfUrl);
    } catch {}

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