import { createFileRoute } from "@tanstack/react-router";
import { Mail, Heart, ShieldCheck, Music, Gift, Users } from "lucide-react";
import ogSoumission from "@/assets/og-soumission-artistes.jpg";

const BASE_URL = "https://radio.indi-art-culture.com";
const OG_SOUMISSION = `${BASE_URL}${ogSoumission}`;

export const Route = createFileRoute("/soumission-artistes")({
  head: () => ({
    meta: [
      { title: "Soumission artistes — InDi RaDio" },
      {
        name: "description",
        content:
          "Soumettez votre musique à InDi RaDio. Soumission 100% gratuite, relation directe avec les créateurs et respect des droits d'auteur.",
      },
      { property: "og:title", content: "Soumission artistes — InDi RaDio" },
      {
        property: "og:description",
        content:
          "Soumettez votre univers musical à InDi RaDio. Gratuit, transparent et engagé envers les artistes.",
      },
      { property: "og:url", content: "https://radio.indi-art-culture.com/soumission-artistes" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_SOUMISSION },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "twitter:card", content: "summary_large_image" },
      { property: "twitter:image", content: OG_SOUMISSION },
    ],
    links: [{ rel: "canonical", href: "https://radio.indi-art-culture.com/soumission-artistes" }],
  }),
  component: ArtistSubmissionPage,
});

const SECTIONS = [
  {
    icon: Gift,
    title: "Gratuité totale",
    body: "InDi RaDio explore le monde en quête de nouveaux talents. Si nous envisageons de collaborer avec des plateformes de mise en relation de qualité comme Groover à l'avenir, notre priorité absolue est de garantir la gratuité totale de la soumission. Pour nous, la création doit rester accessible à tous.",
  },
  {
    icon: Mail,
    title: "Comment nous soumettre vos musiques ?",
    body: "Rien de plus simple : contactez-nous directement à l'adresse radio@indi-art-culture.com.",
  },
  {
    icon: Users,
    title: "Une relation privilégiée avec les créateurs",
    body: "Si votre musique résonne avec notre identité, nous vous offrirons un accès certifié à notre plateforme. C'est l'occasion pour vous de tisser un lien direct, authentique et durable avec nos auditeurs.",
  },
  {
    icon: ShieldCheck,
    title: "Transparence et respect des droits",
    body: "InDi RaDio s'engage pour une webradio responsable. Le respect des droits d'auteur et des artistes est au cœur de notre démarche. C'est pourquoi, tout comme nous envoyons les relevés à la SACEM et SoundExchange, nous vous fournirons un récapitulatif précis de la diffusion de vos œuvres.",
  },
  {
    icon: Heart,
    title: "Notre ligne éditoriale : l'émotion avant tout",
    body: "InDi RaDio porte une identité forte. Une réponse négative ne remet jamais en question votre talent. Nos choix sont avant tout une question d'émotion et de sensibilité — des critères profondément subjectifs. Comme les plus belles maisons, les nôtres demeurent terriblement personnelles. Soyez assurés que, dans tous les cas, nous prendrons le temps de vous expliquer les raisons de notre décision.",
  },
];

function ArtistSubmissionPage() {
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Music className="size-7 text-radio-yellow" />
          <h1 className="section-title">Appel aux Artistes : Soumettez votre univers à InDi RaDio</h1>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Vous êtes artiste indépendant ? Faites découvrir votre musique à la communauté InDi RaDio.
        </p>
      </section>

      {SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <section key={section.title} className="card-brut space-y-3 p-4">
            <div className="flex items-center gap-2">
              <Icon className="size-5 text-radio-yellow" />
              <h2 className="font-display text-base uppercase tracking-wide">{section.title}</h2>
            </div>
            <p className="text-sm leading-relaxed">{section.body}</p>
          </section>
        );
      })}

      <section className="card-brut space-y-3 p-4 text-center">
        <h2 className="font-display text-base uppercase tracking-wide">Prêt à nous écrire ?</h2>
        <p className="text-sm leading-relaxed">
          Envoyez-nous un email à{" "}
          <a
            href="mailto:radio@indi-art-culture.com"
            className="font-semibold text-radio-yellow underline"
          >
            radio@indi-art-culture.com
          </a>
        </p>
      </section>
    </div>
  );
}
