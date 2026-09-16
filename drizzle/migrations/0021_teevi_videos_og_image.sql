ALTER TABLE public.teevi_videos ADD COLUMN IF NOT EXISTS og_image_url text;
GRANT SELECT ON public.teevi_videos TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.teevi_videos TO authenticated;
GRANT ALL ON public.teevi_videos TO service_role;