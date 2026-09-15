CREATE TABLE public.village_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id)
);

GRANT SELECT, INSERT, DELETE ON public.village_subscriptions TO authenticated;
GRANT ALL ON public.village_subscriptions TO service_role;

ALTER TABLE public.village_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users read own village subscription"
  ON public.village_subscriptions FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Users subscribe themselves"
  ON public.village_subscriptions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users unsubscribe themselves"
  ON public.village_subscriptions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.trg_notify_village_subscribers()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name text;
  v_msg text;
BEGIN
  IF NEW.published IS NOT TRUE THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'UPDATE' THEN
    IF OLD.published IS TRUE
       AND NEW.title IS NOT DISTINCT FROM OLD.title
       AND NEW.content IS NOT DISTINCT FROM OLD.content
       AND NEW.excerpt IS NOT DISTINCT FROM OLD.excerpt
       AND NEW.cover_url IS NOT DISTINCT FROM OLD.cover_url
       AND NEW.video_url IS NOT DISTINCT FROM OLD.video_url THEN
      RETURN NEW;
    END IF;
  END IF;

  SELECT COALESCE(NULLIF(stage_name, ''), pseudo) INTO v_name
  FROM public.profiles WHERE id = NEW.author_id;
  v_name := COALESCE(v_name, 'Un rédacteur');

  IF TG_OP = 'UPDATE' AND OLD.published IS TRUE THEN
    v_msg := v_name || ' a mis à jour un article RéDaK''Village : ' || NEW.title;
  ELSE
    v_msg := v_name || ' a publié un article RéDaK''Village : ' || NEW.title;
  END IF;

  INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
  SELECT s.user_id, NEW.author_id, 'village_article', v_msg, '/redak-village/' || NEW.slug
  FROM public.village_subscriptions s
  WHERE s.user_id <> NEW.author_id;

  RETURN NEW;
END;
$$;

CREATE TRIGGER village_articles_notify_subscribers
AFTER INSERT OR UPDATE ON public.village_articles
FOR EACH ROW EXECUTE FUNCTION public.trg_notify_village_subscribers();