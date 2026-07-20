import { createHash } from "crypto";

export function hashText(t: string) {
  return createHash("sha256").update(t).digest("hex").slice(0, 24);
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
            `Return ONLY the translated text, no quotes, no explanation.`,
        },
        { role: "user", content: text },
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
  return out.trim();
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