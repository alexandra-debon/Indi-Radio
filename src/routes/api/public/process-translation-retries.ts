import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/api/public/process-translation-retries")({
  server: {
    handlers: {
      POST: async () => runRetryPass(),
      GET: async () => runRetryPass(),
    },
  },
});

async function runRetryPass() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const {
    callTranslationGateway,
    hashText,
    BACKOFF_MINUTES,
    MAX_ATTEMPTS,
    logTranslation,
  } = await import("@/lib/translate.server");

  const nowIso = new Date().toISOString();
  const { data: due, error } = await supabaseAdmin
    .from("translation_retry_queue")
    .select("*")
    .lte("next_attempt_at", nowIso)
    .order("next_attempt_at", { ascending: true })
    .limit(10);

  if (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }

  const jobs = due ?? [];
  const results = await Promise.allSettled(
    jobs.map(async (job) => {
      const attempt = (job.attempts as number) + 1;
      const targetLang = job.target_lang as "en" | "fr";
      const started = Date.now();
      try {
        const translated = await callTranslationGateway(
          job.source_text as string,
          targetLang,
          "auto",
        );
        // Store translation
        await supabaseAdmin.from("content_translations").upsert(
          {
            entity_type: job.entity_type,
            entity_key: job.entity_key,
            field: job.field,
            lang: targetLang,
            source_hash: job.source_hash ?? hashText(job.source_text as string),
            translated_text: translated,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "entity_type,entity_key,field,lang" },
        );
        // Remove from queue
        await supabaseAdmin
          .from("translation_retry_queue")
          .delete()
          .eq("id", job.id);
        await logTranslation({
          entity_type: job.entity_type as string,
          entity_key: job.entity_key as string,
          field: job.field as string,
          target_lang: targetLang,
          source_hash: job.source_hash as string,
          status: "retry_success",
          duration_ms: Date.now() - started,
          attempt,
          text_length: (job.source_text as string).length,
        });
        return { id: job.id, status: "success" };
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        if (attempt >= MAX_ATTEMPTS) {
          await supabaseAdmin
            .from("translation_retry_queue")
            .delete()
            .eq("id", job.id);
          await logTranslation({
            entity_type: job.entity_type as string,
            entity_key: job.entity_key as string,
            field: job.field as string,
            target_lang: targetLang,
            source_hash: job.source_hash as string,
            status: "dead_letter",
            duration_ms: Date.now() - started,
            attempt,
            error: msg,
            text_length: (job.source_text as string).length,
          });
          return { id: job.id, status: "dead_letter" };
        }
        const nextMinutes = BACKOFF_MINUTES[Math.min(attempt, BACKOFF_MINUTES.length - 1)];
        const nextAt = new Date(Date.now() + nextMinutes * 60_000).toISOString();
        await supabaseAdmin
          .from("translation_retry_queue")
          .update({
            attempts: attempt,
            next_attempt_at: nextAt,
            last_error: msg.slice(0, 500),
            updated_at: new Date().toISOString(),
          })
          .eq("id", job.id);
        await logTranslation({
          entity_type: job.entity_type as string,
          entity_key: job.entity_key as string,
          field: job.field as string,
          target_lang: targetLang,
          source_hash: job.source_hash as string,
          status: "retry_failed",
          duration_ms: Date.now() - started,
          attempt,
          error: msg,
          text_length: (job.source_text as string).length,
        });
        return { id: job.id, status: "requeued", nextAt };
      }
    }),
  );

  return Response.json({
    ok: true,
    processed: jobs.length,
    results: results.map((r) => (r.status === "fulfilled" ? r.value : { error: String(r.reason) })),
  });
}