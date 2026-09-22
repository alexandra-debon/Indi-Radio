CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = 'public'
AS $$
DECLARE
  _claims_role text;
BEGIN
  IF pg_trigger_depth() > 1 THEN
    RETURN NEW;
  END IF;

  -- Trusted server-side writes (service role) are always allowed.
  BEGIN
    _claims_role := nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role';
  EXCEPTION WHEN others THEN
    _claims_role := NULL;
  END;

  IF _claims_role = 'service_role'
     OR current_setting('role', true) = 'service_role'
     OR current_user = 'service_role' THEN
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