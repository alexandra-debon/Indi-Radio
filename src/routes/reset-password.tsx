import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Réinitialiser le mot de passe — Indi Radio" },
      { name: "description", content: "Choisis un nouveau mot de passe pour ton compte Indi Radio." },
      { name: "robots", content: "noindex" },
    ],
    links: [
      { rel: "canonical", href: "https://radio.indi-art-culture.com/reset-password" },
    ],
  }),
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const { data: sub } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") setReady(true);
    });
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password.length < 6) {
      toast.error("Le mot de passe doit contenir au moins 6 caractères");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Mot de passe mis à jour !");
      navigate({ to: "/", replace: true });
    }
  }

  return (
    <div className="mx-auto max-w-md px-4 py-12">
      <h1 className="wordmark text-3xl mb-2">Nouveau mot de passe</h1>
      <p className="text-sm text-muted-foreground mb-6">
        {ready
          ? "Choisis un nouveau mot de passe pour ton compte."
          : "Ouvre ce lien depuis l'email de réinitialisation pour continuer."}
      </p>
      <form className="space-y-3" onSubmit={handleSubmit}>
        <div>
          <Label htmlFor="new-pw">Mot de passe</Label>
          <Input
            id="new-pw"
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={!ready}
          />
        </div>
        <Button type="submit" className="w-full" disabled={!ready || loading}>
          {loading ? "…" : "Mettre à jour"}
        </Button>
      </form>
    </div>
  );
}