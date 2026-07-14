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
      toast.success("Compte créé, tu peux te connecter !");
    }
  }

  return (
    <Dialog open={authOpen} onOpenChange={(o) => (o ? null : closeAuth())}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="wordmark text-2xl">INDI RADIO</DialogTitle>
          <DialogDescription>
            Connecte-toi pour poster sur le mur, liker, dédicacer et gagner des points.
          </DialogDescription>
        </DialogHeader>
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
      </DialogContent>
    </Dialog>
  );
}