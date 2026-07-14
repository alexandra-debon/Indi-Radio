import { createFileRoute } from "@tanstack/react-router";
import { RADIO_CONFIG } from "@/config/radio";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "À propos d'InDi ArT CulTuRe — Hub des arts indépendants" },
      { name: "description", content: "InDi ArT CulTuRe : magazine interactif et hub communautaire des arts indépendants, à l'origine d'Indi Radio, le flux 24/7 dédié à la scène indé." },
      { property: "og:title", content: "À propos d'InDi ArT CulTuRe — Hub des arts indépendants" },
      { property: "og:description", content: "Découvrez InDi ArT CulTuRe, hub des arts indépendants, et sa radio Indi Radio." },
      { property: "og:url", content: "https://radio.indi-art-culture.com/about" },
      { property: "og:type", content: "website" },
    ],
    links: [{ rel: "canonical", href: "https://radio.indi-art-culture.com/about" }],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="section-title">À propos d'InDi ArT CulTuRe — Hub des arts indépendants</h1>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            <strong>InDi ArT CulTuRe</strong> est un magazine interactif et un hub communautaire dédié aux
            arts indépendants. Un espace où artistes, chroniqueurs, auditeurs et passeurs de culture se
            croisent, s'écoutent, et font vivre la scène indé.
          </p>
        </div>
      </section>
      <section className="space-y-3">
        <h2 className="section-title">Indi Radio</h2>
        <div className="card-brut space-y-3 p-4 text-sm leading-relaxed">
          <p>
            <strong>{RADIO_CONFIG.stationName}</strong> est la radio de {RADIO_CONFIG.parentStructure} :
            un flux 24/7, la voix de la structure, ouverte à tous sans barrière à l'écoute. Pas besoin de
            compte pour écouter. Créer un compte débloque le mur social, les likes, les votes et les
            dédicaces.
          </p>
        </div>
      </section>
    </div>
  );
}