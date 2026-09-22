ALTER TABLE public.user_blocks ADD COLUMN IF NOT EXISTS reason text;
COMMENT ON COLUMN public.user_blocks.reason IS 'Motif facultatif saisi par le membre au moment du blocage';