-- Allow guests (anon) to read comment activity across the app.
-- The SELECT policies on news_comments and post_comments call public.is_quarantined(),
-- which was previously restricted to authenticated. Anon lost EXECUTE, so the policy
-- silently filtered out every row for signed-out visitors. Restore EXECUTE for anon.
GRANT EXECUTE ON FUNCTION public.is_quarantined(uuid) TO anon;

-- Episode ratings had no SELECT grant for anon, hiding star averages from guests.
GRANT SELECT ON public.episode_ratings TO anon;