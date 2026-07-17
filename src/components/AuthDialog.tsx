import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function AuthDialog() {
  const { authOpen, closeAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"tabs" | "forgot">("tabs");
  const [forgotEmail, setForgotEmail] = useState("");

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPseudo, setSignUpPseudo] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");

  async function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({
      email: signInEmail,
      password: signInPassword,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Bienvenue !");
      closeAuth();
    }
  }

  async function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    if (signUpPseudo.trim().length < 2) {
      toast.error("Le pseudo doit contenir au moins 2 caractères");
      return;
    }
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email: signUpEmail,
      password: signUpPassword,
      options: {
        emailRedirectTo: `${window.location.origin}/`,
        data: { pseudo: signUpPseudo.trim() },
      },
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success(
        "Compte créé ! Vérifie ta boîte mail pour confirmer ton adresse avant de te connecter.",
        { duration: 8000 }
      );
    }
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.resetPasswordForEmail(forgotEmail, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    setLoading(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Email de réinitialisation envoyé, vérifie ta boîte !");
      setView("tabs");
    }
  }

  return (
    <Dialog open={authOpen} onOpenChange={(o) => { if (!o) { closeAuth(); setView("tabs"); } }}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="wordmark text-2xl">INDI RADIO</DialogTitle>
          <DialogDescription>
            {view === "forgot"
              ? "Entre ton email pour recevoir un lien de réinitialisation."
              : "Connecte-toi pour poster sur le mur, liker, dédicacer et gagner des points."}
          </DialogDescription>
        </DialogHeader>
        {view === "forgot" ? (
          <form className="space-y-3" onSubmit={handleForgot}>
            <div>
              <Label htmlFor="fp-email">Email</Label>
              <Input id="fp-email" type="email" required value={forgotEmail} onChange={(e) => setForgotEmail(e.target.value)} />
            </div>
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? "…" : "Envoyer le lien"}
            </Button>
            <button
              type="button"
              className="w-full text-sm text-muted-foreground underline"
              onClick={() => setView("tabs")}
            >
              Retour à la connexion
            </button>
          </form>
        ) : (
        <Tabs defaultValue="signin">
          <TabsList className="grid grid-cols-2">
            <TabsTrigger value="signin">Connexion</TabsTrigger>
            <TabsTrigger value="signup">Inscription</TabsTrigger>
          </TabsList>
          <TabsContent value="signin">
            <form className="space-y-3" onSubmit={handleSignIn}>
              <div>
                <Label htmlFor="si-email">Email</Label>
                <Input id="si-email" type="email" required value={signInEmail} onChange={(e) => setSignInEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="si-pw">Mot de passe</Label>
                <Input id="si-pw" type="password" required value={signInPassword} onChange={(e) => setSignInPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "…" : "Se connecter"}
              </Button>
              <button
                type="button"
                className="w-full text-sm text-muted-foreground underline"
                onClick={() => { setForgotEmail(signInEmail); setView("forgot"); }}
              >
                Mot de passe oublié ?
              </button>
            </form>
          </TabsContent>
          <TabsContent value="signup">
            <form className="space-y-3" onSubmit={handleSignUp}>
              <div>
                <Label htmlFor="su-pseudo">Pseudo</Label>
                <Input id="su-pseudo" required minLength={2} value={signUpPseudo} onChange={(e) => setSignUpPseudo(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="su-email">Email</Label>
                <Input id="su-email" type="email" required value={signUpEmail} onChange={(e) => setSignUpEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="su-pw">Mot de passe</Label>
                <Input id="su-pw" type="password" required minLength={6} value={signUpPassword} onChange={(e) => setSignUpPassword(e.target.value)} />
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "…" : "Créer mon compte"}
              </Button>
            </form>
          </TabsContent>
        </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}