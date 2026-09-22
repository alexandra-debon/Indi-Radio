import { useState } from "react";
import { Ban, UserCheck } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useIsBlocked, useToggleBlock } from "@/hooks/use-blocks";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { toast } from "@/lib/toast";
import { useT } from "@/lib/i18n";

/**
 * Permet à tout membre connecté de bloquer un autre membre : ses publications
 * et commentaires disparaissent de son fil. Obligatoire pour les stores.
 */
export function BlockUserButton({
  userId,
  pseudo,
  variant = "inline",
}: {
  userId: string;
  pseudo?: string | null;
  variant?: "inline" | "button";
}) {
  const { session, requireAuth } = useAuth();
  const t = useT();
  const blocked = useIsBlocked(userId);
  const toggle = useToggleBlock();
  const [open, setOpen] = useState(false);

  if (session?.user.id === userId) return null;

  const run = () => {
    toggle.mutate(
      { userId, block: !blocked },
      {
        onSuccess: () => {
          toast.success(blocked ? t("block.unblocked") : t("block.blocked"));
          setOpen(false);
        },
        onError: (e) => toast.error((e as Error).message),
      },
    );
  };

  const onClick = () => requireAuth(() => (blocked ? run() : setOpen(true)));

  return (
    <>
      {variant === "button" ? (
        <Button type="button" variant="outline" size="sm" onClick={onClick} disabled={toggle.isPending}>
          {blocked ? <UserCheck className="size-4" /> : <Ban className="size-4" />}
          {blocked ? t("block.unblock") : t("block.block")}
        </Button>
      ) : (
        <button
          type="button"
          onClick={onClick}
          disabled={toggle.isPending}
          className="inline-flex items-center gap-1 text-[10px] text-muted-foreground hover:text-destructive"
        >
          {blocked ? <UserCheck className="size-3" /> : <Ban className="size-3" />}
          {blocked ? t("block.unblock") : t("block.block")}
        </button>
      )}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {t("block.block")}
              {pseudo ? ` @${pseudo}` : ""}
            </DialogTitle>
            <DialogDescription>{t("block.description")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setOpen(false)}>
              {t("comment.cancel")}
            </Button>
            <Button variant="destructive" onClick={run} disabled={toggle.isPending}>
              {t("block.confirm")}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
