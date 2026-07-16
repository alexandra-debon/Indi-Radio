
CREATE OR REPLACE FUNCTION public.trg_notify_admin_request()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_actor_pseudo text;
  v_admin uuid;
  v_msg text;
BEGIN
  SELECT pseudo INTO v_actor_pseudo FROM public.profiles WHERE id = NEW.author_id;
  v_msg := COALESCE(v_actor_pseudo, 'Quelqu''un') || ' a envoyé une dédicace'
    || CASE WHEN NEW.track_requested IS NOT NULL AND length(NEW.track_requested) > 0
            THEN ' : ' || NEW.track_requested ELSE '' END;

  FOR v_admin IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
    VALUES (v_admin, NEW.author_id, 'dedicace', v_msg, '/admin');
  END LOOP;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_admin_on_request ON public.requests;
CREATE TRIGGER notify_admin_on_request
AFTER INSERT ON public.requests
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_admin_request();
