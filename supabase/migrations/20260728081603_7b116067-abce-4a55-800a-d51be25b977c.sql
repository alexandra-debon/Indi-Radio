
DROP POLICY IF EXISTS "Pseudo history is publicly readable" ON public.pseudo_history;

CREATE POLICY "Users can read their own pseudo history"
ON public.pseudo_history FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.has_role(auth.uid(), 'admin'));

CREATE OR REPLACE FUNCTION public.resolve_pseudo_alias(_alias text)
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.pseudo
  FROM public.pseudo_history h
  JOIN public.profiles p ON p.id = h.user_id
  WHERE lower(h.old_pseudo) = lower(_alias)
    AND lower(p.pseudo) <> lower(_alias)
  ORDER BY h.changed_at DESC
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.resolve_pseudo_alias(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_pseudo_alias(text) TO anon, authenticated;
