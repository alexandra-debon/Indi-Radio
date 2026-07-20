import { createFileRoute } from "@tanstack/react-router";
import { RADIO_CONFIG } from "@/config/radio";
import sacemLogo from "@/assets/sacem-logo.png.asset.json";
import tuneinLogo from "@/assets/tunein-logo.webp.asset.json";
import { IndiLinksBar } from "@/components/about/IndiLinksBar";
import { useT } from "@/lib/i18n";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "À propos d'InDi ArT CulTuRe — Hub des arts indépendants" },
      {
        name: "description",
        content:
          "InDi ArT CulTuRe : magazine interactif et hub communautaire des arts indépendants, à l'origine d'Indi Radio, le flux 24/7 dédié à la scène indé.",
      },
      { property: "og:title", content: "À propos d'InDi ArT CulTuRe — Hub des arts indépendants" },
      {
        property: "og:description",
        content: "Découvrez InDi ArT CulTuRe, hub des arts indépendants, et sa radio Indi Radio.",
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
          <p>
            <strong>InDi ArT CulTuRe</strong> est composé d’une radio internationale 100% musique
            indé et émissions originales sans pub ni infos, d’un magazine interactif innovant et un
            hub communautaire dédié aux arts indépendants. Un espace où artistes, chroniqueurs,
            auditeurs et passeurs de culture se croisent, s'écoutent, et font vivre la scène indé
            déjà présent gratuitement sur l’application radio.
          </p>
          <p>
            Issue de la société à mission fondée par Alexandra Debon (Melody Alex. Patrick) «
            Whisper and Map », le droit d’auteur et la promotion de la culture indépendante ainsi
            qu’une rémunération plus juste des artistes sont parmi les fondements des statuts de
            cette dernière.
          </p>
          <p>
            Plus d’infos :{" "}
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
            <strong>{RADIO_CONFIG.stationName}</strong> est la radio de{" "}
            {RADIO_CONFIG.parentStructure} : un flux 24/7, la voix de la structure, ouverte à tous
            sans barrière à l'écoute. Pas besoin de compte pour écouter. Créer un compte débloque le
            mur social, les likes, les votes et les dédicaces.
          </p>
          <p>
            Nous tenons à respecter les droits d’auteurs conformément à nos statuts.{" "}
            <strong>{RADIO_CONFIG.stationName}</strong> est titulaire d’une licence SACEM concernant
            la radio et les podcasts et cotisera à la SPRE chaque fin d’année pour respecter comme
            il se doit les artistes et leurs productions.
          </p>
          <p>
            <strong>{RADIO_CONFIG.stationName}</strong> est une radio non-commerciale, sans
            publicité et sans informations généralistes hors culture. Elle demeure sous statut
            particulier durant ses premiers mois d’existence au nom de sa fondatrice Alexandra Debon
            (Melody Alex. Patrick) avant de rejoindre définitivement la société à mission à la fin
            de cette année 2026.
          </p>
          <div className="flex flex-wrap items-start justify-center gap-8 pt-4">
            <img src={sacemLogo.url} alt="Logo SACEM" className="h-20 w-20 object-contain" />
            <div className="flex flex-col items-center gap-1">
              <img src={tuneinLogo.url} alt="Logo TuneIn" className="h-20 w-20 object-contain" />
              <span className="text-xs text-muted-foreground">Diffusion internationale</span>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
