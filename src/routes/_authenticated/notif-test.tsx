import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { triggerTestNotif } from "@/lib/notif-test.functions";
import { Bell, AtSign, MessageCircle, Heart, Newspaper, CornerDownRight, RefreshCw, CheckCircle2, Circle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

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
  const qc = useQueryClient();
  const { session } = useAuth();
  const fn = useServerFn(triggerTestNotif);
  const [rtStatus, setRtStatus] = useState<string>("idle");
  const [lastEvent, setLastEvent] = useState<string | null>(null);
  const mut = useMutation({
    mutationFn: (kind: (typeof KINDS)[number]["kind"]) => fn({ data: { kind } }),
    onSuccess: () => {
      router.invalidate();
      qc.invalidateQueries({ queryKey: ["notif-diag", session?.user.id] });
      qc.invalidateQueries({ queryKey: ["notifications", session?.user.id] });
    },
  });

  const { data: recent = [], refetch, isFetching } = useQuery<Array<{
    id: string; type: string; message: string; read_at: string | null; created_at: string;
  }>>({
    queryKey: ["notif-diag", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("id, type, message, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data ?? [];
    },
  });

  useEffect(() => {
    if (!session) return;
    setRtStatus("subscribing");
    const channel = supabase
      .channel(`notif-diag-${session.user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${session.user.id}` },
        (payload) => {
          setLastEvent(`${payload.eventType} @ ${new Date().toLocaleTimeString()}`);
          qc.invalidateQueries({ queryKey: ["notif-diag", session.user.id] });
          qc.invalidateQueries({ queryKey: ["notifications", session.user.id] });
        },
      )
      .subscribe((status) => setRtStatus(status));
    return () => { supabase.removeChannel(channel); };
  }, [session, qc]);

  const unread = recent.filter((n) => !n.read_at).length;

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

      <section className="space-y-2 pt-4">
        <div className="flex flex-wrap items-end justify-between gap-2 border-t-2 border-border pt-4">
          <div>
            <h2 className="text-lg font-black uppercase">Notifications récentes</h2>
            <p className="text-[11px] text-muted-foreground">
              {recent.length} récente{recent.length > 1 ? "s" : ""} · {unread} non lue{unread > 1 ? "s" : ""} · user <code>{session?.user.id.slice(0, 8)}…</code>
            </p>
          </div>
          <button
            onClick={() => refetch()}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs font-semibold hover:bg-muted"
          >
            <RefreshCw className={cn("size-3.5", isFetching && "animate-spin")} /> Rafraîchir
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2 rounded-md border border-border bg-muted/30 px-3 py-2 text-[11px]">
          <span className="font-semibold uppercase text-muted-foreground">Realtime :</span>
          <span className={cn(
            "rounded px-1.5 py-0.5 font-bold uppercase",
            rtStatus === "SUBSCRIBED" ? "bg-primary/20 text-primary" : "bg-destructive/15 text-destructive",
          )}>{rtStatus}</span>
          {lastEvent && <span className="text-muted-foreground">dernier événement : {lastEvent}</span>}
        </div>

        {recent.length === 0 ? (
          <p className="rounded-md border-2 border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
            Aucune notification en base pour ce compte.
          </p>
        ) : (
          <ul className="divide-y divide-border overflow-hidden rounded-md border-2 border-border">
            {recent.map((n) => (
              <li key={n.id} className={cn("grid grid-cols-[auto_1fr_auto] gap-3 px-3 py-2 text-xs", !n.read_at && "bg-primary/5")}>
                <span className="font-mono text-[10px] text-muted-foreground">
                  {format(new Date(n.created_at), "dd/MM HH:mm:ss", { locale: fr })}
                </span>
                <span className="min-w-0">
                  <span className="mr-2 inline-block rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold uppercase">{n.type}</span>
                  <span className="truncate">{n.message}</span>
                </span>
                <span className={cn(
                  "inline-flex items-center gap-1 text-[10px] font-semibold uppercase",
                  n.read_at ? "text-muted-foreground" : "text-primary",
                )}>
                  {n.read_at ? <CheckCircle2 className="size-3" /> : <Circle className="size-3" />}
                  {n.read_at ? "lu" : "non lu"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}