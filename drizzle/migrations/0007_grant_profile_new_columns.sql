-- Les colonnes ajoutées aux blocs 1 à 3 n'avaient pas de GRANT : la page
-- publique /u/:pseudo échouait en 42501 (permission denied for table profiles).
GRANT SELECT (punchline, banner_url, accent_color, show_events_section, show_shop_section, show_posts_section)
  ON public.profiles TO anon;

GRANT SELECT (punchline, banner_url, accent_color, show_events_section, show_shop_section, show_posts_section,
              role_requested, role_request_status, role_request_note, role_request_submitted_at, role_request_reviewed_at)
  ON public.profiles TO authenticated;

GRANT UPDATE (punchline, banner_url, accent_color, show_events_section, show_shop_section, show_posts_section,
              role_requested, role_request_status, role_request_note, role_request_submitted_at, role_request_reviewed_at)
  ON public.profiles TO authenticated;

GRANT ALL ON public.profiles TO service_role;