
-- Views: run as invoker
ALTER VIEW public.chart_week SET (security_invoker = true);
ALTER VIEW public.chart_all_time SET (security_invoker = true);

-- Lock down SECURITY DEFINER helpers
REVOKE EXECUTE ON FUNCTION public.award_points(uuid, text, int) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_points_on_post() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_points_on_news_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_points_on_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_points_on_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.protect_profile_privileged_fields() FROM PUBLIC, anon, authenticated;

-- has_role: allow authenticated to check own roles (used by RLS policies via SECURITY DEFINER context anyway)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated, service_role;

-- Presence award: only authenticated users, and only for themselves via server function
REVOKE EXECUTE ON FUNCTION public.award_presence_point(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.award_presence_point(uuid) TO authenticated, service_role;
