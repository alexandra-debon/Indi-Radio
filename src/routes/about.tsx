import { createFileRoute } from "@tanstack/react-router";
import { RADIO_CONFIG } from "@/config/radio";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "À propos — Indi Radio" },
      { name: "description", content: "Indi Radio est la radio d'InDi ArT CulTuRe, magazine interactif et hub communautaire des arts indépendants." },
      { property: "og:title", content: "À propos — Indi Radio" },
      { property: "og:description", content: "Découvrez InDi ArT CulTuRe et sa radio, Indi Radio." },
    ],
  }),
  component: AboutPage,
});

function AboutPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="section-title">InDi ArT CulTuRe</h1>
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