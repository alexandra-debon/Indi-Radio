import { useEffect } from "react";
import { useNavigate, useRouterState } from "@tanstack/react-router";
import { useLang } from "@/lib/i18n";

/**
 * Garde l'URL alignée sur la langue active.
 *
 * La langue est portée par `?hl=` : c'est elle que lisent le SSR, les `head()`
 * des pages détail et les aperçus de partage. Quand la langue vient du
 * stockage local ou du profil (donc sans `hl` dans l'URL), on l'écrit dans
 * l'URL pour que tout lien interne cliqué la transporte jusqu'à la page
 * détail (le middleware `retainSearchParams(["hl"])` de la racine s'occupe
 * ensuite de la conserver à chaque navigation).
 */
export function LangUrlSync() {
  const { lang } = useLang();
  const navigate = useNavigate();
  const hl = useRouterState({
    select: (s) => (s.location.search as Record<string, unknown> | undefined)?.["hl"],
  });

  useEffect(() => {
    const desired = lang === "en" ? "en" : undefined;
    const current = hl === "en" ? "en" : hl === "fr" ? "fr" : undefined;
    if (desired === current) return;
    if (desired === undefined && current === undefined) return;
    try {
      void navigate({
        to: ".",
        search: (prev: Record<string, unknown>) => {
          const next = { ...(prev ?? {}) };
          if (desired) next["hl"] = desired;
          else delete next["hl"];
          return next;
        },
        replace: true,
        resetScroll: false,
      } as never);
    } catch {}
  }, [lang, hl, navigate]);

  return null;
}
