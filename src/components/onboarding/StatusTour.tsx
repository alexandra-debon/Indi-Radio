import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";

/** Flag posé à la fin de l'onboarding : la visite s'affichera au prochain écran. */
const ARM_KEY = "indi.statusTour.arm";
/** Flag posé une fois la visite vue (ou passée). */
const SEEN_KEY = "indi.statusTour.v1";

export function armStatusTour() {
  try {
    window.localStorage.setItem(ARM_KEY, "1");
    window.localStorage.removeItem(SEEN_KEY);
  } catch {
    /* noop */
  }
}

type Step = { title: string; body: string };

const LISTENER_STEPS: Step[] = [
  {
    title: "🎧 La radio, d'abord",
    body: "Le gros bouton play lance le direct 24/7, sans pub ni info. Le titre en cours s'affiche en bas de l'écran, et le son continue même si tu navigues ailleurs.",
  },
  {
    title: "💬 InDi ReZo en Direct",
    body: "Le mur social de la page d'accueil : publie un mot, une photo ou une vidéo, réponds aux autres et mentionne-les avec @pseudo. La lecture est libre, publier demande juste d'être connecté.",
  },
  {
    title: "❤️ Likes & dédicaces",
    body: "Like le titre en cours pour le faire monter dans le Chart des auditeurs, et envoie une dédicace depuis la page Dédicaces : l'équipe la lit et peut la passer à l'antenne.",
  },
  {
    title: "👤 Ton profil",
    body: "Ta punchline et ta bio s'affichent sur ton profil public, avec tes points et tes badges. Tu peux les modifier à tout moment depuis « Mon profil ».",
  },
];

const PENDING_STEPS: (role: string) => Step[] = (role) => [
  {
    title: "⏳ Ta candidature est en cours d'examen",
    body: `Ta demande de statut ${role} vient d'arriver chez nous. L'équipe InDi Art Culture la lit une par une — tu recevras une notification et un email dès qu'elle est validée.`,
  },
  {
    title: "✅ En attendant, tout fonctionne",
    body: "Ton compte est actif comme auditeur : tu peux écouter, publier sur InDi ReZo, commenter, liker et envoyer des dédicaces. Rien n'est bloqué.",
  },
  {
    title: "🎁 Ce qui se débloque une fois certifié",
    body: "Le badge certifié sur ton profil et tes publications, ta présence dans la Galerie Artistes, et l'accès aux fonctionnalités dédiées à venir (page dédiée, mise en avant éditoriale).",
  },
  {
    title: "📨 Une question ?",
    body: "Le Chat Team Indi (la bulle jaune du lecteur) te met en relation directe avec l'équipe, et la page Contact reste ouverte à tout moment.",
  },
];

export function StatusTour() {
  const { profile, loading } = useAuth();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const status = (profile as any)?.role_request_status as string | undefined;
  const requested = (profile as any)?.role_requested as string | undefined;
  const isPending = status === "pending";

  useEffect(() => {
    if (loading || !profile) return;
    try {
      if (window.localStorage.getItem(ARM_KEY) !== "1") return;
      if (window.localStorage.getItem(SEEN_KEY)) return;
    } catch {
      return;
    }
    setStep(0);
    setOpen(true);
  }, [loading, profile]);

  const steps = isPending
    ? PENDING_STEPS(requested === "media" ? "Média" : "Artiste")
    : LISTENER_STEPS;
  const current = steps[step];
  const isLast = step === steps.length - 1;

  function finish() {
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
      window.localStorage.removeItem(ARM_KEY);
    } catch {
      /* noop */
    }
    setOpen(false);
  }

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : finish())}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle className="text-xl">{current.title}</DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-foreground/80">
            {current.body}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-1.5 py-1">
          {steps.map((s, i) => (
            <span
              key={s.title}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30")
              }
            />
          ))}
        </div>
        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button variant="ghost" onClick={finish}>
            Passer
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                Retour
              </Button>
            )}
            <Button onClick={() => (isLast ? finish() : setStep((s) => s + 1))}>
              {isLast ? "C'est compris" : "Suivant →"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
