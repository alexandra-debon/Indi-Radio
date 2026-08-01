CREATE OR REPLACE FUNCTION public.record_current_track(_title text, _artist text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_title text := btrim(_title);
  v_artist text := COALESCE(NULLIF(btrim(_artist), ''), 'Inconnu');
  v_last record;
  v_id uuid;
BEGIN
  IF v_title IS NULL OR length(v_title) = 0 THEN
    RETURN jsonb_build_object('ok', false, 'reason', 'empty');
  END IF;

  -- Serialize concurrent scrapes so the read-then-insert cannot race.
  PERFORM pg_advisory_xact_lock(hashtext('track_history_record'));

  SELECT id, title, artist, played_at INTO v_last
  FROM public.track_history
  ORDER BY played_at DESC
  LIMIT 1;

  IF v_last.id IS NOT NULL
     AND v_last.title = v_title
     AND v_last.artist = v_artist THEN
    RETURN jsonb_build_object('ok', true, 'changed', false, 'id', v_last.id);
  END IF;

  -- Extra guard: same track re-announced within 60s is not a new play.
  IF EXISTS (
    SELECT 1 FROM public.track_history
    WHERE title = v_title AND artist = v_artist
      AND played_at > now() - interval '60 seconds'
  ) THEN
    RETURN jsonb_build_object('ok', true, 'changed', false);
  END IF;

  INSERT INTO public.track_history (title, artist)
  VALUES (v_title, v_artist)
  RETURNING id INTO v_id;

  RETURN jsonb_build_object('ok', true, 'changed', true, 'id', v_id);
END;
$$;

REVOKE ALL ON FUNCTION public.record_current_track(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_current_track(text, text) TO anon, authenticated, service_role;