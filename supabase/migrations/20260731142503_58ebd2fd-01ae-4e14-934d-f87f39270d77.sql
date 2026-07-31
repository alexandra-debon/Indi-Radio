-- Remove blanket SELECT and re-grant every column EXCEPT quarantine_reason
REVOKE SELECT ON public.profiles FROM anon, authenticated;

GRANT SELECT (
  id, pseudo, role, is_certified, avatar_url, points, level, created_at,
  is_team_indi, badges, quarantined_at, bio, website, social_links, lang,
  updated_at, stage_name, gallery_visible, gallery_cover_url, gallery_summary
) ON public.profiles TO anon, authenticated;

GRANT ALL ON public.profiles TO service_role;