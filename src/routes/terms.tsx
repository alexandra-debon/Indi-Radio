import { useLang } from "@/lib/i18n";
import { TERMS } from "@/lib/legal-content";
import { localizedStaticMeta } from "@/lib/og-static-head";
import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/terms")({
  head: async ({ match }) => ({
    meta: await localizedStaticMeta("/terms", match.search, [
      { title: "Conditions d'utilisation — Radio 24/7 de la musique indépendante InDi RaDio" },
      {
        name: "description",
        content:
          "Conditions générales d'utilisation d'InDi RaDio, la radio 24/7 de la musique indépendante et le réseau social musique : compte, contenus, modération et tolérance zéro."
      },
      { name: "keywords", content: "radio musique indépendante, réseau social musique, conditions utilisation, CGU InDi RaDio, modération" },
      { property: "og:title", content: "Conditions d'utilisation — Radio 24/7 de la musique indépendante InDi RaDio" },
      {
        property: "og:description",
        content:
          "Conditions générales d'utilisation d'InDi RaDio, la radio 24/7 de la musique indépendante et le réseau social musique : compte, contenus, modération et tolérance zéro."
      },
      { property: "og:url", content: "https://radio.indi-art-culture.com/terms" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Conditions d'utilisation — Radio 24/7 de la musique indépendante InDi RaDio" },
      { name: "twitter:description", content: "Conditions générales d'utilisation d'InDi RaDio, la radio 24/7 de la musique indépendante et le réseau social musique : compte, contenus, modération et tolérance zéro." },
    ]),
    links: [{ rel: "canonical", href: "https://radio.indi-art-culture.com/terms" }],
  }),
  component: TermsPage,
});

function TermsPage() {
  const { lang } = useLang();
  const page = TERMS[lang === "en" ? "en" : "fr"];
  return (
    <div className="space-y-6">
      <section className="space-y-3">
        <h1 className="section-title">{page.heading}</h1>
        <div
          className="card-brut legal-prose space-y-4 p-4 text-sm leading-relaxed"
          dangerouslySetInnerHTML={{ __html: page.intro.html }}
        />
      </section>

      {page.sections.map((s) => (
        <section key={s.title} className="space-y-3">
          <h2 className="section-title">{s.title}</h2>
          <div
            className="card-brut legal-prose space-y-3 p-4 text-sm leading-relaxed"
            dangerouslySetInnerHTML={{ __html: s.html }}
          />
        </section>
      ))}
    </div>
  );
}
