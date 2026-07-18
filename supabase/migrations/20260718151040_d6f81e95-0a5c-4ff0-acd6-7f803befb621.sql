-- 1) Restrict is_quarantined() execution to authenticated users only
REVOKE EXECUTE ON FUNCTION public.is_quarantined(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_quarantined(uuid) TO authenticated, service_role;

-- 2) Add missing WITH CHECK on post_comments UPDATE policy
DROP POLICY IF EXISTS "post_comments update own" ON public.post_comments;
CREATE POLICY "post_comments update own" ON public.post_comments
FOR UPDATE TO authenticated
USING (auth.uid() = author_id)
WITH CHECK (auth.uid() = author_id);