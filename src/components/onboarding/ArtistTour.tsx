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
import { useLang } from "@/lib/i18n";

/** Visite guidée dédiée aux artistes (et médias) — vue une seule fois. */
const SEEN_KEY = "indi.artistTour.v2";
const OPEN_EVENT = "indi:open-artist-tour";

type Step = { fr: { title: string; body: string }; en: { title: string; body: string } };

const STEPS: Step[] = [
  {
    fr: {
      title: "🎛️ Ton espace artiste",
      body: "Depuis « Ma page artiste », tu personnalises tout : bannière (photo ou aplat de couleur), couleur d'accent, résumé de présentation et liens vers tes réseaux et plateformes. Tout est modifiable à tout moment.",
    },
    en: {
      title: "🎛️ Your artist space",
      body: "From “My artist page” you customise everything: banner (photo or solid colour), accent colour, presentation summary and links to your socials and streaming platforms. Everything stays editable at any time.",
    },
  },
  {
    fr: {
      title: "🧩 Les blocs activables",
      body: "Trois blocs s'activent ou se masquent d'un clic : Dates de concert (avec lien billetterie), Boutique (disques, merch, billets — 100 % reversé à toi) et Publications (ton blog artiste). Un bloc masqué disparaît entièrement de ta page publique.",
    },
    en: {
      title: "🧩 Sections you can switch on",
      body: "Three sections toggle on or off in one click: Shows (with ticket links), Shop (records, merch, tickets — 100% goes to you) and Posts (your artist blog). A hidden section disappears entirely from your public page.",
    },
  },
  {
    fr: {
      title: "👁️ Qui voit tes publications",
      body: "À chaque publication, tu choisis sa diffusion : « Mur public » (visible de tous sur InDi ReZo), « Abonnés seulement » (réservée à celles et ceux qui te suivent) ou « Ma page uniquement » (visible seulement sur ta page artiste). Tu peux changer ce réglage après coup.",
    },
    en: {
      title: "👁️ Who sees your posts",
      body: "For every post you pick its reach: “Public wall” (everyone on InDi ReZo), “Followers only” (just the people following you) or “My page only” (only on your artist page). You can change it afterwards.",
    },
  },
  {
    fr: {
      title: "✅ Tu es certifié·e",
      body: "Ta page artiste est publique : badge certifié, présence dans la Galerie Artistes, boutique en achat direct (0 % de commission, 100 % reversé à toi) et dates de concert visibles par tous les visiteurs, même sans compte.",
    },
    en: {
      title: "✅ You're certified",
      body: "Your artist page is public: certified badge, listing in the Artists Gallery, direct-purchase shop (0% commission, 100% goes to you) and shows visible to every visitor, even without an account.",
    },
  },
];

export function openArtistTour() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent(OPEN_EVENT));
}

export function ArtistTour() {
  const { profile, loading } = useAuth();
  const { lang, setLang } = useLang();
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  const role = (profile as Record<string, unknown> | null)?.["role"] as string | undefined;
  const requested = (profile as Record<string, unknown> | null)?.["role_requested"] as
    | string
    | undefined;
  void requested;
  const certified = (profile as Record<string, unknown> | null)?.["is_certified"] === true;
  // Le tour artiste ne s'active que pour les artistes/médias certifiés.
  const isArtist = certified && (role === "artiste" || role === "media");

  useEffect(() => {
    if (loading || !profile || !isArtist) return;
    try {
      if (window.localStorage.getItem(SEEN_KEY)) return;
    } catch {
      return;
    }
    setStep(0);
    setOpen(true);
  }, [loading, profile, isArtist]);

  useEffect(() => {
    const onOpen = () => {
      setStep(0);
      setOpen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, []);

  const l = lang === "en" ? "en" : "fr";
  const current = STEPS[step]?.[l];
  const isLast = step === STEPS.length - 1;

  function finish() {
    try {
      window.localStorage.setItem(SEEN_KEY, "1");
    } catch {
      /* noop */
    }
    setOpen(false);
  }

  if (!current) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : finish())}>
      <DialogContent className="sm:max-w-lg">
        <div className="flex justify-end gap-1">
          <Button
            size="sm"
            variant={l === "fr" ? "default" : "outline"}
            onClick={() => setLang("fr")}
          >
            FR
          </Button>
          <Button
            size="sm"
            variant={l === "en" ? "default" : "outline"}
            onClick={() => setLang("en")}
          >
            EN
          </Button>
        </div>
        <DialogHeader>
          <DialogTitle className="text-xl">{current.title}</DialogTitle>
          <DialogDescription className="text-base leading-relaxed text-foreground/80">
            {current.body}
          </DialogDescription>
        </DialogHeader>
        <div className="flex justify-center gap-1.5 py-1">
          {STEPS.map((s, i) => (
            <span
              key={s.fr.title}
              className={
                "h-1.5 rounded-full transition-all " +
                (i === step ? "w-6 bg-primary" : "w-1.5 bg-muted-foreground/30")
              }
            />
          ))}
        </div>
        <DialogFooter className="flex-row justify-between gap-2 sm:justify-between">
          <Button variant="ghost" onClick={finish}>
            {l === "en" ? "Skip" : "Passer"}
          </Button>
          <div className="flex gap-2">
            {step > 0 && (
              <Button variant="outline" onClick={() => setStep((s) => s - 1)}>
                {l === "en" ? "Back" : "Retour"}
              </Button>
            )}
            <Button onClick={() => (isLast ? finish() : setStep((s) => s + 1))}>
              {isLast
                ? l === "en"
                  ? "Got it"
                  : "C'est compris"
                : l === "en"
                  ? "Next →"
                  : "Suivant →"}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
