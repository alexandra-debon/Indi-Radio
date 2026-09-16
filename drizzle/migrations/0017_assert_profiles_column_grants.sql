-- Rejoue et fige les GRANT par colonne sur public.profiles (Blocs 1 à 5).
-- Idempotent : rejouable sans effet de bord.
GRANT SELECT (
  id, pseudo, role, is_certified, avatar_url, points, level, created_at,
  is_team_indi, badges, quarantined_at, bio, website, social_links, lang,
  updated_at, stage_name, gallery_visible, gallery_cover_url, gallery_summary,
  punchline, banner_url, accent_color,
  show_events_section, show_shop_section, show_posts_section
) ON public.profiles TO anon;

GRANT SELECT (
  id, pseudo, role, is_certified, avatar_url, points, level, created_at,
  is_team_indi, badges, quarantined_at, bio, website, social_links, lang,
  updated_at, stage_name, gallery_visible, gallery_cover_url, gallery_summary,
  punchline, banner_url, accent_color,
  show_events_section, show_shop_section, show_posts_section,
  role_requested, role_request_status, role_request_note,
  role_request_submitted_at, role_request_reviewed_at
) ON public.profiles TO authenticated;

GRANT UPDATE (
  pseudo, avatar_url, bio, website, social_links, lang, stage_name,
  gallery_visible, gallery_cover_url, gallery_summary,
  punchline, banner_url, accent_color,
  show_events_section, show_shop_section, show_posts_section,
  role_requested, role_request_status, role_request_note,
  role_request_submitted_at, role_request_reviewed_at
) ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;

-- Tables liées ajoutées aux Blocs 2 à 5 : grants au niveau table (toutes colonnes couvertes).
GRANT SELECT ON public.artist_events TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_events TO authenticated;
GRANT ALL ON public.artist_events TO service_role;

GRANT SELECT ON public.artist_follows TO anon;
GRANT SELECT, INSERT, DELETE ON public.artist_follows TO authenticated;
GRANT ALL ON public.artist_follows TO service_role;

GRANT SELECT ON public.artist_shop_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.artist_shop_items TO authenticated;
GRANT ALL ON public.artist_shop_items TO service_role;

GRANT SELECT ON public.village_articles TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.village_articles TO authenticated;
GRANT ALL ON public.village_articles TO service_role;

GRANT SELECT, INSERT, DELETE ON public.village_subscriptions TO authenticated;
GRANT ALL ON public.village_subscriptions TO service_role;

GRANT SELECT ON public.magazine_entries TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.magazine_entries TO authenticated;
GRANT ALL ON public.magazine_entries TO service_role;

GRANT SELECT ON public.posts TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.posts TO authenticated;
GRANT ALL ON public.posts TO service_role;