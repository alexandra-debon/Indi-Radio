import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.from("newsletter_subscribers").insert({ email });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("Merci ! Tu es inscrit."); setEmail(""); }
  }
  return (
    <div className="space-y-4">
      <h1 className="section-title">Newsletter</h1>
      <form onSubmit={submit} className="card-brut space-y-3 p-4">
        <p className="text-sm text-muted-foreground">
          Une note d'info quand il y a du neuf sur l'antenne, un podcast qui sort, une émission spéciale.
        </p>
        <Input type="email" required placeholder="ton@email.fr" value={email} onChange={(e) => setEmail(e.target.value)} />
        <Button className="w-full" disabled={loading}>S'inscrire</Button>
      </form>
    </div>
  );
}