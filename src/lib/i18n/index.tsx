import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { dict, type DictKey, type Lang } from "./dict";
import { supabase } from "@/integrations/supabase/client";

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
  // Track whether the current lang came from the signed-in profile so we
  // don't overwrite the server with the local default on first mount.
  const [hydratedFromProfile, setHydratedFromProfile] = useState(false);

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
    // Persist to the signed-in profile so the choice follows the user
    // across devices. Fire-and-forget: local UI must not wait on this.
    (async () => {
      try {
        const { data } = await supabase.auth.getUser();
        const uid = data.user?.id;
        if (!uid) return;
        await (supabase as any).from("profiles").update({ lang: l }).eq("id", uid);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    try { document.documentElement.lang = lang; } catch {}
  }, [lang]);

  // When the user signs in (or on initial mount if already signed in), pull
  // the language stored on their profile and adopt it locally. If the profile
  // has no preference yet, seed it from the current local choice so future
  // devices inherit it.
  useEffect(() => {
    let cancelled = false;

    const syncFromProfile = async (uid: string) => {
      try {
        const { data } = await (supabase as any)
          .from("profiles")
          .select("lang")
          .eq("id", uid)
          .maybeSingle();
        if (cancelled) return;
        const remote = (data as { lang?: string | null } | null)?.lang;
        if (remote === "fr" || remote === "en") {
          setLangState(remote);
          try { localStorage.setItem(STORAGE_KEY, remote); } catch {}
          setHydratedFromProfile(true);
        } else {
          // No server preference yet — seed it with the current local one.
          try {
            await (supabase as any).from("profiles").update({ lang }).eq("id", uid);
            if (!cancelled) setHydratedFromProfile(true);
          } catch {}
        }
      } catch {}
    };

    supabase.auth.getUser().then(({ data }) => {
      const uid = data.user?.id;
      if (uid) void syncFromProfile(uid);
    });

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_IN" && session?.user?.id) {
        void syncFromProfile(session.user.id);
      }
      if (event === "SIGNED_OUT") {
        setHydratedFromProfile(false);
      }
    });

    return () => { cancelled = true; sub.subscription.unsubscribe(); };
    // `lang` intentionally omitted — this effect only bootstraps on
    // auth transitions; ongoing writes go through `setLang`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Silence unused-var lint for the flag; kept as state for future gating.
  void hydratedFromProfile;

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