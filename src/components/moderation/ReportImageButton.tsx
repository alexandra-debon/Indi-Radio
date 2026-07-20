import { useState } from "react";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";

export function ReportImageButton({ postId, imageUrl }: { postId: string; imageUrl: string }) {
  const { session, requireAuth } = useAuth();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!session) return;
    const r = reason.trim();
    if (r.length < 3) { toast.error("Merci de préciser le motif"); return; }
    if (r.length > 500) { toast.error("Motif trop long (max 500)"); return; }
    setSending(true);
    const { error } = await supabase.from("image_reports").insert({
      reporter_id: session.user.id,
      post_id: postId,
      image_url: imageUrl,
      reason: r,
    });
    setSending(false);
    if (error) {
      if (error.code === "23505") toast.info("Tu as déjà signalé cette photo");
      else toast.error(error.message);
      return;
    }
    toast.success("Signalement envoyé à la modération");
    setReason("");
    setOpen(false);
  }

  return (
    <>
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); requireAuth(() => setOpen(true)); }}
        className="absolute top-1 right-1 z-10 inline-flex items-center gap-1 rounded bg-black/60 px-2 py-1 text-[10px] text-white backdrop-blur hover:bg-destructive"
        aria-label="Signaler cette photo"
        title="Signaler cette photo"
      >
        <Flag className="size-3" /> Signaler
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Signaler cette photo</DialogTitle>
            <DialogDescription>Explique brièvement pourquoi (nudité, violence, haine, contenu illégal, droits d'auteur…).</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Motif du signalement" />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>Annuler</Button>
            <Button onClick={submit} disabled={sending}>Envoyer</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
