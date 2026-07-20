
REVOKE ALL ON FUNCTION public.notify_new_mentions_from_text(uuid, text, text, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_notify_wall_mentions() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_notify_wall_mentions_upd() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_notify_album_mentions_ins() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.trg_notify_album_mentions_upd() FROM PUBLIC, anon, authenticated;
