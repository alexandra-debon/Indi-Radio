import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/lib/toast";
import { useQueryClient } from "@tanstack/react-query";

// Matches the auto-generated pseudo assigned by handle_new_user() for
// OAuth signups that never chose one (e.g. Google). Format: `auditeur_<8 hex>`.
const AUTO_PSEUDO_RE = /^auditeur_[0-9a-f]{8}$/i;

export function RequirePseudoDialog() {
  const { session, profile } = useAuth();
  const qc = useQueryClient();
  const [value, setValue] = useState("");
  const [saving, setSaving] = useState(false);

  const needs = !!session && !!profile && (!profile.pseudo || AUTO_PSEUDO_RE.test(profile.pseudo));

  useEffect(() => {
    if (needs) setValue("");
  }, [needs]);

  if (!needs || !session) return null;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = value.trim();
    if (clean.length < 2) {
      toast.error("Le pseudo doit contenir au moins 2 caractères");
      return;
    }
    if (!/^[\p{L}\p{N}_.-]+$/u.test(clean)) {
      toast.error("Caractères autorisés : lettres, chiffres, _ . -");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ pseudo: clean })
      .eq("id", session.user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message.includes("duplicate") ? "Ce pseudo est déjà pris" : error.message);
      return;
    }
    toast.success("Pseudo enregistré");
    qc.invalidateQueries({ queryKey: ["profile", session.user.id] });
  };

  return (
    <Dialog open modal>
      <DialogContent
        className="max-w-sm border-2 border-black shadow-[4px_4px_0_0_#000]"
        onEscapeKeyDown={(e) => e.preventDefault()}
        onPointerDownOutside={(e) => e.preventDefault()}
        onInteractOutside={(e) => e.preventDefault()}
      >
        <DialogHeader>
          <DialogTitle>Choisis ton pseudo</DialogTitle>
          <DialogDescription>
            Un pseudo est obligatoire pour utiliser InDi RaDio. Tu pourras le modifier plus tard depuis « Mon espace ».
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-3">
          <div className="space-y-1">
            <Label htmlFor="rp-pseudo">Pseudo</Label>
            <Input
              id="rp-pseudo"
              autoFocus
              required
              minLength={2}
              maxLength={30}
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder="ex : jeanne_indie"
            />
          </div>
          <DialogFooter>
            <Button type="submit" disabled={saving} className="w-full">
              {saving ? "Enregistrement…" : "Valider"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}