import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useLang } from "@/lib/i18n";
import { translateContent } from "@/lib/translate.functions";
import { Languages } from "lucide-react";

type Props = {
  entityType: string;
  entityKey: string;
  field: string;
  text: string | null | undefined;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  sourceLang?: "fr" | "en" | "auto";
  /** When true, translation is only performed after the user clicks a button. */
  manual?: boolean;
  children?: (rendered: string) => React.ReactNode;
};

// Lightweight heuristic: detect if a piece of text is likely French.
function detectLang(text: string): "fr" | "en" {
  const t = text.toLowerCase();
  if (/[àâçéèêëîïôùûœ]/.test(t)) return "fr";
  const frMarkers = [
    " le ", " la ", " les ", " des ", " du ", " de ", " un ", " une ",
    " et ", " est ", " que ", " qui ", " pour ", " avec ", " dans ",
    " je ", " tu ", " il ", " elle ", " nous ", " vous ", " ils ",
    " c'est", " j'ai", " n'est", "'", " pas ", " plus ", " très ",
  ];
  const padded = ` ${t} `;
  let score = 0;
  for (const m of frMarkers) if (padded.includes(m)) score++;
  return score >= 2 ? "fr" : "en";
}

/**
 * Renders `text` in the active UI language.
 * When lang === source language (or text empty), returns original untouched.
 * Otherwise fetches (and caches) a machine translation via the server function.
 * With `manual`, shows a small "translate" button and only fetches on click.
 */
export function TranslatedText({
  entityType,
  entityKey,
  field,
  text,
  as: Tag = "span",
  className,
  sourceLang = "auto",
  manual = true,
  children,
}: Props) {
  const { lang } = useLang();
  const fetchFn = useServerFn(translateContent);
  const [manualOn, setManualOn] = useState(false);

  const hasText = !!text && text.trim().length > 0;
  const effectiveSource: "fr" | "en" =
    sourceLang === "auto" ? (hasText ? detectLang(text!) : "fr") : sourceLang;
  const langsDiffer = hasText && lang !== effectiveSource;
  const shouldTranslate = langsDiffer && (!manual || manualOn);

  const query = useQuery({
    queryKey: ["translation", entityType, entityKey, field, lang, effectiveSource],
    enabled: shouldTranslate,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const r = await fetchFn({
        data: {
          entityType,
          entityKey,
          field,
          text: text!,
          targetLang: lang,
          sourceLang: effectiveSource,
        },
      });
      return r.text;
    },
  });

  const rendered = useMemo(() => {
    if (!shouldTranslate) return text ?? "";
    if (query.data) return query.data;
    return text ?? "";
  }, [shouldTranslate, query.data, text]);

  const showButton = manual && langsDiffer;
  const label = lang === "fr" ? "Traduire" : "Translate";
  const labelBack = lang === "fr" ? "Original" : "Original";
  const isLoading = manualOn && query.isFetching && !query.data;

  const button = showButton ? (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        e.preventDefault();
        setManualOn((v) => !v);
      }}
      className="ml-1 inline-flex items-center gap-1 rounded border border-black/40 bg-yellow-200 px-1.5 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-black hover:bg-yellow-300 disabled:opacity-60"
      disabled={isLoading}
      aria-label={label}
      title={label}
    >
      <Languages className="h-3 w-3" />
      {isLoading ? "…" : manualOn ? labelBack : label}
    </button>
  ) : null;

  if (children) {
    return (
      <>
        {children(rendered)}
        {button}
      </>
    );
  }
  const Element = Tag as any;
  return (
    <Element className={className}>
      {rendered}
      {button}
    </Element>
  );
}