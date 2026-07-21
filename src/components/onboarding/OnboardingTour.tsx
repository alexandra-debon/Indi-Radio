import { useEffect, useMemo, useRef, useState, useId } from "react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useLang } from "@/lib/i18n";
import { useAuth } from "@/hooks/use-auth";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ThumbsUp, ThumbsDown, Loader2, ListChecks, ArrowRight } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { TourSpotlight, type TourStep } from "./TourSpotlight";
import { setTourDemoActive, DEMO_PSEUDO } from "@/lib/tour-demo";

const STORAGE_KEY = "indi.onboarding.v1";

export type Lang = "fr" | "en";

export type Step = {
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

const TOUR_STEPS: TourStep[] = [
  {
    id: "demo-user",
    target: "[data-tour='login-button']",
    title: { fr: "👋 Compte de démo", en: "👋 Demo account" },
    body: {
      fr: `Pendant ce tour, on t'accompagne avec un utilisateur imaginaire, @${DEMO_PSEUDO}, pour te montrer à quoi ressemble l'expérience une fois connecté. Rien n'est enregistré — c'est juste pour la visite.`,
      en: `During this tour, we walk you through with an imaginary user, @${DEMO_PSEUDO}, to show what the experience looks like once signed in. Nothing is saved — it's just for the visit.`,
    },
    placement: "bottom",
  },
  {
    id: "radio-player",
    target: "[data-tour='radio-player']",
    title: { fr: "🎧 Écoute en direct", en: "🎧 Live listening" },
    body: {
      fr: "Le gros bouton play lance la radio 24/7 — sans pub, sans info. Le titre en cours s'affiche ici, et fonctionne aussi en Bluetooth / voiture.",
      en: "The big play button starts the 24/7 stream — no ads, no news. The current track is shown here, and also works on Bluetooth / car dashboards.",
    },
    placement: "bottom",
  },
  {
    id: "volume-control",
    target: "[data-tour='volume-control']",
    title: { fr: "🔊 Volume", en: "🔊 Volume" },
    body: {
      fr: "Règle le volume ou coupe le son. Cette barre fonctionne sur desktop, mobile et les applications iOS / Android à venir.",
      en: "Adjust the volume or mute. This slider works on desktop, mobile and the upcoming iOS / Android apps.",
    },
    placement: "top",
  },
  {
    id: "social-wall",
    target: "[data-tour='social-wall']",
    title: { fr: "💬 Le mur social", en: "💬 The social wall" },
    body: {
      fr: "Poste des messages, réagis, commente, mentionne @pseudo et utilise #hashtag. Tu peux lire tout sans compte — pour publier, il faut juste t'inscrire (gratuit).",
      en: "Post messages, react, comment, mention @someone and use #hashtag. You can browse everything without an account — posting just requires a free signup.",
    },
    placement: "top",
  },
  {
    id: "chart-link",
    target: "[data-tour='chart-link']",
    title: { fr: "📊 Charts & Top", en: "📊 Charts & Top" },
    body: {
      fr: "Découvre le Top 25 des morceaux les plus likés, les meilleurs podcasts / chroniques et les 25 auditeurs les plus actifs de la communauté.",
      en: "Explore the Top 25 tracks, the best podcasts and reviews, and the 25 most active listeners in the community.",
    },
    placement: "bottom",
  },
  {
    id: "language-toggle",
    target: "[data-tour='language-toggle']",
    title: { fr: "🌍 Français / English", en: "🌍 French / English" },
    body: {
      fr: "Change de langue à tout moment via FR / EN. Les commentaires et publications peuvent aussi être traduits à la volée.",
      en: "Switch language anytime via FR / EN. Comments and posts can also be translated on the fly.",
    },
    placement: "bottom",
  },
  {
    id: "notifications-bell",
    target: "[data-tour='notifications-bell']",
    title: { fr: "🔔 Notifications", en: "🔔 Notifications" },
    body: {
      fr: "La cloche te prévient des mentions, réponses et nouveautés. Tu peux aussi couper uniquement les mentions @pseudo dans les paramètres.",
      en: "The bell alerts you to mentions, replies and updates. You can also turn off @mention alerts only in settings.",
    },
    placement: "bottom",
  },
  {
    id: "share-button",
    target: "[data-tour='share-button']",
    title: { fr: "📤 Partage", en: "📤 Sharing" },
    body: {
      fr: "Le bouton partage envoie n'importe quelle page ou publication vers Facebook, LinkedIn, Substack, etc. avec un aperçu.",
      en: "The share button sends any page or post to Facebook, LinkedIn, Substack, etc. with a rich preview.",
    },
    placement: "bottom",
  },
  {
    id: "menu-button",
    target: "[data-tour='menu-button']",
    title: { fr: "☰ Menu complet", en: "☰ Full menu" },
    body: {
      fr: "Ouvre le menu pour accéder aux émissions, podcasts, clips, magazines, dédicaces, soumissions artistes, contact et plus encore.",
      en: "Open the menu to access shows, podcasts, clips, magazines, dedications, artist submissions, contact and more.",
    },
    placement: "right",
  },
  {
    id: "login-button",
    target: "[data-tour='login-button']",
    title: { fr: "👤 Connexion", en: "👤 Sign in" },
    body: {
      fr: "Inscris-toi ou connecte-toi pour poster, commenter, liker, dédicacer et débloquer ton profil communautaire.",
      en: "Sign up or sign in to post, comment, like, send shout-outs and unlock your community profile.",
    },
    placement: "bottom",
  },
  {
    id: "tour-button",
    target: "[data-tour='tour-button']",
    title: { fr: "🗺️ Toujours relancer le tour", en: "🗺️ Restart the tour anytime" },
    body: {
      fr: "Ce bouton Tour reste accessible sur la page d'accueil et dans ton profil pour relancer le guide quand tu veux.",
      en: "This Tour button stays on the home page and in your profile so you can restart the guide anytime.",
    },
    placement: "bottom",
  },
];

export function OnboardingTour() {
  const { lang, setLang, t } = useLang();
  const { loading, session } = useAuth();
  const [open, setOpen] = useState(false);
  const [phase, setPhase] = useState<"lang" | "welcome" | "tour" | "summary" | "feedback" | "done">("lang");
  const [step, setStep] = useState(0);
  const [rating, setRating] = useState<"up" | "down" | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);
  const stepHeadingRef = useRef<HTMLHeadingElement>(null);
  const feedbackHeadingRef = useRef<HTMLHeadingElement>(null);
  const feedbackMsgId = useId();
  const stepDescId = useId();

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
        setDontShowAgain(false);
        setOpen(true);
      };
      window.addEventListener("indi:open-tour", handler);
      return () => window.removeEventListener("indi:open-tour", handler);
    }
  }, [loading, setLang]);

  useEffect(() => {
    setTourDemoActive(
      (phase === "welcome" || phase === "tour" || phase === "summary" || phase === "feedback") && open,
    );
    return () => setTourDemoActive(false);
  }, [phase, open]);

  function savePreference() {
    try {
      localStorage.setItem(STORAGE_KEY, dontShowAgain ? "dismissed" : "1");
    } catch {
      /* noop */
    }
  }

  function finish() {
    savePreference();
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

  const total = TOUR_STEPS.length;
  const current = TOUR_STEPS[step];
  const l = lang as Lang;
  const isLast = step === total - 1;

  useEffect(() => {
    if (phase === "tour") {
      stepHeadingRef.current?.focus();
    } else if (phase === "feedback") {
      feedbackHeadingRef.current?.focus();
    }
  }, [phase, step]);

  const nextLabel = useMemo(() => (isLast ? t("tour.finish") : t("tour.next")), [isLast, t]);
  const prevLabel = t("tour.back");
  const skipLabel = t("tour.skip");
  const dontShowLabel = t("tour.dontShow");

  return (
    <>
      {phase !== "tour" && (
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
                  {skipLabel}
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

              <div className="mb-2 flex items-center gap-2">
                <Checkbox
                  id="welcome-dont-show"
                  checked={dontShowAgain}
                  onCheckedChange={(c) => setDontShowAgain(c === true)}
                />
                <Label htmlFor="welcome-dont-show" className="cursor-pointer text-sm font-semibold">
                  {dontShowLabel}
                </Label>
              </div>

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
          {phase === "summary" && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2 text-xl">
                  <ListChecks className="size-5 text-primary" />
                  {l === "fr" ? "Résumé du tour" : "Tour summary"}
                </DialogTitle>
                <DialogDescription>
                  {l === "fr"
                    ? "Toutes les sections que tu viens de voir. Clique pour revenir sur l'une d'elles."
                    : "Everything you just saw. Click any section to revisit it."}
                </DialogDescription>
              </DialogHeader>
              <ol className="max-h-[55vh] space-y-2 overflow-auto pr-1">
                {TOUR_STEPS.map((s, i) => (
                  <li key={s.id}>
                    <button
                      type="button"
                      onClick={() => { setStep(i); setPhase("tour"); }}
                      className="group flex w-full items-start gap-3 rounded-md border-2 border-black bg-background px-3 py-2 text-left shadow-[2px_2px_0_0_#000] transition hover:-translate-y-0.5 hover:bg-primary/10 hover:shadow-[3px_3px_0_0_#000] focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                    >
                      <span className="grid size-7 shrink-0 place-items-center rounded-full border-2 border-black bg-primary text-xs font-black text-black">
                        {i + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-bold">{s.title[l]}</span>
                        <span className="mt-0.5 line-clamp-2 block text-xs text-muted-foreground">{s.body[l]}</span>
                      </span>
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary" />
                    </button>
                  </li>
                ))}
              </ol>
              <div className="mb-1 flex items-center gap-2">
                <Checkbox
                  id="summary-dont-show"
                  checked={dontShowAgain}
                  onCheckedChange={(c) => setDontShowAgain(c === true)}
                />
                <Label htmlFor="summary-dont-show" className="cursor-pointer text-sm font-semibold">
                  {dontShowLabel}
                </Label>
              </div>
              <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
                <Button variant="ghost" onClick={finish}>
                  {t("tour.close")}
                </Button>
                <Button onClick={() => setPhase("feedback")}>
                  {l === "fr" ? "Donner mon avis" : "Give feedback"} →
                </Button>
              </DialogFooter>
            </>
          )}
          {phase === "feedback" && (
            <>
              <DialogHeader>
                <DialogTitle
                  ref={feedbackHeadingRef}
                  tabIndex={-1}
                  className="text-xl outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 rounded"
                >
                  {t("tour.howWasTour")}
                </DialogTitle>
                <DialogDescription>{t("tour.helpImprove")}</DialogDescription>
              </DialogHeader>

              <div
                className="flex justify-center gap-4 py-3"
                role="radiogroup"
                aria-label={t("tour.rate")}
              >
                <Button
                  type="button"
                  variant={rating === "up" ? "default" : "outline"}
                  size="lg"
                  onClick={() => setRating("up")}
                  className="h-16 w-24"
                  role="radio"
                  aria-checked={rating === "up"}
                  aria-label={t("tour.liked")}
                >
                  <ThumbsUp className="size-6" aria-hidden="true" />
                </Button>
                <Button
                  type="button"
                  variant={rating === "down" ? "default" : "outline"}
                  size="lg"
                  onClick={() => setRating("down")}
                  className="h-16 w-24"
                  role="radio"
                  aria-checked={rating === "down"}
                  aria-label={t("tour.couldBeBetter")}
                >
                  <ThumbsDown className="size-6" aria-hidden="true" />
                </Button>
              </div>

              <div className="space-y-2">
                <Label htmlFor={feedbackMsgId}>{t("tour.commentOptional")}</Label>
                <Textarea
                  id={feedbackMsgId}
                  value={feedbackMsg}
                  onChange={(e) => setFeedbackMsg(e.target.value)}
                  placeholder={t("tour.feedbackPlaceholder")}
                  rows={3}
                  maxLength={500}
                  aria-describedby={`${feedbackMsgId}-count`}
                />
                <div id={`${feedbackMsgId}-count`} className="text-right text-xs text-muted-foreground">
                  {feedbackMsg.length} / 500
                </div>
              </div>

              <div className="mb-2 flex items-center gap-2">
                <Checkbox
                  id="feedback-dont-show"
                  checked={dontShowAgain}
                  onCheckedChange={(c) => setDontShowAgain(c === true)}
                />
                <Label htmlFor="feedback-dont-show" className="cursor-pointer text-sm font-semibold">
                  {dontShowLabel}
                </Label>
              </div>

              <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
                <Button variant="ghost" onClick={() => finish()}>
                  {t("tour.close")}
                </Button>
                <Button onClick={() => submitFeedback(true)} disabled={submitting}>
                  {submitting ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
                  {t("tour.sendFeedback")}
                </Button>
              </DialogFooter>
            </>
          )}
          </DialogContent>
        </Dialog>
      )}

      {phase === "tour" && open && (
        <TourSpotlight
          open={open}
          steps={TOUR_STEPS}
          step={step}
          lang={l}
          dontShowAgain={dontShowAgain}
          onToggleDontShowAgain={setDontShowAgain}
          onNext={() => {
            if (isLast) {
              savePreference();
              setPhase("summary");
            } else {
              setStep((s) => s + 1);
            }
          }}
          onPrev={() => setStep((s) => Math.max(0, s - 1))}
          onSkip={() => finish()}
          onFinish={() => {
            savePreference();
            setPhase("summary");
          }}
        />
      )}
    </>
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
