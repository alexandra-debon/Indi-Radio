import { createServerFn } from "@tanstack/react-start";
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

function hashText(t: string) {
  return createHash("sha256").update(t).digest("hex").slice(0, 24);
}

async function callGateway(text: string, target: "en" | "fr", source: string) {
  const key = process.env.LOVABLE_API_KEY;
  if (!key) throw new Error("Missing LOVABLE_API_KEY");
  const targetName = target === "en" ? "English" : "French";
  const sourceName = source === "auto" ? "the detected source language" : source === "fr" ? "French" : "English";
  const res = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify({
      model: "google/gemini-3.5-flash",
      messages: [
        {
          role: "system",
          content:
            `You are a professional translator. Translate the user's message from ${sourceName} into ${targetName}. ` +
            `If the message is already in ${targetName}, return it unchanged. ` +
            `Preserve tone, hashtags (#tag), @mentions, emojis, URLs and line breaks. ` +
            `Return ONLY the translated text, no quotes, no explanation.`,
        },
        { role: "user", content: text },
      ],
      temperature: 0.2,
    }),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Gateway ${res.status}: ${body.slice(0, 200)}`);
  }
  const json = await res.json();
  const out = json?.choices?.[0]?.message?.content;
  if (typeof out !== "string" || !out.trim()) throw new Error("Empty translation");
  return out.trim();
}

export const translateContent = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) => InputSchema.parse(data))
  .handler(async ({ data }) => {
    const { entityType, entityKey, field, text, targetLang, sourceLang } = data;
    const sourceHash = hashText(text);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { logTranslation, BACKOFF_MINUTES } = await import("@/lib/translate.server");

    const existing = await supabaseAdmin
      .from("content_translations")
      .select("translated_text, source_hash")
      .eq("entity_type", entityType)
      .eq("entity_key", entityKey)
      .eq("field", field)
      .eq("lang", targetLang)
      .maybeSingle();

    if (existing.data && existing.data.source_hash === sourceHash) {
      void logTranslation({
        entity_type: entityType, entity_key: entityKey, field, target_lang: targetLang,
        source_hash: sourceHash, status: "cache_hit", duration_ms: 0, text_length: text.length,
      });
      return { text: existing.data.translated_text as string, cached: true };
    }

    // Cross-entity reuse: if the same source text was already translated
    // for ANY other entity in this target language, reuse that translation.
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
        entity_type: entityType, entity_key: entityKey, field, target_lang: targetLang,
        source_hash: sourceHash, status: "shared_hit",
        duration_ms: Date.now() - started, text_length: text.length,
      });
    } else {
      try {
        translated = await callGateway(text, targetLang, sourceLang);
        void logTranslation({
          entity_type: entityType, entity_key: entityKey, field, target_lang: targetLang,
          source_hash: sourceHash, status: "success",
          duration_ms: Date.now() - started, text_length: text.length,
        });
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        void logTranslation({
          entity_type: entityType, entity_key: entityKey, field, target_lang: targetLang,
          source_hash: sourceHash, status: "failed",
          duration_ms: Date.now() - started, error: msg, text_length: text.length,
        });
        const nextAt = new Date(Date.now() + BACKOFF_MINUTES[0] * 60_000).toISOString();
        await supabaseAdmin.from("translation_retry_queue").upsert(
          {
            entity_type: entityType, entity_key: entityKey, field,
            target_lang: targetLang, source_text: text, source_hash: sourceHash,
            attempts: 0, next_attempt_at: nextAt, last_error: msg.slice(0, 500),
            updated_at: new Date().toISOString(),
          },
          { onConflict: "entity_type,entity_key,field,target_lang" },
        );
        throw err;
      }
    }

    await supabaseAdmin
      .from("content_translations")
      .upsert(
        {
          entity_type: entityType,
          entity_key: entityKey,
          field,
          lang: targetLang,
          source_hash: sourceHash,
          translated_text: translated,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "entity_type,entity_key,field,lang" }
      );

    await supabaseAdmin
      .from("translation_retry_queue")
      .delete()
      .eq("entity_type", entityType)
      .eq("entity_key", entityKey)
      .eq("field", field)
      .eq("target_lang", targetLang);

    return { text: translated, cached: !!shared.data };
  });