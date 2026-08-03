import { localizeOg } from "@/lib/og-lang.functions";
import type { OgLang } from "@/lib/og-lang";

/**
 * Utilisé dans les `head()` des pages de contenu : renvoie le titre et la
 * description dans la langue active (traduction mise en cache côté serveur).
 * En français, ou en cas d'erreur, les textes d'origine sont conservés.
 */
export async function localizedOgText(
  lang: OgLang,
  args: { entityType: string; entityKey: string; title: string; description: string },
): Promise<{ title: string; description: string }> {
  if (lang !== "en") return { title: args.title, description: args.description };
  try {
    const r = await localizeOg({
      data: {
        entityType: args.entityType,
        entityKey: args.entityKey,
        title: args.title,
        description: args.description,
        targetLang: "en",
      },
    });
    return {
      title: r?.title || args.title,
      description: r?.description || args.description,
    };
  } catch {
    return { title: args.title, description: args.description };
  }
}
