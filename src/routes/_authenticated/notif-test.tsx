import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation } from "@tanstack/react-query";
import { triggerTestNotif } from "@/lib/notif-test.functions";
import { Bell, AtSign, MessageCircle, Heart, Newspaper, CornerDownRight } from "lucide-react";

export const Route = createFileRoute("/_authenticated/notif-test")({
  head: () => ({ meta: [{ title: "Test notifications — Indi Radio" }, { name: "robots", content: "noindex" }] }),
  component: NotifTestPage,
});

const KINDS = [
  { kind: "mention", label: "Simuler un tag (@toi)", icon: AtSign },
  { kind: "reply", label: "Simuler une réponse à ton message", icon: MessageCircle },
  { kind: "reply_deep", label: "Simuler une réponse dans un fil que tu suis", icon: CornerDownRight },
  { kind: "like", label: "Simuler un like sur ton message", icon: Heart },
  { kind: "news_like", label: "Simuler un like sur ton actu", icon: Newspaper },
] as const;

function NotifTestPage() {
  const router = useRouter();
  const fn = useServerFn(triggerTestNotif);
  const mut = useMutation({
    mutationFn: (kind: (typeof KINDS)[number]["kind"]) => fn({ data: { kind } }),
    onSuccess: () => router.invalidate(),
  });

  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight">
          <Bell className="size-6" /> Test notifications
        </h1>
        <p className="text-sm text-muted-foreground">
          Chaque bouton insère une vraie notification pour ton compte via le pipeline serveur.
          Regarde la cloche en haut à droite : elle doit s'incrémenter en temps réel.
        </p>
      </header>

      <div className="grid gap-2">
        {KINDS.map(({ kind, label, icon: Icon }) => (
          <button
            key={kind}
            onClick={() => mut.mutate(kind)}
            disabled={mut.isPending}
            className="flex items-center justify-between gap-3 rounded-md border-2 border-border bg-card px-4 py-3 text-left text-sm font-semibold hover:bg-muted disabled:opacity-50"
          >
            <span className="flex items-center gap-3">
              <Icon className="size-4" /> {label}
            </span>
            <span className="text-xs uppercase text-muted-foreground">Envoyer</span>
          </button>
        ))}
      </div>

      {mut.isSuccess && (
        <p className="rounded-md border border-primary/40 bg-primary/10 px-3 py-2 text-xs text-primary">
          ✓ Notification envoyée. Vérifie la cloche.
        </p>
      )}
      {mut.isError && (
        <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Erreur : {(mut.error as Error).message}
        </p>
      )}
    </div>
  );
}