CREATE OR REPLACE FUNCTION public.notify_search_engines(_path text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF _path IS NULL OR _path = '' THEN
    RETURN;
  END IF;
  PERFORM net.http_post(
    url := 'https://www.radio.indi-art-culture.com/api/public/hooks/indexnow',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('paths', jsonb_build_array(_path))
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'IndexNow ping failed for %: %', _path, SQLERRM;
END;
$function$;

CREATE OR REPLACE FUNCTION public.notify_search_engines_paths(_paths text[])
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_clean text[];
BEGIN
  SELECT COALESCE(array_agg(DISTINCT p), '{}')
    INTO v_clean
    FROM unnest(COALESCE(_paths, '{}')) AS p
   WHERE p IS NOT NULL AND btrim(p) <> '' AND left(btrim(p), 1) = '/';

  IF array_length(v_clean, 1) IS NULL THEN
    RETURN;
  END IF;

  PERFORM net.http_post(
    url := 'https://www.radio.indi-art-culture.com/api/public/hooks/indexnow',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := jsonb_build_object('paths', to_jsonb(v_clean))
  );
EXCEPTION WHEN OTHERS THEN
  RAISE WARNING 'IndexNow batch ping failed: %', SQLERRM;
END;
$function$;

CREATE OR REPLACE FUNCTION public.trg_notify_admin_message()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_actor_pseudo text;
  v_target_pseudo text;
  v_admin uuid;
  v_msg text;
  v_preview text;
BEGIN
  v_preview := COALESCE(NULLIF(btrim(NEW.body), ''), '[image]');
  IF length(v_preview) > 80 THEN v_preview := substring(v_preview from 1 for 77) || '…'; END IF;

  SELECT pseudo INTO v_actor_pseudo FROM public.profiles WHERE id = NEW.sender_id;

  IF NEW.is_from_admin THEN
    v_msg := 'InDi RaDio t''a répondu : ' || v_preview;
    INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
    VALUES (NEW.user_id, NEW.sender_id, 'admin_message', v_msg, '/messages');
  ELSE
    SELECT pseudo INTO v_target_pseudo FROM public.profiles WHERE id = NEW.user_id;
    v_msg := COALESCE(v_actor_pseudo, 'Un auditeur') || ' t''a envoyé un message : ' || v_preview;
    FOR v_admin IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
      VALUES (v_admin, NEW.sender_id, 'admin_message', v_msg, '/admin/messages');
    END LOOP;

    BEGIN
      PERFORM extensions.http_post(
        url := 'https://www.radio.indi-art-culture.com/api/public/admin-message-email',
        body := jsonb_build_object('message_id', NEW.id),
        headers := jsonb_build_object('Content-Type','application/json')
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_dispatch_mention_email()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
BEGIN
  IF NEW.type <> 'mention' THEN RETURN NEW; END IF;
  PERFORM extensions.http_post(
    url := 'https://www.radio.indi-art-culture.com/api/public/mention-email',
    body := jsonb_build_object('notification_id', NEW.id),
    headers := jsonb_build_object('Content-Type','application/json')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END; $function$;

CREATE OR REPLACE FUNCTION public.trg_prewarm_translation()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_entity_type text := COALESCE(TG_ARGV[0], TG_TABLE_NAME);
  v_key_col text := COALESCE(TG_ARGV[1], 'id');
  v_row jsonb := to_jsonb(NEW);
  v_old jsonb := CASE WHEN TG_OP = 'UPDATE' THEN to_jsonb(OLD) ELSE '{}'::jsonb END;
  v_key text := v_row->>v_key_col;
  v_items jsonb := '[]'::jsonb;
  v_field text;
  v_text text;
  v_prev text;
  i int;
  v_len int := COALESCE(array_length(TG_ARGV, 1), 0);
BEGIN
  IF v_key IS NULL OR v_len < 3 THEN RETURN NEW; END IF;
  FOR i IN 2..(v_len - 1) LOOP
    v_field := TG_ARGV[i];
    v_text := v_row->>v_field;
    v_prev := v_old->>v_field;
    IF v_text IS NOT NULL AND length(btrim(v_text)) >= 2
       AND (TG_OP = 'INSERT' OR v_text IS DISTINCT FROM v_prev) THEN
      v_items := v_items || jsonb_build_object(
        'entityType', v_entity_type,
        'entityKey', v_key,
        'field', v_field,
        'text', v_text
      );
    END IF;
  END LOOP;
  IF jsonb_array_length(v_items) = 0 THEN RETURN NEW; END IF;
  PERFORM extensions.http_post(
    url := 'https://www.radio.indi-art-culture.com/api/public/prewarm-translation',
    body := jsonb_build_object('items', v_items),
    headers := jsonb_build_object('Content-Type','application/json')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  RETURN NEW;
END; $function$;

SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'process-translation-retries'),
  command := $cmd$
  SELECT net.http_post(
    url := 'https://www.radio.indi-art-culture.com/api/public/process-translation-retries',
    headers := '{"Content-Type":"application/json"}'::jsonb,
    body := '{}'::jsonb
  );
$cmd$);

SELECT cron.alter_job(
  (SELECT jobid FROM cron.job WHERE jobname = 'ping-sitemaps-daily'),
  command := $cmd$
  SELECT net.http_post(
    url := 'https://www.radio.indi-art-culture.com/api/public/hooks/ping-sitemaps',
    headers := '{"Content-Type": "application/json", "apikey": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNlcW1lanN2anBncHZmaWFubmhqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODQwMTI2NzIsImV4cCI6MjA5OTU4ODY3Mn0.sjMrdtPvWeVrpIhuqpYOqDmREXMuHNXC71Oy2A8yFo8"}'::jsonb,
    body := '{}'::jsonb
  );
$cmd$);