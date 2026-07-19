import { useEffect, useState } from "react";
import { MailWarning } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

function getBrowserOrigin() {
  return typeof window === "undefined" ? "https://radio.indi-art-culture.com" : window.location.origin;
}

export function EmailVerificationBanner() {
  const { session, isEmailVerified } = useAuth();
  const [sending, setSending] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  if (!session || isEmailVerified) return null;

  async function resend() {
    if (!session?.user.email || cooldown > 0) return;
    setSending(true);
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: session.user.email,
      options: { emailRedirectTo: `${getBrowserOrigin()}/` },
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Email de confirmation renvoyé. Vérifie ta boîte mail !");
      setCooldown(60);
    }
  }

  return (
    <div className="border-b border-amber-500/40 bg-amber-500/10 text-amber-100">
      <div className="mx-auto flex max-w-3xl flex-col gap-2 px-3 py-2 text-sm sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-2">
          <MailWarning className="mt-0.5 size-4 shrink-0" />
          <p>
            <strong>Vérifie ton adresse email</strong> pour publier, liker,
            commenter et envoyer des dédicaces. Un lien de confirmation t'a été
            envoyé à <span className="underline">{session.user.email}</span>.
          </p>
        </div>
        <button
          onClick={resend}
          disabled={sending || cooldown > 0}
          className="shrink-0 rounded-md border border-amber-400/60 bg-amber-500/20 px-3 py-1 text-xs font-medium text-amber-50 hover:bg-amber-500/30 disabled:opacity-50"
        >
          {cooldown > 0 ? `Renvoyer (${cooldown}s)` : sending ? "Envoi…" : "Renvoyer l'email"}
        </button>
      </div>
    </div>
  );
}
