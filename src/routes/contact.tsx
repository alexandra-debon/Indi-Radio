import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Send, Loader2, Phone, Users, HelpCircle, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { sendContactEmail } from "@/lib/contact.functions";
import { IndiLinksBar } from "@/components/about/IndiLinksBar";
import { toast } from "sonner";
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
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);
  const [sentInfo, setSentInfo] = useState<{ email: string; ackSent: boolean } | null>(null);

  const handleChange = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await sendContactEmail({ data: form });
      toast.success("Message envoyé ! Nous vous répondrons dès que possible.");
      setSentInfo({ email: form.email, ackSent: Boolean(res?.ackSent) });
      setForm({ name: "", email: "", subject: "", message: "" });
    } catch (err) {
      const message = err instanceof Error ? err.message : "Une erreur est survenue";
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

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

      <section className="card-brut space-y-4 p-4">
        <div className="flex items-center gap-2">
          <Send className="size-5 text-primary" />
          <h2 className="font-display text-base uppercase tracking-wide">Envoyer un message</h2>
        </div>
        {sentInfo && (
          <div
            role="status"
            aria-live="polite"
            className="flex items-start gap-3 rounded-lg border border-green-500/40 bg-green-500/10 p-3 text-sm"
          >
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-green-600" />
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Message bien reçu, merci !</p>
              <p className="text-muted-foreground">
                {sentInfo.ackSent
                  ? <>Un accusé de réception vient d'être envoyé à <strong>{sentInfo.email}</strong>. Pensez à vérifier vos spams.</>
                  : <>Nous avons bien reçu votre message et vous répondrons dès que possible.</>}
              </p>
              <button
                type="button"
                onClick={() => setSentInfo(null)}
                className="text-xs font-medium text-primary underline underline-offset-2"
              >
                Envoyer un autre message
              </button>
            </div>
          </div>
        )}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Nom</Label>
            <Input
              id="name"
              value={form.name}
              onChange={handleChange("name")}
              placeholder="Votre nom ou pseudo"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={form.email}
              onChange={handleChange("email")}
              placeholder="votre@email.com"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="subject">Sujet</Label>
            <Input
              id="subject"
              value={form.subject}
              onChange={handleChange("subject")}
              placeholder="Sujet de votre message"
              required
              disabled={loading}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={form.message}
              onChange={handleChange("message")}
              placeholder="Votre message..."
              rows={6}
              required
              disabled={loading}
            />
          </div>
          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" /> Envoi en cours...
              </>
            ) : (
              <>
                <Send className="size-4" /> Envoyer le message
              </>
            )}
          </Button>
        </form>
      </section>
    </div>
  );
}
