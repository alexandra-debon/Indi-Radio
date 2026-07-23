import { createFileRoute } from "@tanstack/react-router";
import { Mail, Heart, ShieldCheck, Music, Gift, Users } from "lucide-react";
import ogSoumission from "@/assets/og-soumission-artistes.jpg";
import { useT } from "@/lib/i18n";
import type { DictKey } from "@/lib/i18n/dict";

const BASE_URL = "https://radio.indi-art-culture.com";
const OG_SOUMISSION = `${BASE_URL}${ogSoumission}`;

export const Route = createFileRoute("/soumission-artistes")({
  head: () => ({
    meta: [
      { title: "Soumission artistes — Radio musique indé InDi RaDio" },
      {
        name: "description",
        content:
          "Artistes indépendants : proposez vos titres à la diffusion sur InDi RaDio, la radio musique indé et le réseau social musique. Soumission 100% gratuite.",
      },
      { name: "keywords", content: "radio musique indé, réseau social musique, soumission artistes indépendants, radio gratuite, diffusion artistes indépendants, InDi RaDio" },
      { property: "og:title", content: "Soumission artistes — Radio musique indé InDi RaDio" },
      {
        property: "og:description",
        content:
          "Artistes indépendants : proposez vos titres à la diffusion sur InDi RaDio, la radio musique indé et le réseau social musique. Soumission 100% gratuite.",
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

const SECTIONS: Array<{ icon: typeof Gift; titleKey: DictKey; bodyKey: DictKey }> = [
  { icon: Gift, titleKey: "page.submissions.s1.title", bodyKey: "page.submissions.s1.body" },
  { icon: Mail, titleKey: "page.submissions.s2.title", bodyKey: "page.submissions.s2.body" },
  { icon: Users, titleKey: "page.submissions.s3.title", bodyKey: "page.submissions.s3.body" },
  { icon: ShieldCheck, titleKey: "page.submissions.s4.title", bodyKey: "page.submissions.s4.body" },
  { icon: Heart, titleKey: "page.submissions.s5.title", bodyKey: "page.submissions.s5.body" },
];

function ArtistSubmissionPage() {
  const t = useT();
  return (
    <div className="space-y-6">
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Music className="size-7 text-radio-yellow" />
          <h1 className="section-title">{t("page.submissions.title")}</h1>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {t("page.submissions.subtitle")}
        </p>
      </section>

      {SECTIONS.map((section) => {
        const Icon = section.icon;
        return (
          <section key={section.titleKey} className="card-brut space-y-3 p-4">
            <div className="flex items-center gap-2">
              <Icon className="size-5 text-radio-yellow" />
              <h2 className="font-display text-base uppercase tracking-wide">{t(section.titleKey)}</h2>
            </div>
            <p className="text-sm leading-relaxed">{t(section.bodyKey)}</p>
          </section>
        );
      })}

      <section className="card-brut space-y-3 p-4 text-center">
        <h2 className="font-display text-base uppercase tracking-wide">{t("page.submissions.readyWrite")}</h2>
        <p className="text-sm leading-relaxed">
          {t("page.submissions.emailIntro")}{" "}
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
