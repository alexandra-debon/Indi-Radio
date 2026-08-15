import { useLang } from "@/lib/i18n";
import { PRIVACY } from "@/lib/legal-content";
import { localizedStaticMeta } from "@/lib/og-static-head";
import { createFileRoute } from "@tanstack/react-router";
import { IndiLinksBar } from "@/components/about/IndiLinksBar";

export const Route = createFileRoute("/privacy")({
  head: async ({ match }) => ({
    meta: await localizedStaticMeta("/privacy", match.search, [
      { title: "Confidentialité — Radio 24/7 de la musique indépendante InDi RaDio" },
      {
        name: "description",
        content:
          "Politique de confidentialité d'InDi RaDio, la radio 24/7 de la musique indépendante : données collectées, notifications, cookies et exercice des droits."
      },
      { name: "keywords", content: "radio musique indépendante, politique confidentialité, données personnelles, InDi RaDio" },
      { property: "og:title", content: "Confidentialité — Radio 24/7 de la musique indépendante InDi RaDio" },
      {
        property: "og:description",
        content:
          "Politique de confidentialité d'InDi RaDio, la radio 24/7 de la musique indépendante : données collectées, notifications, cookies et exercice des droits."
      },
      { property: "og:url", content: "https://www.radio.indi-art-culture.com/privacy" },
      { property: "og:type", content: "website" },
      { name: "twitter:title", content: "Confidentialité — Radio 24/7 de la musique indépendante InDi RaDio" },
      { name: "twitter:description", content: "Politique de confidentialité d'InDi RaDio, la radio 24/7 de la musique indépendante : données collectées, notifications, cookies et exercice des droits." },
    ]),
    links: [{ rel: "canonical", href: "https://www.radio.indi-art-culture.com/privacy" }],
  }),
  component: PrivacyPage,
});

function PrivacyPage() {
  const { lang } = useLang();
  const page = PRIVACY[lang === "en" ? "en" : "fr"];
  return (
    <div className="space-y-6">
      <IndiLinksBar />

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
