import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "@/components/ui/textarea";
import { ThumbsUp, ThumbsDown, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";

const STORAGE_KEY = "indi.onboarding.v1";

type Lang = "fr" | "en";

type Step = {
  title: Record<Lang, string>;
  body: Record<Lang, string>;
  cta?: { to: string; label: Record<Lang, string> };
};

const WELCOME: Record<Lang, { title: string; body: string; go: string; skip: string }> = {
  fr: {
    title: "Bienvenue chez toi",
    body:
      "Tu n'es pas sur une simple radio 100% indépendante — tu es sur un concept unique de radio communautaire. Tu as accès à tout, gratuitement et sans contrepartie. Bon voyage dans un monde fait pour les amoureux de la musique indé : découvre, partage, propose des artistes encore méconnus à la programmation, discute avec auditeurs, artistes et animateurs. On fait un tour ?",
    go: "C'est parti",
    skip: "Passer",
  },
  en: {
    title: "Welcome home",
    body:
      "This isn't just a 100% independent music radio — it's a unique community-driven concept. Everything is free, with no strings attached. Enjoy the ride: discover artists, share, suggest names to the programmers, and chat with listeners, artists and hosts. Shall we take a tour?",
    go: "Let's go",
    skip: "Skip",
  },
};

const STEPS: Step[] = [
  {
    title: { fr: "🎧 Écoute en direct", en: "🎧 Live listening" },
    body: {
      fr: "Le gros bouton play sur la page d'accueil lance la radio 24/7 — sans pub, sans info. La barre de volume à côté fonctionne aussi en Bluetooth / voiture, avec le titre en cours affiché.",
      en: "The big play button on the home page starts the 24/7 stream — no ads, no news. The volume slider works on Bluetooth / car dashboards too, with live track metadata.",
    },
  },
  {
    title: { fr: "💬 Le mur social (Actus)", en: "💬 The social wall (News)" },
    body: {
      fr: "Poste des messages, réagis, commente, like, mentionne @quelquun avec des #hashtags et des emojis. Tu peux naviguer et lire tout sans compte — pour publier ou commenter, il faut juste s'inscrire (c'est gratuit).",
      en: "Post messages, react, comment, like, mention @someone with #hashtags and emojis. You can browse everything without an account — posting or commenting just requires a free signup.",
    },
    cta: { to: "/actus", label: { fr: "Voir les actus", en: "Open the wall" } },
  },
  {
    title: { fr: "🎙️ Émissions, podcasts, chroniques", en: "🎙️ Shows, podcasts, reviews" },
    body: {
      fr: "Réécoute les émissions et podcasts en replay avec barre de progression. Note avec des étoiles, commente, partage. Les clips vidéo sont dans « Clips ».",
      en: "Catch up on shows and podcasts on demand with a progress bar. Rate with stars, comment, share. Music videos live in the “Clips” section.",
    },
    cta: { to: "/emissions", label: { fr: "Émissions", en: "Shows" } },
  },
  {
    title: { fr: "📊 Charts & Top", en: "📊 Charts & Top" },
    body: {
      fr: "Découvre le Top 25 des morceaux les plus likés, les meilleurs podcasts / chroniques et les 25 auditeurs les plus actifs de la communauté.",
      en: "Explore the Top 25 tracks, the best podcasts and reviews, and the 25 most active listeners in the community.",
    },
    cta: { to: "/chart", label: { fr: "Voir les charts", en: "See the charts" } },
  },
  {
    title: { fr: "📖 Magazine InDi Art Culture", en: "📖 InDi Art Culture Magazine" },
    body: {
      fr: "Un magazine interactif type flipbook : articles, portraits, reportages. La version anglaise arrive prochainement.",
      en: "An interactive flipbook magazine: articles, portraits, reports. The English edition is coming soon.",
    },
    cta: { to: "/magazines", label: { fr: "Ouvrir le magazine", en: "Open the magazine" } },
  },
  {
    title: { fr: "🎤 Dédicaces & soumissions", en: "🎤 Shout-outs & submissions" },
    body: {
      fr: "Demande une dédicace à l'antenne, ou si tu es artiste, envoie-nous ta musique via « Soumission artistes ». On écoute tout.",
      en: "Request an on-air shout-out, or if you're an artist, send us your music via “Artist submissions”. We listen to everything.",
    },
    cta: { to: "/soumission-artistes", label: { fr: "Soumettre", en: "Submit" } },
  },
  {
    title: { fr: "👤 Ton profil communautaire", en: "👤 Your community profile" },
    body: {
      fr: "Une fois inscrit·e, personnalise ton pseudo, avatar, bio et liens. Gagne des points, débloque des badges, crée des albums photos et présente-toi à la communauté InDi RaDio.",
      en: "Once signed up, customise your handle, avatar, bio and links. Earn points, unlock badges, create photo albums and introduce yourself to the InDi RaDio community.",
    },
  },
  {
    title: { fr: "🔔 Notifications & partage", en: "🔔 Notifications & sharing" },
    body: {
      fr: "La cloche en haut te prévient des mentions, réponses et nouveautés. Le bouton partage à côté envoie n'importe quelle page ou publication vers Facebook, LinkedIn, Substack, etc. avec un aperçu.",
      en: "The bell in the header alerts you to mentions, replies and updates. The share button beside it sends any page or post to Facebook, LinkedIn, Substack, etc. with a rich preview.",
    },
  },
  {
    title: { fr: "🌍 Français / English", en: "🌍 French / English" },
    body: {
      fr: "Change de langue à tout moment via le sélecteur FR / EN en haut à droite. Les commentaires et publications peuvent aussi être traduits à la volée.",
      en: "Switch language anytime via the FR / EN selector in the top-right. Comments and posts can also be translated on the fly.",
    },
  },
  {
    title: { fr: "✨ Prêt·e à embarquer", en: "✨ Ready to jump in" },
    body: {
      fr: "Tu peux tout écouter et explorer librement. Pour poster, commenter ou dédicacer, il te suffit de créer un compte gratuit. Bienvenue dans la famille InDi RaDio !",
      en: "You can listen and explore freely. To post, comment or send shout-outs, just create a free account. Welcome to the InDi RaDio family!",
    },
  },
];

export function OnboardingTour() {
  const { lang, setLang } = useLang();
  const { loading, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"lang" | "welcome" | "tour" | "feedback" | "done">("lang");
  const [step, setStep] = useState(0);
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (loading) return;
    try {
      const seen = localStorage.getItem(STORAGE_KEY);
      if (!seen) setOpen(true);
    } catch {
      /* noop */
    }
    if (typeof window !== "undefined") {
      const handler = (e: Event) => {
        const detail = (e as CustomEvent<{ lang?: Lang }>).detail;
        if (detail?.lang === "fr" || detail?.lang === "en") {
          setLang(detail.lang);
          setPhase("welcome");
        } else {
          setPhase("lang");
        }
        setStep(0);
        setRating(null);
        setFeedbackMsg("");
        setOpen(true);
      };
      window.addEventListener("indi:open-tour", handler);
      return () => window.removeEventListener("indi:open-tour", handler);
    }
  }, [loading, setLang]);

  function finish() {
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* noop */
    }
    setOpen(false);
    setPhase("done");
  }

  async function submitFeedback(closeAfter: boolean) {
    if (!rating) {
      if (closeAfter) finish();
      return;
    }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("onboarding_feedback").insert({
        user_id: session?.user.id ?? null,
        rating,
        message: feedbackMsg.trim() || null,
        lang: l,
      });
      if (error) throw error;
      toast.success(l === "fr" ? "Merci pour ton avis !" : "Thanks for your feedback!");
    } catch {
      toast.error(l === "fr" ? "Envoi impossible" : "Could not send");
    } finally {
      setSubmitting(false);
      finish();
    }
  }

  const total = STEPS.length;
  const current = STEPS[step];
  const l = lang as Lang;
  const isLast = step === total - 1;

  const nextLabel = useMemo(
    () => (isLast ? (l === "fr" ? "Terminer" : "Finish") : l === "fr" ? "Suivant" : "Next"),
    [isLast, l],
  );
  const prevLabel = l === "fr" ? "Précédent" : "Back";
  const skipLabel = l === "fr" ? "Passer le tour" : "Skip the tour";

  return (
    <Dialog open={open} onOpenChange={(o) => (!o ? finish() : setOpen(true))}>
      <DialogContent className="sm:max-w-lg">
        {phase === "lang" && (
          <>
            <DialogHeader>
              <DialogTitle className="wordmark text-2xl">INDI RADIO</DialogTitle>
              <DialogDescription>
                Choisis ta langue / Choose your language
              </DialogDescription>
            </DialogHeader>
            <div className="grid grid-cols-2 gap-3 py-2">
              <Button
                variant={lang === "fr" ? "default" : "outline"}
                className="h-14 text-lg font-black"
                onClick={() => {
                  setLang("fr");
                  setPhase("welcome");
                }}
              >
                🇫🇷 Français
              </Button>
              <Button
                variant={lang === "en" ? "default" : "outline"}
                className="h-14 text-lg font-black"
                onClick={() => {
                  setLang("en");
                  setPhase("welcome");
                }}
              >
                🇬🇧 English
              </Button>
            </div>
            <DialogFooter>
              <Button variant="ghost" onClick={finish}>
                Skip / Passer
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "welcome" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-2xl">{WELCOME[l].title}</DialogTitle>
              <DialogDescription className="text-base leading-relaxed text-foreground/80">
                {WELCOME[l].body}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
              <Button variant="ghost" onClick={finish}>
                {WELCOME[l].skip}
              </Button>
              <Button onClick={() => { setPhase("tour"); setStep(0); }}>
                {WELCOME[l].go} →
              </Button>
            </DialogFooter>
          </>
        )}

        {phase === "tour" && current && (
          <>
            <DialogHeader>
              <div className="mb-1 flex items-center justify-between text-xs font-bold uppercase tracking-widest text-muted-foreground">
                <span>
                  {l === "fr" ? "Étape" : "Step"} {step + 1} / {total}
                </span>
                <span className="text-primary">
                  {isLast
                    ? l === "fr"
                      ? "Dernière étape"
                      : "Last step"
                    : l === "fr"
                      ? `Encore ${total - step - 1} étape${total - step - 1 > 1 ? "s" : ""}`
                      : `${total - step - 1} step${total - step - 1 > 1 ? "s" : ""} left`}
                </span>
              </div>
              <DialogTitle className="text-xl">{current.title[l]}</DialogTitle>
              <DialogDescription className="text-base leading-relaxed text-foreground/80">
                {current.body[l]}
              </DialogDescription>
            </DialogHeader>

            <div className="my-2 space-y-1">
              <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full bg-primary transition-all duration-300"
                  style={{ width: `${((step + 1) / total) * 100}%` }}
                />
              </div>
              <div className="text-right text-[10px] font-semibold tabular-nums text-muted-foreground">
                {Math.round(((step + 1) / total) * 100)}%
              </div>
            </div>

            {current.cta && (
              <div className="pt-1">
                <Link
                  to={current.cta.to}
                  onClick={finish}
                  className="inline-flex items-center gap-1 text-sm font-semibold text-primary underline underline-offset-4"
                >
                  {current.cta.label[l]} →
                </Link>
              </div>
            )}

            <DialogFooter className="mt-2 flex-row items-center justify-between gap-2 sm:justify-between">
              <Button variant="ghost" size="sm" onClick={finish}>
                {skipLabel}
              </Button>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setStep((s) => Math.max(0, s - 1))}
                  disabled={step === 0}
                >
                  ← {prevLabel}
                </Button>
                <Button
                  size="sm"
                  onClick={() => {
                    if (isLast) setPhase("feedback");
                    else setStep((s) => s + 1);
                  }}
                >
                  {nextLabel} {!isLast && "→"}
                </Button>
              </div>
            </DialogFooter>
          </>
        )}

        {phase === "feedback" && (
          <>
            <DialogHeader>
              <DialogTitle className="text-xl">
                {l === "fr" ? "Ton avis sur le tour ?" : "How was the tour?"}
              </DialogTitle>
              <DialogDescription>
                {l === "fr"
                  ? "Aide-nous à améliorer les prochaines étapes (facultatif)."
                  : "Help us improve the next steps (optional)."}
              </DialogDescription>
            </DialogHeader>
            <div className="flex justify-center gap-4 py-3">
              <Button
                type="button"
                variant={rating === "up" ? "default" : "outline"}
                size="lg"
                onClick={() => setRating("up")}
                className="h-16 w-24"
                aria-label={l === "fr" ? "J'ai aimé" : "I liked it"}
              >
                <ThumbsUp className="size-6" />
              </Button>
              <Button
                type="button"
                variant={rating === "down" ? "default" : "outline"}
                size="lg"
                onClick={() => setRating("down")}
                className="h-16 w-24"
                aria-label={l === "fr" ? "Peut mieux faire" : "Could be better"}
              >
                <ThumbsDown className="size-6" />
              </Button>
            </div>
            <Textarea
              value={feedbackMsg}
              onChange={(e) => setFeedbackMsg(e.target.value)}
              maxLength={500}
              placeholder={
                l === "fr"
                  ? "Un mot pour nous aider à améliorer (facultatif)…"
                  : "A quick word to help us improve (optional)…"
              }
              className="min-h-[80px]"
            />
            <DialogFooter className="mt-2 flex-row justify-between gap-2 sm:justify-between">
              <Button variant="ghost" onClick={finish} disabled={submitting}>
                {l === "fr" ? "Passer" : "Skip"}
              </Button>
              <Button onClick={() => submitFeedback(true)} disabled={submitting || !rating}>
                {submitting && <Loader2 className="size-4 animate-spin" />}
                {l === "fr" ? "Envoyer" : "Send"}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

export function openOnboardingTour(lang?: "fr" | "en") {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    /* noop */
  }
  window.dispatchEvent(new CustomEvent("indi:open-tour", { detail: { lang } }));
}