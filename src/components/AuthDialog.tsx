import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export function AuthDialog() {
  const { authOpen, closeAuth } = useAuth();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState<"tabs" | "forgot">("tabs");
  const [forgotEmail, setForgotEmail] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    if (resendCooldown <= 0) return;
    const t = setTimeout(() => setResendCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendCooldown]);

  const [signInEmail, setSignInEmail] = useState("");
  const [signInPassword, setSignInPassword] = useState("");

  const [signUpEmail, setSignUpEmail] = useState("");
  const [signUpPseudo, setSignUpPseudo] = useState("");
  const [signUpPassword, setSignUpPassword] = useState("");

  async function handleResend() {
    if (!signInEmail) {
      toast.error("Entre ton email ci-dessus pour recevoir un nouveau lien.");
      return;
    }
    if (resendCooldown > 0) return;
    setResending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: signInEmail,
      options: { emailRedirectTo: `${window.location.origin}/` },
    });
    setResending(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Lien de confirmation renvoyé ! Vérifie ta boîte mail.");
      setResendCooldown(60);
    }
  }

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

  async function handleOAuth(provider: "google" | "apple") {
    setLoading(true);
    // Dans l'app native (iOS/Android), on utilise le plugin natif
    // pour éviter le popup web (obligatoire pour être accepté par Apple).
    const nativeAuth = await import("@/lib/native-auth");
    if (nativeAuth.canUseNativeAuth(provider)) {
      try {
        if (provider === "google") await nativeAuth.signInWithGoogleNative();
        else await nativeAuth.signInWithAppleNative();
        toast.success("Bienvenue !");
        closeAuth();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Erreur de connexion.");
      } finally {
        setLoading(false);
      }
      return;
    }
    const result = await lovable.auth.signInWithOAuth(provider, {
      redirect_uri: window.location.origin,
    });
    setLoading(false);
    if (result.error) {
      toast.error(result.error instanceof Error ? result.error.message : "Erreur de connexion.");
      return;
    }
    if (!result.redirected) {
      toast.success("Bienvenue !");
      closeAuth();
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
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              className="w-full gap-2"
              disabled={loading}
              onClick={() => handleOAuth("google")}
            >
              <svg className="size-4" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
              Google
            </Button>
            <Button
              type="button"
              className="w-full gap-2 bg-black text-white hover:bg-black/90"
              disabled={loading}
              onClick={() => handleOAuth("apple")}
            >
              <svg className="size-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
              </svg>
              Apple
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">ou</span>
            <Separator className="flex-1" />
          </div>
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
              <button
                type="button"
                className="w-full text-sm text-muted-foreground underline disabled:opacity-50 disabled:no-underline"
                onClick={handleResend}
                disabled={resending || resendCooldown > 0}
              >
                {resendCooldown > 0
                  ? `Renvoyer le lien de confirmation (${resendCooldown}s)`
                  : resending
                    ? "Envoi…"
                    : "Renvoyer le lien de confirmation"}
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
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}