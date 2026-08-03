import { z } from "zod";
import { ensureTranslation } from "@/lib/translate.server";

const Schema = z.object({
  entityType: z.string().min(1).max(64),
  entityKey: z.string().min(1).max(128),
  title: z.string().max(500).optional().nullable(),
  description: z.string().max(2000).optional().nullable(),
  targetLang: z.enum(["en", "fr"]),
});

/**
 * Traduit (avec cache) le titre et la description utilisés dans les
 * balises og:* pour que Facebook / LinkedIn / Substack affichent
 * l'aperçu dans la langue active. Ne lève jamais : en cas d'échec on
 * garde le texte d'origine.
 */
export async function localizeOgHandler(input: unknown) {
  const data = Schema.parse(input);
  const out: { title?: string; description?: string } = {};
  const jobs: Array<Promise<void>> = [];
  if (data.title && data.title.trim().length > 1) {
    jobs.push(
      ensureTranslation(
        { entityType: data.entityType, entityKey: data.entityKey, field: "og:title", text: data.title },
        data.targetLang,
      )
        .then((r) => { out.title = r.text; })
        .catch(() => {}),
    );
  }
  if (data.description && data.description.trim().length > 1) {
    jobs.push(
      ensureTranslation(
        { entityType: data.entityType, entityKey: data.entityKey, field: "og:description", text: data.description },
        data.targetLang,
      )
        .then((r) => { out.description = r.text; })
        .catch(() => {}),
    );
  }
  await Promise.all(jobs);
  return out;
}
