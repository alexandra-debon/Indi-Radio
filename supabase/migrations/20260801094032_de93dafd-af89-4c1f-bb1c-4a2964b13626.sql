
REVOKE ALL ON FUNCTION public.notify_search_engines(text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_indexnow_album_reviews() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_indexnow_news_posts() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_indexnow_shows() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_indexnow_episodes() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_indexnow_magazine_entries() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_indexnow_clip_entries() FROM PUBLIC, anon, authenticated;
