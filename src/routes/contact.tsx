import { createFileRoute } from "@tanstack/react-router";
import { Mail, Phone, Users, HelpCircle } from "lucide-react";
import { IndiLinksBar } from "@/components/about/IndiLinksBar";
import ogContact from "@/assets/og-contact.jpg";

const BASE_URL = "https://radio.indi-art-culture.com";
const OG_CONTACT = `${BASE_URL}${ogContact}`;

const CONTACTS = [
  {
    icon: Users,
    label: "Contact auditeurs & artistes",
    email: "radio@indi-art-culture.com",
    description: "Programmation, soumissions, diffusion et échanges",
  },
  {
    icon: HelpCircle,
    label: "En cas de difficulté",
    email: "help@indi-art-culture.com",
    description: "Assistance technique ou questions pratiques",
  },
  {
    icon: Phone,
    label: "Standard téléphonique",
    href: "tel:+33481095152",
    value: "+33 4 81 09 51 52",
    description: "Du lundi au vendredi, de 10h à 18h",
  },
];

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — InDi RaDio" },
      {
        name: "description",
        content:
          "Contactez l'équipe d'InDi RaDio : auditeurs, artistes, soumissions ou assistance. Email, téléphone et formulaire.",
      },
      { property: "og:title", content: "Contact — InDi RaDio" },
      {
        property: "og:description",
        content:
          "Contactez l'équipe d'InDi RaDio : auditeurs, artistes, soumissions ou assistance. Email, téléphone et formulaire.",
      },
      { property: "og:url", content: "https://radio.indi-art-culture.com/contact" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: OG_CONTACT },
      { property: "og:image:width", content: "1200" },
      { property: "og:image:height", content: "630" },
      { property: "twitter:card", content: "summary_large_image" },
      { property: "twitter:image", content: OG_CONTACT },
    ],
    links: [{ rel: "canonical", href: "https://radio.indi-art-culture.com/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  return (
    <div className="space-y-6">
      <section className="relative overflow-hidden rounded-2xl border border-border bg-gradient-to-br from-radio-yellow/15 via-background to-background p-5 shadow-lg">
        <div className="absolute -right-4 -top-4 size-24 rounded-full bg-radio-yellow/10 blur-2xl" aria-hidden />
        <div className="relative flex items-center gap-3">
          <div className="flex size-12 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-md">
            <Mail className="size-6" />
          </div>
          <div>
            <h1 className="section-title">Contact</h1>
            <p className="mt-1 text-sm leading-relaxed text-muted-foreground">
              Une question, une suggestion, une soumission artiste ? On vous répond.
            </p>
          </div>
        </div>
      </section>

      <IndiLinksBar />

      <section className="grid gap-3 sm:grid-cols-2">
        {CONTACTS.map((c) => {
          const Icon = c.icon;
          return (
            <a
              key={c.label}
              href={c.href ?? `mailto:${c.email}`}
              className="card-brut group relative overflow-hidden p-4 transition hover:border-primary/60 hover:bg-primary/5"
            >
              <div className="flex items-start gap-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-full bg-primary/15 text-primary transition group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground">
                  <Icon className="size-5" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-display text-sm uppercase tracking-wide">{c.label}</h3>
                  <p className="mt-0.5 truncate font-semibold text-foreground">
                    {c.value ?? c.email}
                  </p>
                  <p className="text-xs text-muted-foreground">{c.description}</p>
                </div>
              </div>
            </a>
          );
        })}
      </section>
    </div>
  );
}
