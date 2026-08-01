import { createHash } from "crypto";
import { z } from "zod";

const InputSchema = z.object({
  entityType: z.string().min(1).max(64),
  entityKey: z.string().min(1).max(128),
  field: z.string().min(1).max(64),
  text: z.string().min(1).max(20000),
  targetLang: z.enum(["en", "fr"]),
  sourceLang: z.enum(["fr", "en", "auto"]).default("auto"),
});

type TranslationInput = z.infer<typeof InputSchema>;

const QUOTED_WORK_RE = /([«“"])([^«»“”"\n]+)([»”"])/g;

function protectQuotedWorks(text: string) {
  const originals: string[] = [];
  const protectedText = text.replace(QUOTED_WORK_RE, (match) => {
    const index = originals.push(match) - 1;
    return `⟦INDI_ORIGINAL_${index}⟧`;
  });
  return { protectedText, originals };
}

function restoreQuotedWorks(text: string, originals: string[]) {
  return originals.reduce(
    (result, original, index) =>
      result.replace(new RegExp(`⟦INDI_ORIGINAL_${index}⟧`, "g"), original),
    text,
  );
}

export function hashText(t: string) {
  // Versioned so translations cached before title protection are regenerated.
  return createHash("sha256").update(`quoted-works-v2:${t}`).digest("hex").slice(0, 24);
}

const BACKOFF_MINUTES = [1, 5, 15, 60, 240];
const MAX_ATTEMPTS = BACKOFF_MINUTES.length;

type LogRow = {
  entity_type: string;
  entity_key: string;
  field: string;
  target_lang: string;
  source_hash?: string | null;
  status:
    | "success"
    | "cache_hit"
    | "shared_hit"
    | "failed"
    | "retry_success"
    | "retry_failed"
    | "dead_letter";
  duration_ms?: number | null;
  attempt?: number;
  error?: string | null;
  text_length?: number | null;
};

async function logTranslation(row: LogRow) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("translation_logs").insert(row);
  } catch {
    // never let logging break the caller
  }
}

async function enqueueRetry(params: {
  entityType: string;
  entityKey: string;
  field: string;
  targetLang: "en" | "fr";
  text: string;
  sourceHash: string;
  error: string;
}) {
  try {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const nextAt = new Date(Date.now() + BACKOFF_MINUTES[0] * 60_000).toISOString();
    await supabaseAdmin
      .from("translation_retry_queue")
      .upsert(
        {
          entity_type: params.entityType,
          entity_key: params.entityKey,
          field: params.field,
          target_lang: params.targetLang,
          source_text: params.text,
          source_hash: params.sourceHash,
          attempts: 0,
          next_attempt_at: nextAt,
          last_error: params.error.slice(0, 500),
          updated_at: new Date().toISOString(),
        },
        { onConflict: "entity_type,entity_key,field,target_lang" },
      );
  } catch {
    // best-effort
  }
}

export async function callTranslationGateway(
  text: string,
  target: "en" | "fr",
  source: "en" | "fr" | "auto" = "auto",
) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const targetName = target === "en" ? "English" : "French";
  const sourceName = source === "auto" ? "the detected source language" : source === "fr" ? "French" : "English";
  // Quoted work titles (songs, albums) are only preserved when translating INTO French:
  // an English title must stay original for French readers. Translating into English
  // stays a full, unrestricted translation.
  const protectTitles = target === "fr";
  const { protectedText, originals } = protectTitles
    ? protectQuotedWorks(text)
    : { protectedText: text, originals: [] as string[] };
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
    body: JSON.stringify({
      model: "google/gemini-3.5-flash",
      messages: [
        {
          role: "system",
          content:
            `You are a professional translator. Translate the user's message from ${sourceName} into ${targetName}. ` +
            `If the message is already in ${targetName}, return it unchanged. ` +
            `Preserve tone, hashtags (#tag), @mentions, emojis, URLs and line breaks. ` +
            (protectTitles
              ? `Never alter placeholders such as ⟦INDI_ORIGINAL_0⟧: they represent song, album or other work titles that must remain exactly as originally written. `
              : "") +
            `Return ONLY the translated text, no quotes, no explanation.`,
        },
        { role: "user", content: protectedText },
      ],
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Gateway ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const out = json?.choices?.[0]?.message?.content;
  if (typeof out !== "string" || !out.trim()) throw new Error("Empty translation");
  return restoreQuotedWorks(out.trim(), originals);
}

export async function translateContentHandler(input: unknown) {
  const data: TranslationInput = InputSchema.parse(input);
  const { entityType, entityKey, field, text, targetLang, sourceLang } = data;
  const sourceHash = hashText(text);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const existing = await supabaseAdmin
    .from("content_translations")
    .select("translated_text, source_hash")
    .eq("entity_type", entityType)
    .eq("entity_key", entityKey)
    .eq("field", field)
    .eq("lang", targetLang)
    .maybeSingle();

  if (existing.data?.source_hash === sourceHash) {
    void logTranslation({ entity_type: entityType, entity_key: entityKey, field, target_lang: targetLang, source_hash: sourceHash, status: "cache_hit", duration_ms: 0, text_length: text.length });
    return { text: existing.data.translated_text as string, cached: true };
  }

  const shared = await supabaseAdmin
    .from("content_translations")
    .select("translated_text")
    .eq("lang", targetLang)
    .eq("source_hash", sourceHash)
    .limit(1)
    .maybeSingle();

  const started = Date.now();
  let translated: string;
  if (shared.data?.translated_text) {
    translated = shared.data.translated_text as string;
    void logTranslation({ entity_type: entityType, entity_key: entityKey, field, target_lang: targetLang, source_hash: sourceHash, status: "shared_hit", duration_ms: Date.now() - started, text_length: text.length });
  } else {
    try {
      translated = await callTranslationGateway(text, targetLang, sourceLang);
      void logTranslation({ entity_type: entityType, entity_key: entityKey, field, target_lang: targetLang, source_hash: sourceHash, status: "success", duration_ms: Date.now() - started, text_length: text.length });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      void logTranslation({ entity_type: entityType, entity_key: entityKey, field, target_lang: targetLang, source_hash: sourceHash, status: "failed", duration_ms: Date.now() - started, error: message, text_length: text.length });
      void enqueueRetry({ entityType, entityKey, field, targetLang, text, sourceHash, error: message });
      throw error;
    }
  }

  await supabaseAdmin.from("content_translations").upsert({
    entity_type: entityType, entity_key: entityKey, field, lang: targetLang,
    source_hash: sourceHash, translated_text: translated, updated_at: new Date().toISOString(),
  }, { onConflict: "entity_type,entity_key,field,lang" });
  await supabaseAdmin.from("translation_retry_queue").delete()
    .eq("entity_type", entityType).eq("entity_key", entityKey).eq("field", field).eq("target_lang", targetLang);

  return { text: translated, cached: !!shared.data };
}

export type PrewarmItem = {
  entityType: string;
  entityKey: string;
  field: string;
  text: string;
};

export async function ensureTranslation(
  item: PrewarmItem,
  targetLang: "en" | "fr",
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const sourceHash = hashText(item.text);

  const existing = await supabaseAdmin
    .from("content_translations")
    .select("translated_text, source_hash")
    .eq("entity_type", item.entityType)
    .eq("entity_key", item.entityKey)
    .eq("field", item.field)
    .eq("lang", targetLang)
    .maybeSingle();

  if (existing.data && existing.data.source_hash === sourceHash) {
    void logTranslation({
      entity_type: item.entityType,
      entity_key: item.entityKey,
      field: item.field,
      target_lang: targetLang,
      source_hash: sourceHash,
      status: "cache_hit",
      duration_ms: 0,
      text_length: item.text.length,
    });
    return { text: existing.data.translated_text as string, cached: true };
  }

  const shared = await supabaseAdmin
    .from("content_translations")
    .select("translated_text")
    .eq("lang", targetLang)
    .eq("source_hash", sourceHash)
    .limit(1)
    .maybeSingle();

  let translated: string;
  const started = Date.now();
  if (shared.data?.translated_text) {
    translated = shared.data.translated_text as string;
    void logTranslation({
      entity_type: item.entityType,
      entity_key: item.entityKey,
      field: item.field,
      target_lang: targetLang,
      source_hash: sourceHash,
      status: "shared_hit",
      duration_ms: Date.now() - started,
      text_length: item.text.length,
    });
  } else {
    try {
      translated = await callTranslationGateway(item.text, targetLang, "auto");
      void logTranslation({
        entity_type: item.entityType,
        entity_key: item.entityKey,
        field: item.field,
        target_lang: targetLang,
        source_hash: sourceHash,
        status: "success",
        duration_ms: Date.now() - started,
        text_length: item.text.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      void logTranslation({
        entity_type: item.entityType,
        entity_key: item.entityKey,
        field: item.field,
        target_lang: targetLang,
        source_hash: sourceHash,
        status: "failed",
        duration_ms: Date.now() - started,
        error: msg,
        text_length: item.text.length,
      });
      void enqueueRetry({
        entityType: item.entityType,
        entityKey: item.entityKey,
        field: item.field,
        targetLang,
        text: item.text,
        sourceHash,
        error: msg,
      });
      throw err;
    }
  }

  await supabaseAdmin.from("content_translations").upsert(
    {
      entity_type: item.entityType,
      entity_key: item.entityKey,
      field: item.field,
      lang: targetLang,
      source_hash: sourceHash,
      translated_text: translated,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "entity_type,entity_key,field,lang" },
  );

  // Success clears any pending retry entry
  await supabaseAdmin
    .from("translation_retry_queue")
    .delete()
    .eq("entity_type", item.entityType)
    .eq("entity_key", item.entityKey)
    .eq("field", item.field)
    .eq("target_lang", targetLang);

  return { text: translated, cached: !!shared.data };
}

export { BACKOFF_MINUTES, MAX_ATTEMPTS, logTranslation };