import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { CheckCircle2, AlertCircle, Mail } from "lucide-react";
import { z } from "zod";

const emailSchema = z
  .string()
  .trim()
  .min(1, { message: "Merci de renseigner ton email." })
  .email({ message: "Format d'email invalide." })
  .max(255, { message: "Email trop long (255 caractères max)." });

export const Route = createFileRoute("/newsletter")({
  head: () => ({
    meta: [
      { title: "Newsletter — Indi Radio" },
      { name: "description", content: "Inscris-toi à la newsletter d'Indi Radio pour ne rien rater des émissions et des sorties." },
      { property: "og:title", content: "Newsletter — Indi Radio" },
      { property: "og:description", content: "Reçois les infos d'Indi Radio par email." },
    ],
  }),
  component: NewsletterPage,
});

function NewsletterPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Email invalide.");
      return;
    }

    setLoading(true);
    const { error: dbError } = await supabase
      .from("newsletter_subscribers")
      .insert({ email: parsed.data });
    setLoading(false);

    if (dbError) {
      const isDuplicate =
        dbError.code === "23505" || /duplicate|unique/i.test(dbError.message);
      const msg = isDuplicate
        ? "Cet email est déjà inscrit à la newsletter."
        : "Impossible d'enregistrer l'inscription. Réessaie dans un instant.";
      setError(msg);
      toast.error(msg);
      return;
    }

    setEmail("");
    setSuccess(true);
    toast.success("Merci ! Tu es inscrit.");
  }
  return (
    <div className="space-y-4">
      <h1 className="section-title">Newsletter</h1>
      {success ? (
        <div
          role="status"
          aria-live="polite"
          className="card-brut space-y-3 border-primary/60 bg-primary/10 p-4"
        >
          <div className="flex items-start gap-3">
            <CheckCircle2 className="mt-0.5 size-5 shrink-0 text-primary" />
            <div className="space-y-1">
              <p className="text-sm font-bold text-primary">Inscription confirmée 🎉</p>
              <p className="text-xs text-muted-foreground">
                Merci ! Tu recevras une note d'info dès qu'il y a du neuf sur l'antenne.
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full"
            onClick={() => setSuccess(false)}
          >
            <Mail className="mr-2 size-4" /> Inscrire un autre email
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="card-brut space-y-3 p-4" noValidate>
          <p className="text-sm text-muted-foreground">
            Une note d'info quand il y a du neuf sur l'antenne, un podcast qui sort, une émission spéciale.
          </p>
          <div className="space-y-1">
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="ton@email.fr"
              value={email}
              maxLength={255}
              aria-invalid={!!error}
              aria-describedby={error ? "newsletter-error" : undefined}
              onChange={(e) => {
                setEmail(e.target.value);
                if (error) setError(null);
              }}
            />
            {error && (
              <p
                id="newsletter-error"
                role="alert"
                className="flex items-center gap-1.5 text-xs font-medium text-destructive"
              >
                <AlertCircle className="size-3.5" /> {error}
              </p>
            )}
          </div>
          <Button className="w-full" disabled={loading}>
            {loading ? "Inscription…" : "S'inscrire"}
          </Button>
        </form>
      )}
    </div>
  );
}