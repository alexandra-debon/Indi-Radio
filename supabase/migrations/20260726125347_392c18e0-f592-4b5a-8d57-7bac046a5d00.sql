
CREATE OR REPLACE FUNCTION public.protect_admin_message_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Admins can modify anything
  IF public.has_role(auth.uid(), 'admin') THEN
    RETURN NEW;
  END IF;

  -- Non-admin recipients: only read_at may change
  IF NEW.user_id       IS DISTINCT FROM OLD.user_id
  OR NEW.sender_id     IS DISTINCT FROM OLD.sender_id
  OR NEW.body          IS DISTINCT FROM OLD.body
  OR NEW.image_url     IS DISTINCT FROM OLD.image_url
  OR NEW.is_from_admin IS DISTINCT FROM OLD.is_from_admin
  OR NEW.created_at    IS DISTINCT FROM OLD.created_at
  OR NEW.id            IS DISTINCT FROM OLD.id THEN
    IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
      RAISE EXCEPTION 'Recipients can only update read_at on admin messages';
    END IF;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_protect_admin_message_fields ON public.admin_messages;
CREATE TRIGGER trg_protect_admin_message_fields
  BEFORE UPDATE ON public.admin_messages
  FOR EACH ROW EXECUTE FUNCTION public.protect_admin_message_fields();
