ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS banner_color text,
  ADD COLUMN IF NOT EXISTS page_indexable boolean NOT NULL DEFAULT true;

GRANT SELECT (banner_color, page_indexable) ON public.profiles TO anon;
GRANT SELECT (banner_color, page_indexable) ON public.profiles TO authenticated;
GRANT UPDATE (banner_color, page_indexable) ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
