-- Revoke EXECUTE from public/anon/authenticated on internal trigger & helper functions.
-- Triggers still fire (they run as table owner), but PostgREST can no longer call them.
DO $$
DECLARE
  fn text;
  internal_fns text[] := ARRAY[
    'protect_profile_privileged_fields()',
    'protect_post_pin_fields()',
    'trg_points_on_post()',
    'trg_points_on_comment()',
    'trg_points_on_request()',
    'trg_points_on_news_like()',
    'trg_points_on_post_like()',
    'trg_notify_post_like()',
    'trg_notify_news_like()',
    'trg_notify_news_comment()',
    'trg_notify_post_comment()',
    'trg_notify_wall_mentions()',
    'trg_notify_news_post_mentions()',
    'trg_notify_news_comment_mentions()',
    'trg_notify_post_comment_mentions()',
    'trg_notify_content_comment_mentions()',
    'trg_notify_content_comment_reply()',
    'trg_notify_admin_request()',
    'notify_mentions_from_text(uuid, text, text)',
    'award_points(uuid, text, integer)',
    'handle_new_user()',
    'touch_notif_prefs_updated_at()',
    'touch_album_reviews_updated_at()',
    'touch_clip_entries_updated_at()',
    'touch_magazine_entries_updated_at()',
    'site_settings_touch_updated_at()'
  ];
BEGIN
  FOREACH fn IN ARRAY internal_fns LOOP
    EXECUTE format('REVOKE ALL ON FUNCTION public.%s FROM PUBLIC, anon, authenticated', fn);
  END LOOP;
END $$;