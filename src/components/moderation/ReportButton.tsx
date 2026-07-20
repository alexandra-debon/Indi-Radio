import { useState } from "react";
import { Flag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { useT } from "@/lib/i18n";

type CommentType = "content_comment" | "news_comment" | "post_comment";

export function ReportButton({ commentType, commentId }: { commentType: CommentType; commentId: string }) {
  const { session, requireAuth } = useAuth();
  const t = useT();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [sending, setSending] = useState(false);

  async function submit() {
    if (!session) return;
    const r = reason.trim();
    if (r.length < 3) { toast.error("Merci de préciser le motif"); return; }
    if (r.length > 500) { toast.error("Motif trop long (max 500)"); return; }
    setSending(true);
    const { error } = await supabase.from("comment_reports").insert({
      reporter_id: session.user.id,
      comment_type: commentType,
      comment_id: commentId,
      reason: r,
    });
    setSending(false);
    if (error) {
      if (error.code === "23505") toast.info("Tu as déjà signalé ce commentaire");
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
        onClick={() => requireAuth(() => setOpen(true))}
        className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
        aria-label={t("report.comment")}
      >
        <Flag className="size-3" /> {t("report.short")}
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t("report.comment")}</DialogTitle>
            <DialogDescription>{t("report.description")}</DialogDescription>
          </DialogHeader>
          <Textarea rows={3} maxLength={500} value={reason} onChange={(e) => setReason(e.target.value)} placeholder={t("report.placeholder")} />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>{t("comment.cancel")}</Button>
            <Button onClick={submit} disabled={sending}>{t("comment.send")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}