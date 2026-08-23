REVOKE EXECUTE ON FUNCTION public.can_publish_news(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.can_publish_news(uuid) TO authenticated, service_role;