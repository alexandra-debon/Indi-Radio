-- Chat direct utilisateur ↔ admin (Indi Radio)
CREATE TABLE public.admin_messages (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  sender_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  body TEXT,
  image_url TEXT,
  is_from_admin BOOLEAN NOT NULL DEFAULT false,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT admin_messages_body_or_image CHECK (
    (body IS NOT NULL AND length(btrim(body)) > 0) OR image_url IS NOT NULL
  )
);

CREATE INDEX admin_messages_user_id_created_idx ON public.admin_messages(user_id, created_at DESC);
CREATE INDEX admin_messages_unread_admin_idx ON public.admin_messages(user_id) WHERE is_from_admin = false AND read_at IS NULL;
CREATE INDEX admin_messages_unread_user_idx ON public.admin_messages(user_id) WHERE is_from_admin = true  AND read_at IS NULL;

GRANT SELECT, INSERT, UPDATE ON public.admin_messages TO authenticated;
GRANT ALL ON public.admin_messages TO service_role;

ALTER TABLE public.admin_messages ENABLE ROW LEVEL SECURITY;

-- L'utilisateur voit son propre fil ; les admins voient tout
CREATE POLICY "Users can view their own thread"
  ON public.admin_messages FOR SELECT TO authenticated
  USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));

-- L'utilisateur écrit dans son propre fil sans se faire passer pour un admin
CREATE POLICY "Users can send in their own thread"
  ON public.admin_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    AND auth.uid() = sender_id
    AND is_from_admin = false
  );

-- Les admins écrivent dans n'importe quel fil, marqués comme admin
CREATE POLICY "Admins can reply in any thread"
  ON public.admin_messages FOR INSERT TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'admin')
    AND auth.uid() = sender_id
    AND is_from_admin = true
  );

-- Marquage lu : chacun peut marquer les messages qu'il reçoit
CREATE POLICY "Recipients can mark as read"
  ON public.admin_messages FOR UPDATE TO authenticated
  USING (
    (auth.uid() = user_id AND is_from_admin = true)
    OR public.has_role(auth.uid(), 'admin')
  )
  WITH CHECK (
    (auth.uid() = user_id AND is_from_admin = true)
    OR public.has_role(auth.uid(), 'admin')
  );

-- Notification + email dispatch
CREATE OR REPLACE FUNCTION public.trg_notify_admin_message()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public', 'extensions'
AS $function$
DECLARE
  v_actor_pseudo text;
  v_target_pseudo text;
  v_admin uuid;
  v_msg text;
  v_preview text;
BEGIN
  v_preview := COALESCE(NULLIF(btrim(NEW.body), ''), '[image]');
  IF length(v_preview) > 80 THEN v_preview := substring(v_preview from 1 for 77) || '…'; END IF;

  SELECT pseudo INTO v_actor_pseudo FROM public.profiles WHERE id = NEW.sender_id;

  IF NEW.is_from_admin THEN
    -- Notifier l'utilisateur destinataire
    v_msg := 'InDi RaDio t''a répondu : ' || v_preview;
    INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
    VALUES (NEW.user_id, NEW.sender_id, 'admin_message', v_msg, '/messages');
  ELSE
    -- Notifier tous les admins
    SELECT pseudo INTO v_target_pseudo FROM public.profiles WHERE id = NEW.user_id;
    v_msg := COALESCE(v_actor_pseudo, 'Un auditeur') || ' t''a envoyé un message : ' || v_preview;
    FOR v_admin IN SELECT id FROM public.profiles WHERE role = 'admin' LOOP
      INSERT INTO public.notifications (recipient_id, actor_id, type, message, url)
      VALUES (v_admin, NEW.sender_id, 'admin_message', v_msg, '/admin/messages');
    END LOOP;

    -- Dispatch email vers les admins (non bloquant)
    BEGIN
      PERFORM extensions.http_post(
        url := 'https://radio.indi-art-culture.com/api/public/admin-message-email',
        body := jsonb_build_object('message_id', NEW.id),
        headers := jsonb_build_object('Content-Type','application/json')
      );
    EXCEPTION WHEN OTHERS THEN NULL;
    END;
  END IF;

  RETURN NEW;
END; $function$;

REVOKE EXECUTE ON FUNCTION public.trg_notify_admin_message() FROM PUBLIC;

CREATE TRIGGER admin_messages_notify
  AFTER INSERT ON public.admin_messages
  FOR EACH ROW EXECUTE FUNCTION public.trg_notify_admin_message();

-- Temps réel
ALTER PUBLICATION supabase_realtime ADD TABLE public.admin_messages;