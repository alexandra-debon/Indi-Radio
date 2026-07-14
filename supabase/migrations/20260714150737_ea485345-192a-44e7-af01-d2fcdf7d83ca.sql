
REVOKE EXECUTE ON FUNCTION public.protect_profile_privileged_fields() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_points_on_comment() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_points_on_request() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_points_on_post() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.trg_points_on_news_like() FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.award_points(uuid, text, integer) FROM PUBLIC, authenticated, anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC, authenticated, anon;
