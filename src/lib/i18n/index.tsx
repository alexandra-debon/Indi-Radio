import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dict, type DictKey, type Lang } from "./dict";

const STORAGE_KEY = "indi.lang";

/**
 * Detects the user's preferred language from the browser.
 * `navigator.languages` is populated from the same source the browser uses
 * to build its Accept-Language header, so this mirrors server-side detection.
 * We pick the first tag that maps to a language we support (fr/en).
 */
function detectBrowserLang(): Lang {
  try {
    const candidates: string[] = [];
    if (Array.isArray(navigator.languages)) candidates.push(...navigator.languages);
    if (navigator.language) candidates.push(navigator.language);
    for (const raw of candidates) {
      const tag = raw.toLowerCase().split(/[-_]/)[0];
      if (tag === "fr") return "fr";
      if (tag === "en") return "en";
    }
  } catch {}
  return "fr";
}

type Ctx = {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: DictKey) => string;
};

const LangCtx = createContext<Ctx | null>(null);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("fr");

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const hl = params.get("hl");
      if (hl === "en" || hl === "fr") {
        setLangState(hl);
        try { localStorage.setItem(STORAGE_KEY, hl); } catch {}
        return;
      }
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored === "en" || stored === "fr") {
        setLangState(stored);
        return;
      }
      // First visit: honor the browser's preferred language, then persist it
      // so subsequent visits use the remembered choice instead of re-detecting.
      const detected = detectBrowserLang();
      setLangState(detected);
      try { localStorage.setItem(STORAGE_KEY, detected); } catch {}
    } catch {}
  }, []);

  const setLang = useCallback((l: Lang) => {
    setLangState(l);
    try {
      localStorage.setItem(STORAGE_KEY, l);
      document.documentElement.lang = l;
    } catch {}
  }, []);

  useEffect(() => {
    try { document.documentElement.lang = lang; } catch {}
  }, [lang]);

  const t = useCallback((key: DictKey) => dict[lang][key] ?? dict.fr[key] ?? key, [lang]);

  const value = useMemo(() => ({ lang, setLang, t }), [lang, setLang, t]);
  return <LangCtx.Provider value={value}>{children}</LangCtx.Provider>;
}

export function useLang(): Ctx {
  const v = useContext(LangCtx);
  if (!v) return { lang: "fr", setLang: () => {}, t: (k) => dict.fr[k] ?? k };
  return v;
}

export function useT() {
  return useLang().t;
}