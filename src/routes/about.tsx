import { createFileRoute } from "@tanstack/react-router";
import { RADIO_CONFIG } from "@/config/radio";
import sacemLogo from "@/assets/sacem-logo.png.asset.json";
import tuneinLogo from "@/assets/tunein-logo.webp.asset.json";
import { IndiLinksBar } from "@/components/about/IndiLinksBar";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "À propos — Radio gratuite musique indépendante InDi RaDio" },
      {
        name: "description",
        content:
          "InDi RaDio, radio gratuite musique indépendante 24/7 sans pub. Découvre la mission, l'équipe et le réseau social musique d'InDi ArT CulTuRe.",
      },
      { name: "keywords", content: "radio gratuite, radio musique indépendante, radio gratuite musique indépendante, radio sans pub, réseau social musique, InDi RaDio, InDi ArT CulTuRe" },
      { property: "og:title", content: "À propos — Radio gratuite musique indépendante InDi RaDio" },
      {
        property: "og:description",
        content: "InDi RaDio, radio gratuite musique indépendante 24/7 sans pub. Découvre la mission, l'équipe et le réseau social musique d'InDi ArT CulTuRe.",
      },
      { property: "og:url", content: "https://radio.indi-art-culture.com/about" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://radio.indi-art-culture.com/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  const t = useT();
  return (
    <div className="space-y-6">
      <IndiLinksBar />
      <section className="space-y-3">
        <h1 className="section-title">{t("page.about.title")}</h1>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>{t("page.about.p1")}</p>
          <p>{t("page.about.p2")}</p>
          <p>
            {t("page.about.moreInfo")}{" "}
            <a
              href="https://www.indi-art-culture.com"
              target="_blank"
              rel="noopener noreferrer"
              className="font-semibold underline"
            >
              www.indi-art-culture.com
            </a>
          </p>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="section-title">{t("page.about.radio")}</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            <strong>{RADIO_CONFIG.stationName}</strong>{" "}
            {t("page.about.radio.p1").replace("{parent}", RADIO_CONFIG.parentStructure)}
          </p>
          <p>{t("page.about.radio.p2").replace("{station}", RADIO_CONFIG.stationName)}</p>
          <p>{t("page.about.radio.p3").replace("{station}", RADIO_CONFIG.stationName)}</p>
          <div className="flex flex-wrap items-start justify-center gap-8 pt-4">
            <img src={sacemLogo.url} alt="Logo SACEM" className="h-20 w-20 object-contain" />
            <div className="flex flex-col items-center gap-1">
              <img src={tuneinLogo.url} alt="Logo TuneIn" className="h-20 w-20 object-contain" />
              <span className="text-xs text-muted-foreground">{t("page.about.tunein.caption")}</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
