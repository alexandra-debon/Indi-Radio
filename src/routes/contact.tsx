import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Send, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { sendContactEmail } from "@/lib/contact.functions";
import { toast } from "sonner";
import ogImage from "@/assets/og-contact.jpg.asset-json";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — InDi RaDio" },
      {
        name: "description",
        content:
          "Contactez l'équipe d'InDi RaDio. Une question, une suggestion, une soumission artiste ? Écrivez-nous.",
      },
      { property: "og:title", content: "Contact — InDi RaDio" },
      {
        property: "og:description",
        content:
          "Contactez l'équipe d'InDi RaDio. Une question, une suggestion, une soumission artiste ? Écrivez-nous.",
      },
      { property: "og:url", content: "https://radio.indi-art-culture.com/contact" },
      { property: "og:type", content: "website" },
      { property: "og:image", content: ogImage.url },
      { property: "twitter:card", content: "summary_large_image" },
      { property: "twitter:image", content: ogImage.url },
    ],
    links: [{ rel: "canonical", href: "https://radio.indi-art-culture.com/contact" }],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  const handleChange = (field: keyof typeof form) => (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await sendContactEmail({ data: form });
      toast.success("Message envoyé ! Nous vous répondrons dès que possible.");
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
      <section className="space-y-4">
        <div className="flex items-center gap-3">
          <Mail className="size-7 text-radio-yellow" />
          <h1 className="section-title">Contact</h1>
        </div>
        <p className="text-sm leading-relaxed text-muted-foreground">
          Une question, une suggestion ou une demande artiste ? Écrivez-nous directement.
        </p>
      </section>

      <section className="card-brut space-y-4 p-4">
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

      <section className="card-brut space-y-3 p-4 text-center">
        <h2 className="font-display text-base uppercase tracking-wide">Ou contactez-nous par email</h2>
        <p className="text-sm leading-relaxed">
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
