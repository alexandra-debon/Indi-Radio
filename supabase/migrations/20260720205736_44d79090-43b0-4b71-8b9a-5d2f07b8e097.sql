-- Enable pg_net for outbound HTTP from triggers
CREATE EXTENSION IF NOT EXISTS pg_net WITH SCHEMA extensions;

-- Idempotency marker so we email at most once per mention notification
ALTER TABLE public.notifications
  ADD COLUMN IF NOT EXISTS mention_email_sent_at timestamptz;

-- Trigger fn: on mention insert, ping the public route to send the email
CREATE OR REPLACE FUNCTION public.trg_dispatch_mention_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public','extensions'
AS $$
BEGIN
  IF NEW.type <> 'mention' THEN RETURN NEW; END IF;
  PERFORM extensions.http_post(
    url := 'https://radio.indi-art-culture.com/api/public/mention-email',
    body := jsonb_build_object('notification_id', NEW.id),
    headers := jsonb_build_object('Content-Type','application/json')
  );
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- never block the notification insert on a network failure
  RETURN NEW;
END; $$;

REVOKE ALL ON FUNCTION public.trg_dispatch_mention_email() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS notifications_mention_email ON public.notifications;
CREATE TRIGGER notifications_mention_email
  AFTER INSERT ON public.notifications
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_dispatch_mention_email();