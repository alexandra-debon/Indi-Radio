CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_pseudo text;
  v_admin uuid;
BEGIN
  v_pseudo := COALESCE(NEW.raw_user_meta_data->>'pseudo', 'auditeur_' || substr(NEW.id::text, 1, 8));
  WHILE EXISTS (SELECT 1 FROM public.profiles WHERE pseudo = v_pseudo) LOOP
    v_pseudo := v_pseudo || '_' || substr(md5(random()::text), 1, 4);
  END LOOP;

  INSERT INTO public.profiles (id, pseudo, role, points, level, is_certified)
  VALUES (NEW.id, v_pseudo, 'auditeur', 0, 1, false);

  FOR v_admin IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
    INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
    VALUES (v_admin, NEW.id, 'signup',
      'Nouvelle inscription : ' || v_pseudo,
      '/admin');
  END LOOP;

  RETURN NEW;
END; $function$;