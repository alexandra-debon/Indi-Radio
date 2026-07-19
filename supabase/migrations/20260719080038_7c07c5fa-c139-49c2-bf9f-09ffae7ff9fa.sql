CREATE OR REPLACE FUNCTION public.protect_profile_privileged_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  IF (NEW.role IS DISTINCT FROM OLD.role
      OR NEW.is_certified IS DISTINCT FROM OLD.is_certified
      OR NEW.is_team_indi IS DISTINCT FROM OLD.is_team_indi
      OR NEW.badges IS DISTINCT FROM OLD.badges
      OR NEW.points IS DISTINCT FROM OLD.points
      OR NEW.level IS DISTINCT FROM OLD.level)
     AND NOT public.has_role(auth.uid(), 'admin') THEN
    IF current_setting('request.jwt.claims', true) IS NOT NULL THEN
      RAISE EXCEPTION 'Not allowed to modify privileged profile fields';
    END IF;
  END IF;
  RETURN NEW;
END; $function$;