import cover from "@/assets/indi-art-culture-n01-cover.jpg.asset.json";
import { Button } from "@/components/ui/button";
import { useLang } from "@/lib/i18n";
import { ShoppingBag } from "lucide-react";

export const SUBSCRIBE_URL = "https://www.indi-art-culture.com/abonnement";

const TXT = {
  fr: {
    badge: "Nouveau · N°1 · Novembre 2026",
    title: "InDi(E) ArT CulTuRe N°1",
    lead: "En couverture : bESS, l'indescriptible humanité du rock.",
    toc: "Nick Drake, le voyageur du temps · Soho, sauvé par les artistes · Le visage de Sia a un nom · Inconnu à cette adresse · Nostalgeek",
    cta: "S'abonner et acheter le magazine",
    alt: "Couverture du magazine InDi(E) ArT CulTuRe N°1 avec bESS",
  },
  en: {
    badge: "New · Issue 1 · November 2026",
    title: "InDi(E) ArT CulTuRe Issue 1",
    lead: "Cover story: bESS, the indescribable humanity of rock.",
    toc: "Nick Drake, the time traveller · Soho, saved by artists · Sia's face has a name · Address Unknown · Nostalgeek",
    cta: "Subscribe and buy the magazine",
    alt: "Cover of InDi(E) ArT CulTuRe magazine issue 1 featuring bESS",
  },
} as const;

export function FeaturedIssue() {
  const { lang } = useLang();
  const t = TXT[lang === "en" ? "en" : "fr"];
  return (
    <section className="card-brut grid gap-4 p-4 sm:grid-cols-[minmax(0,220px)_1fr] sm:items-center">
      <a href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer" className="mx-auto block w-full max-w-[260px]">
        <img src={cover.url} alt={t.alt} width={1358} height={1920} className="w-full rounded shadow-lg" loading="eager" />
      </a>
      <div className="space-y-3">
        <span className="inline-block rounded bg-primary px-2 py-0.5 text-xs font-bold uppercase tracking-wide text-primary-foreground">
          {t.badge}
        </span>
        <h2 className="text-2xl font-bold leading-tight">{t.title}</h2>
        <p className="text-sm font-semibold">{t.lead}</p>
        <p className="text-sm text-muted-foreground">{t.toc}</p>
        <Button asChild size="lg">
          <a href={SUBSCRIBE_URL} target="_blank" rel="noopener noreferrer">
            <ShoppingBag className="size-4" /> {t.cta}
          </a>
        </Button>
      </div>
    </section>
  );
}
