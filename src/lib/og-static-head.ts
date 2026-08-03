import { STATIC_SEO } from "@/lib/i18n/seo-meta";
import { clampDescription } from "@/lib/i18n/seo-meta";
import { hlFromSearch, withHl } from "@/lib/og-lang";
import { localizedOgText } from "@/lib/og-lang-head";

type MetaEntry = Record<string, string | undefined>;

function read(meta: MetaEntry[], match: (m: MetaEntry) => boolean): string {
  const found = meta.find(match);
  return (found?.["content"] ?? found?.["title"] ?? "") as string;
}

/**
 * Localise côté serveur les balises de partage d'une page statique.
 *
 * Facebook, LinkedIn et Substack ne lisent que le HTML rendu : les
 * corrections appliquées par le SeoLocalizer côté client ne les atteignent
 * jamais. On réécrit donc title / description / og:* / twitter:* dans la
 * langue portée par l'URL (?hl=en), en s'appuyant sur les libellés déjà
 * traduits de STATIC_SEO, avec repli sur la traduction serveur mise en cache.
 */
export async function localizedStaticMeta(
  path: string,
  search: unknown,
  meta: MetaEntry[],
): Promise<MetaEntry[]> {
  const lang = hlFromSearch(search);
  const curTitle = read(meta, (m) => typeof m["title"] === "string");
  const curDesc = read(meta, (m) => m["name"] === "description");

  const bundle = STATIC_SEO[path];
  let title = bundle?.fr.title || curTitle;
  let description = bundle?.fr.description || curDesc;
  // Les libellés écrits dans la page priment en français.
  if (lang === "fr") {
    title = curTitle || title;
    description = curDesc || description;
  } else if (bundle) {
    title = bundle.en.title;
    description = bundle.en.description;
  } else {
    const r = await localizedOgText("en", {
      entityType: "page",
      entityKey: path,
      title: curTitle,
      description: curDesc,
    });
    title = r.title;
    description = r.description;
  }
  description = clampDescription(description);

  const out = meta.map((m) => {
    if (typeof m["title"] === "string") return { title };
    if (m["name"] === "description") return { ...m, content: description };
    if (m["property"] === "og:title" || m["name"] === "twitter:title")
      return { ...m, content: title };
    if (m["property"] === "og:description" || m["name"] === "twitter:description")
      return { ...m, content: description };
    if (m["property"] === "og:url" && m["content"])
      return { ...m, content: withHl(m["content"] as string, lang) };
    return m;
  });

  if (!out.some((m) => m["property"] === "og:locale")) {
    out.push({ property: "og:locale", content: lang === "en" ? "en_US" : "fr_FR" });
  }
  out.push({
    property: "og:locale:alternate",
    content: lang === "en" ? "fr_FR" : "en_US",
  });
  return out;
}
