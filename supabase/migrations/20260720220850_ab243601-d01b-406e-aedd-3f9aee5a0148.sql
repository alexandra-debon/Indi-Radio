
CREATE TABLE public.translation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  entity_type text NOT NULL,
  entity_key text NOT NULL,
  field text NOT NULL,
  target_lang text NOT NULL,
  source_hash text,
  status text NOT NULL CHECK (status IN ('success','cache_hit','shared_hit','failed','retry_success','retry_failed','dead_letter')),
  duration_ms integer,
  attempt integer NOT NULL DEFAULT 1,
  error text,
  text_length integer
);
CREATE INDEX translation_logs_created_at_idx ON public.translation_logs (created_at DESC);
CREATE INDEX translation_logs_status_idx ON public.translation_logs (status, created_at DESC);
CREATE INDEX translation_logs_entity_idx ON public.translation_logs (entity_type, entity_key, field, target_lang);

GRANT SELECT ON public.translation_logs TO authenticated;
GRANT ALL ON public.translation_logs TO service_role;
ALTER TABLE public.translation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read translation logs" ON public.translation_logs
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TABLE public.translation_retry_queue (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  entity_type text NOT NULL,
  entity_key text NOT NULL,
  field text NOT NULL,
  target_lang text NOT NULL,
  source_text text NOT NULL,
  source_hash text NOT NULL,
  attempts integer NOT NULL DEFAULT 0,
  next_attempt_at timestamptz NOT NULL DEFAULT now(),
  last_error text,
  UNIQUE (entity_type, entity_key, field, target_lang)
);
CREATE INDEX translation_retry_queue_next_attempt_idx ON public.translation_retry_queue (next_attempt_at);

GRANT SELECT ON public.translation_retry_queue TO authenticated;
GRANT ALL ON public.translation_retry_queue TO service_role;
ALTER TABLE public.translation_retry_queue ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins read retry queue" ON public.translation_retry_queue
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));

-- Schedule a retry pass every 2 minutes via pg_cron + pg_net
CREATE EXTENSION IF NOT EXISTS pg_cron;
CREATE EXTENSION IF NOT EXISTS pg_net;

DO $$ BEGIN
  PERFORM cron.unschedule('process-translation-retries');
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

SELECT cron.schedule(
  'process-translation-retries',
  '*/2 * * * *',
  $$
  SELECT net.http_post(
    url := 'https://radio.indi-art-culture.com/api/public/process-translation-retries',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);
