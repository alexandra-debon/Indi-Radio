import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { ShieldCheck } from "lucide-react";
import { isNative } from "@/lib/native";
import { useLang } from "@/lib/i18n";
import {
  getAnalyticsConsent,
  loadPlausible,
  setAnalyticsConsent,
  trackPageview,
} from "@/lib/plausible";

/** Bandeau de consentement analytics (web uniquement, Plausible chargé après acceptation). */
export function CookieConsent() {
  const { lang } = useLang();
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (isNative()) return;
    const stored = getAnalyticsConsent();
    if (stored === "accepted") {
      loadPlausible();
      trackPageview();
    } else if (stored !== "refused") setVisible(true);
  }, []);

  if (!visible) return null;

  const decide = (choice: "accepted" | "refused") => {
    setAnalyticsConsent(choice);
    if (choice === "accepted") trackPageview();
    setVisible(false);
  };

  const fr = lang === "fr";

  return (
    <div
      role="dialog"
      aria-label={fr ? "Consentement aux mesures d'audience" : "Analytics consent"}
      className="fixed inset-x-3 bottom-24 z-[70] mx-auto max-w-2xl rounded-xl border border-primary/40 bg-card/95 p-4 shadow-lg backdrop-blur md:bottom-28"
    >
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" aria-hidden />
        <div className="space-y-2 text-sm">
          <p className="font-semibold text-foreground">
            {fr ? "Mesure d'audience éthique" : "Ethical analytics"}
          </p>
          <p className="text-muted-foreground">
            {fr
              ? "Nous utilisons Plausible, une solution européenne, sans publicité et respectueuse de la vie privée : contrairement à Google Analytics, aucune donnée personnelle n'est revendue, aucun profil publicitaire n'est créé et aucun suivi entre sites n'est effectué. Les statistiques sont anonymes et agrégées."
              : "We use Plausible, a European, ad-free and privacy-first solution: unlike Google Analytics, no personal data is sold, no advertising profile is built and no cross-site tracking happens. Statistics stay anonymous and aggregated."}
          </p>
          <div className="flex flex-wrap gap-2 pt-1">
            <Button size="sm" onClick={() => decide("accepted")}>
              {fr ? "Accepter" : "Accept"}
            </Button>
            <Button size="sm" variant="outline" onClick={() => decide("refused")}>
              {fr ? "Refuser" : "Decline"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}