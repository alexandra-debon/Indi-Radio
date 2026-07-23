DO $$
DECLARE
  t text;
  tables text[] := ARRAY['profiles','news_posts','shows','episodes','posts'];
  has_created boolean;
BEGIN
  FOREACH t IN ARRAY tables LOOP
    EXECUTE format(
      'ALTER TABLE public.%I ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now()',
      t
    );
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema='public' AND table_name=t AND column_name='created_at'
    ) INTO has_created;
    IF has_created THEN
      EXECUTE format(
        'UPDATE public.%I SET updated_at = COALESCE(created_at, now()) WHERE updated_at IS NULL',
        t
      );
    END IF;
    EXECUTE format('DROP TRIGGER IF EXISTS set_updated_at ON public.%I', t);
    EXECUTE format(
      'CREATE TRIGGER set_updated_at BEFORE UPDATE ON public.%I FOR EACH ROW EXECUTE FUNCTION public.set_updated_at_timestamp()',
      t
    );
  END LOOP;
END $$;