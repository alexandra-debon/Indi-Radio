import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useLang } from "@/lib/i18n";
import { translateContent } from "@/lib/translate.functions";

type Props = {
  entityType: string;
  entityKey: string;
  field: string;
  text: string | null | undefined;
  as?: keyof React.JSX.IntrinsicElements;
  className?: string;
  sourceLang?: "fr" | "en" | "auto";
  children?: (rendered: string) => React.ReactNode;
};

/**
 * Renders `text` in the active UI language.
 * When lang === source language (or text empty), returns original untouched.
 * Otherwise fetches (and caches) a machine translation via the server function.
 */
export function TranslatedText({
  entityType,
  entityKey,
  field,
  text,
  as: Tag = "span",
  className,
  sourceLang = "fr",
  children,
}: Props) {
  const { lang } = useLang();
  const fetchFn = useServerFn(translateContent);

  const shouldTranslate = !!text && text.trim().length > 0 && lang !== sourceLang;

  const query = useQuery({
    queryKey: ["translation", entityType, entityKey, field, lang],
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
          sourceLang,
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

  if (children) return <>{children(rendered)}</>;
  const Element = Tag as any;
  return <Element className={className}>{rendered}</Element>;
}