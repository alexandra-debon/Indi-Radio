ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS role_requested public.app_role,
  ADD COLUMN IF NOT EXISTS role_request_status text,
  ADD COLUMN IF NOT EXISTS role_request_note text,
  ADD COLUMN IF NOT EXISTS role_request_submitted_at timestamptz,
  ADD COLUMN IF NOT EXISTS role_request_reviewed_at timestamptz,
  ADD COLUMN IF NOT EXISTS punchline text;

ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_role_request_status_check
  CHECK (role_request_status IS NULL OR role_request_status IN ('pending','approved','rejected'));

CREATE INDEX IF NOT EXISTS profiles_role_request_status_idx
  ON public.profiles (role_request_status)
  WHERE role_request_status = 'pending';

-- Column-level protection: extend the existing privileged-field guard so a
-- candidate cannot approve their own request.
CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.is_certified IS DISTINCT FROM OLD.is_certified
      OR NEW.is_team_indi IS DISTINCT FROM OLD.is_team_indi
      OR NEW.badges IS DISTINCT FROM OLD.badges
      OR NEW.points IS DISTINCT FROM OLD.points
      OR NEW.level IS DISTINCT FROM OLD.level
      OR NEW.role_request_reviewed_at IS DISTINCT FROM OLD.role_request_reviewed_at
      OR (NEW.role_request_status IS DISTINCT FROM OLD.role_request_status
          AND NEW.role_request_status IS DISTINCT FROM 'pending'))
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
      RAISE EXCEPTION 'Not allowed to modify privileged profile fields';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- In-app notification for every admin when a new role application lands.
CREATE OR REPLACE FUNCTION public.trg_notify_role_request()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
DECLARE
  a record;
BEGIN
  IF NEW.role_request_status = 'pending'
     AND (OLD.role_request_status IS DISTINCT FROM 'pending'
          OR OLD.role_request_submitted_at IS DISTINCT FROM NEW.role_request_submitted_at) THEN
    FOR a IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
      VALUES (
        a.id,
        NEW.id,
        'role_request',
        COALESCE(NEW.pseudo, 'Un membre') || ' demande le statut ' || COALESCE(NEW.role_requested::text, 'artiste'),
        '/admin/candidatures'
      );
    END LOOP;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_role_request ON public.profiles;
CREATE TRIGGER notify_role_request
  AFTER UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.trg_notify_role_request();