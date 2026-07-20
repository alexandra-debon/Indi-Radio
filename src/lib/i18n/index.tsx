import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dict, type DictKey, type Lang } from "./dict";

const STORAGE_KEY = "indi.lang";

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
      if (stored === "en" || stored === "fr") setLangState(stored);
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