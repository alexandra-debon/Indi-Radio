import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { Bell, Check, ChevronDown, ChevronRight, Trash2, AtSign, MessageCircle, Heart, BellOff } from "lucide-react";
import { cn } from "@/lib/utils";
import { parseNotifUrl } from "@/lib/notif-navigate";
import { NotificationPreferences } from "@/components/NotificationPreferences";
import { toast } from "@/lib/toast";

export const Route = createFileRoute("/_authenticated/notifications")({
  head: () => ({ meta: [{ title: "Notifications — Indi Radio" }, { name: "robots", content: "noindex" }] }),
  component: NotificationsCenter,
});

interface Notif {
  id: string;
  type: string;
  message: string;
  url: string | null;
  read_at: string | null;
  created_at: string;
}

const ICONS: Record<string, typeof Bell> = {
  mention: AtSign,
  reply: MessageCircle,
  like: Heart,
};

function NotificationsCenter() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<"all" | "unread">("all");
  const [typeFilter, setTypeFilter] = useState<"all" | "mention" | "reply" | "like">("all");
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: notifs = [], isLoading } = useQuery<Notif[]>({
    queryKey: ["notifications", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, message, url, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      return (data ?? []) as Notif[];
    },
  });

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`notif-center-${session.user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "notifications", filter: `recipient_id=eq.${session.user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", session.user.id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, qc]);

  const invalidate = () => qc.invalidateQueries({ queryKey: ["notifications", session?.user.id] });

  const markIds = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onMutate: (ids) => {
      const key = ["notifications", session?.user.id];
      const prev = qc.getQueryData<Notif[]>(key);
      if (prev) {
        const now = new Date().toISOString();
        const set = new Set(ids);
        qc.setQueryData<Notif[]>(key, prev.map((n) => (set.has(n.id) && !n.read_at ? { ...n, read_at: now } : n)));
      }
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notifications", session?.user.id], ctx.prev);
    },
    onSettled: invalidate,
  });

  const markAll = useMutation({
    mutationFn: async () => {
      if (!session) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("recipient_id", session.user.id)
        .is("read_at", null);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteIds = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const { error } = await supabase.from("notifications").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const deleteAllRead = useMutation({
    mutationFn: async () => {
      if (!session) return;
      const { error } = await supabase
        .from("notifications")
        .delete()
        .eq("recipient_id", session.user.id)
        .not("read_at", "is", null);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const filtered = useMemo(() => {
    let list = notifs;
    if (typeFilter !== "all") list = list.filter((n) => n.type === typeFilter);
    if (filter === "unread") list = list.filter((n) => !n.read_at);
    return list;
  }, [notifs, filter, typeFilter]);

  const typeCounts = useMemo(() => ({
    mention: notifs.filter((n) => n.type === "mention").length,
    reply: notifs.filter((n) => n.type === "reply").length,
    like: notifs.filter((n) => n.type === "like").length,
  }), [notifs]);

  const deleteFiltered = useMutation({
    mutationFn: async () => {
      const ids = filtered.map((n) => n.id);
      if (!ids.length) return;
      const { error } = await supabase.from("notifications").delete().in("id", ids);
      if (error) throw error;
    },
    onSuccess: invalidate,
  });

  const { data: mentionsEnabled = true } = useQuery({
    queryKey: ["notif-pref-mentions", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase
        .from("notification_preferences")
        .select("mentions")
        .eq("user_id", session!.user.id)
        .maybeSingle();
      return data?.mentions ?? true;
    },
  });

  const toggleMentions = useMutation({
    mutationFn: async (next: boolean) => {
      if (!session) return;
      const { error } = await supabase
        .from("notification_preferences")
        .upsert({ user_id: session.user.id, mentions: next }, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: (_d, next) => {
      qc.invalidateQueries({ queryKey: ["notif-pref-mentions", session?.user.id] });
      qc.invalidateQueries({ queryKey: ["notification_preferences", session?.user.id] });
      toast.success(next ? "Notifications @mentions activées" : "Notifications @mentions coupées");
    },
    onError: () => toast.error("Impossible de mettre à jour la préférence"),
  });

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; url: string | null; items: Notif[] }>();
    for (const n of filtered) {
      const key = n.url ?? `single:${n.id}`;
      const g = map.get(key) ?? { key, url: n.url, items: [] };
      g.items.push(n);
      map.set(key, g);
    }
    return Array.from(map.values());
  }, [filtered]);

  const unreadTotal = notifs.filter((n) => !n.read_at).length;

  if (!session) return null;

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-black uppercase tracking-tight">
            <Bell className="size-6" /> Notifications
          </h1>
          <p className="text-xs text-muted-foreground">
            {notifs.length} au total · <span className="font-bold text-primary">{unreadTotal} non lue{unreadTotal > 1 ? "s" : ""}</span>
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex overflow-hidden rounded-md border-2 border-border text-xs font-bold uppercase">
            <button
              onClick={() => setFilter("all")}
              className={cn("px-3 py-1.5", filter === "all" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >Toutes</button>
            <button
              onClick={() => setFilter("unread")}
              className={cn("px-3 py-1.5 border-l-2 border-border", filter === "unread" ? "bg-primary text-primary-foreground" : "hover:bg-muted")}
            >Non lues</button>
          </div>
          <div className="inline-flex overflow-hidden rounded-md border-2 border-border text-xs font-bold uppercase">
            {([
              ["all", "Tous types", null],
              ["mention", `@Mentions${typeCounts.mention ? ` (${typeCounts.mention})` : ""}`, AtSign],
              ["reply", `Réponses${typeCounts.reply ? ` (${typeCounts.reply})` : ""}`, MessageCircle],
              ["like", `Likes${typeCounts.like ? ` (${typeCounts.like})` : ""}`, Heart],
            ] as const).map(([val, label, Icon], i) => (
              <button
                key={val}
                onClick={() => setTypeFilter(val)}
                className={cn(
                  "inline-flex items-center gap-1 px-2.5 py-1.5",
                  i > 0 && "border-l-2 border-border",
                  typeFilter === val ? "bg-primary text-primary-foreground" : "hover:bg-muted",
                )}
              >
                {Icon && <Icon className="size-3" />} {label}
              </button>
            ))}
          </div>
          <button
            onClick={() => toggleMentions.mutate(!mentionsEnabled)}
            disabled={toggleMentions.isPending}
            title={mentionsEnabled ? "Couper les notifications @mentions" : "Activer les notifications @mentions"}
            className={cn(
              "inline-flex items-center gap-1 rounded-md border-2 px-2.5 py-1.5 text-xs font-bold uppercase transition-colors disabled:opacity-40",
              mentionsEnabled
                ? "border-primary bg-primary/10 text-primary hover:bg-primary/20"
                : "border-border bg-muted text-muted-foreground hover:bg-muted/70",
            )}
          >
            {mentionsEnabled ? <AtSign className="size-3.5" /> : <BellOff className="size-3.5" />}
            @Mentions {mentionsEnabled ? "activées" : "coupées"}
          </button>
          <button
            onClick={() => markAll.mutate()}
            disabled={unreadTotal === 0 || markAll.isPending}
            className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-xs font-semibold hover:bg-muted disabled:opacity-40"
          >
            <Check className="size-3.5" /> Tout marquer lu
          </button>
          {typeFilter !== "all" && (
            <button
              onClick={() => {
                if (confirm(`Supprimer les ${filtered.length} notification(s) affichée(s) ?`)) deleteFiltered.mutate();
              }}
              disabled={filtered.length === 0 || deleteFiltered.isPending}
              className="inline-flex items-center gap-1 rounded-md border border-destructive/60 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-40"
            >
              <Trash2 className="size-3.5" /> Supprimer la vue
            </button>
          )}
          <button
            onClick={() => {
              if (confirm("Supprimer toutes les notifications déjà lues ?")) deleteAllRead.mutate();
            }}
            disabled={deleteAllRead.isPending}
            className="inline-flex items-center gap-1 rounded-md border border-destructive/60 px-2.5 py-1.5 text-xs font-semibold text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="size-3.5" /> Vider les lues
          </button>
        </div>
      </header>

      {isLoading && <p className="text-sm text-muted-foreground">Chargement…</p>}

      <NotificationPreferences />

      {!isLoading && groups.length === 0 && (
        <div className="rounded-md border-2 border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          {filter === "unread" ? "Aucune notification non lue." : "Aucune notification pour l'instant."}
        </div>
      )}

      <ul className="space-y-2">
        {groups.map((g) => {
          const latest = g.items[0];
          const unreadCount = g.items.filter((n) => !n.read_at).length;
          const isThread = g.items.length > 1;
          const isOpen = !!expanded[g.key];
          const Icon = ICONS[latest.type] ?? Bell;
          return (
            <li key={g.key} className={cn("rounded-md border-2 border-border bg-card", unreadCount > 0 && "border-primary/60 bg-primary/5")}>
              <div className="flex items-start gap-2 px-3 py-2.5">
                <Icon className={cn("mt-0.5 size-4 shrink-0", unreadCount > 0 ? "text-primary" : "text-muted-foreground")} />
                <div className="min-w-0 flex-1">
                  {(() => {
                    const t = parseNotifUrl(g.url);
                    if (!t) return <p className="text-sm font-semibold">{latest.message}</p>;
                    return (
                      <Link
                        to={t.to}
                        hash={t.hash}
                        onClick={() => markIds.mutate(g.items.filter((n) => !n.read_at).map((n) => n.id))}
                        className="block text-sm font-semibold hover:underline"
                      >
                        {latest.message}
                      </Link>
                    );
                  })()}
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-[10px] text-muted-foreground">
                    <span>{formatDistanceToNow(new Date(latest.created_at), { addSuffix: true, locale: fr })}</span>
                    {isThread && (
                      <span className="rounded bg-muted px-1.5 py-0.5 font-semibold">
                        {g.items.length} msgs{unreadCount > 0 ? ` · ${unreadCount} nouv.` : ""}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {isThread && (
                    <button
                      onClick={() => setExpanded((e) => ({ ...e, [g.key]: !isOpen }))}
                      className="grid size-7 place-items-center rounded-md hover:bg-muted"
                      aria-label={isOpen ? "Réduire" : "Développer"}
                    >
                      {isOpen ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                    </button>
                  )}
                  {unreadCount > 0 && (
                    <button
                      onClick={() => markIds.mutate(g.items.filter((n) => !n.read_at).map((n) => n.id))}
                      className="grid size-7 place-items-center rounded-md hover:bg-muted"
                      aria-label="Marquer comme lu"
                      title="Marquer comme lu"
                    >
                      <Check className="size-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => deleteIds.mutate(g.items.map((n) => n.id))}
                    className="grid size-7 place-items-center rounded-md text-destructive hover:bg-destructive/10"
                    aria-label="Supprimer"
                    title="Supprimer"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>
              </div>
              {isThread && isOpen && (
                <ul className="border-t border-border/60 bg-muted/20">
                  {g.items.slice(1).map((n) => (
                    <li key={n.id} className={cn("flex items-start gap-2 px-3 py-2 pl-9 text-xs", !n.read_at && "bg-primary/5")}>
                      <div className="min-w-0 flex-1">
                        {(() => {
                          const t = parseNotifUrl(g.url);
                          if (!t) return <span>{n.message}</span>;
                          return (
                            <Link
                              to={t.to}
                              hash={t.hash}
                              onClick={() => markIds.mutate([n.id])}
                              className="block hover:underline"
                            >
                              {n.message}
                            </Link>
                          );
                        })()}
                        <span className="ml-1 text-[10px] text-muted-foreground">
                          · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                        </span>
                      </div>
                      <button
                        onClick={() => deleteIds.mutate([n.id])}
                        className="grid size-6 place-items-center rounded-md text-destructive hover:bg-destructive/10"
                        aria-label="Supprimer"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}