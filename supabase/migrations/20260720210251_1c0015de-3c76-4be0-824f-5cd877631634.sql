DROP TRIGGER IF EXISTS touch_newsletter_subscribers_updated_at ON public.newsletter_subscribers;
DROP FUNCTION IF EXISTS public.update_newsletter_subscribers_updated_at();

ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS source text DEFAULT NULL;
ALTER TABLE public.newsletter_subscribers ADD COLUMN IF NOT EXISTS gdpr_consent_at timestamp with time zone DEFAULT NULL;

COMMENT ON COLUMN public.newsletter_subscribers.source IS 'Source d''inscription (page, footer, modal, etc.)';
COMMENT ON COLUMN public.newsletter_subscribers.gdpr_consent_at IS 'Date de consentement RGPD explicite';