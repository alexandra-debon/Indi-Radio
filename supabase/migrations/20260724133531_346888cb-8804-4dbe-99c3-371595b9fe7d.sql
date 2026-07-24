
-- Auto-ping IndexNow whenever a pseudo change is recorded, so search engines
-- re-crawl the alias and the new canonical /u/$pseudo quickly.
CREATE OR REPLACE FUNCTION public.ping_indexnow_on_pseudo_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  current_pseudo text;
  payload jsonb;
BEGIN
  SELECT pseudo INTO current_pseudo FROM public.profiles WHERE id = NEW.user_id;

  payload := jsonb_build_object(
    'pseudos',
    jsonb_strip_nulls(
      jsonb_build_array(NEW.old_pseudo, current_pseudo)
    )
  );

  PERFORM net.http_post(
    url := 'https://project--d580aa7f-5dc8-42f8-b519-9acbc3ba6330.lovable.app/api/public/hooks/indexnow',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body := payload
  );

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Never block a pseudo change if the ping fails.
  RAISE WARNING 'IndexNow ping failed: %', SQLERRM;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_ping_indexnow_on_pseudo_change ON public.pseudo_history;
CREATE TRIGGER trg_ping_indexnow_on_pseudo_change
AFTER INSERT ON public.pseudo_history
FOR EACH ROW EXECUTE FUNCTION public.ping_indexnow_on_pseudo_change();

REVOKE EXECUTE ON FUNCTION public.ping_indexnow_on_pseudo_change() FROM PUBLIC;
