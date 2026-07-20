import { createHash } from "crypto";

export function hashText(t: string) {
  return createHash("sha256").update(t).digest("hex").slice(0, 24);
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
  if (!res.ok) throw new Error(`Gateway ${res.status}`);
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
    return { text: existing.data.translated_text as string, cached: true };
  }

  const shared = await supabaseAdmin
    .from("content_translations")
    .select("translated_text")
    .eq("lang", targetLang)
    .eq("source_hash", sourceHash)
    .limit(1)
    .maybeSingle();

  const translated = shared.data?.translated_text
    ? (shared.data.translated_text as string)
    : await callTranslationGateway(item.text, targetLang, "auto");

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

  return { text: translated, cached: !!shared.data };
}