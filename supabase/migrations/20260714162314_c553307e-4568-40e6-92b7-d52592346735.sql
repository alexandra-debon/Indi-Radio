
-- Revoke default PUBLIC execute on internal SECURITY DEFINER functions.
-- These are used only from triggers or other server-side contexts; they must
-- not be callable via the Data API by anon/authenticated.

REVOKE EXECUTE ON FUNCTION public.protect_profile_privileged_fields() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.award_points(uuid, text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_points_on_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_points_on_request() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_points_on_news_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_points_on_post() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_points_on_post_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notify_news_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notify_wall_mentions() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notify_post_comment() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notify_post_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.trg_notify_news_like() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.touch_notif_prefs_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.notif_pref_enabled(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.calculate_level(integer) FROM PUBLIC, anon, authenticated;

-- Keep public.has_role executable: it is referenced in RLS policies and must
-- be callable by the role evaluating them.
GRANT EXECUTE ON FUNCTION public.has_role(uuid, public.app_role) TO authenticated;

-- Keep award_presence_point callable: it is invoked as an RPC by signed-in listeners.
GRANT EXECUTE ON FUNCTION public.award_presence_point() TO authenticated;
