DROP VIEW IF EXISTS public.chart_week;
DROP VIEW IF EXISTS public.chart_all_time;

CREATE VIEW public.chart_week WITH (security_invoker = true) AS
SELECT
  min(t.id::text) AS id,
  t.title,
  t.artist,
  count(DISTINCT l.id)::integer AS likes,
  count(DISTINCT t.id)::integer AS plays
FROM public.track_history t
LEFT JOIN public.track_likes l ON l.track_history_id = t.id
WHERE t.played_at >= (now() - interval '7 days')
GROUP BY t.title, t.artist
ORDER BY count(DISTINCT l.id) DESC, count(DISTINCT t.id) DESC, max(t.played_at) DESC
LIMIT 25;

CREATE VIEW public.chart_all_time WITH (security_invoker = true) AS
SELECT
  min(t.id::text) AS id,
  t.title,
  t.artist,
  count(DISTINCT l.id)::integer AS likes,
  count(DISTINCT t.id)::integer AS plays
FROM public.track_history t
LEFT JOIN public.track_likes l ON l.track_history_id = t.id
GROUP BY t.title, t.artist
ORDER BY count(DISTINCT l.id) DESC, count(DISTINCT t.id) DESC, max(t.played_at) DESC
LIMIT 25;

GRANT SELECT ON public.chart_week TO anon, authenticated;
GRANT SELECT ON public.chart_all_time TO anon, authenticated;