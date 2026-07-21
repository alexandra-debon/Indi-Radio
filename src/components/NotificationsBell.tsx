import { useEffect, useMemo, useState } from "react";
import { Bell, Check, ChevronDown, ChevronRight } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { parseNotifUrl } from "@/lib/notif-navigate";

interface Notif {
  id: string;
  type: string;
  message: string;
  url: string | null;
  read_at: string | null;
  created_at: string;
}

export function NotificationsBell() {
  const { session } = useAuth();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const { data: notifs = [] } = useQuery<Notif[]>({
    queryKey: ["notifications", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("id, type, message, url, read_at, created_at")
        .order("created_at", { ascending: false })
        .limit(30);
      return (data ?? []) as Notif[];
    },
  });

  useEffect(() => {
    if (!session) return;
    const channel = supabase
      .channel(`notif-${session.user.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "notifications", filter: `recipient_id=eq.${session.user.id}` },
        () => qc.invalidateQueries({ queryKey: ["notifications", session.user.id] }),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, qc]);

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
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", session?.user.id] }),
  });

  const optimisticMark = (ids: string[]) => {
    const key = ["notifications", session?.user.id];
    const prev = qc.getQueryData<Notif[]>(key);
    if (prev) {
      const now = new Date().toISOString();
      const set = new Set(ids);
      qc.setQueryData<Notif[]>(key, prev.map((n) => (set.has(n.id) && !n.read_at ? { ...n, read_at: now } : n)));
    }
    return prev;
  };

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: (id) => ({ prev: optimisticMark([id]) }),
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notifications", session?.user.id], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications", session?.user.id] }),
  });

  const markMany = useMutation({
    mutationFn: async (ids: string[]) => {
      if (!ids.length) return;
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .in("id", ids);
      if (error) throw error;
    },
    onMutate: (ids) => ({ prev: optimisticMark(ids) }),
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notifications", session?.user.id], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notifications", session?.user.id] }),
  });

  const groups = useMemo(() => {
    const map = new Map<string, { key: string; url: string | null; items: Notif[] }>();
    for (const n of notifs) {
      const key = n.url ?? `single:${n.id}`;
      const g = map.get(key) ?? { key, url: n.url, items: [] };
      g.items.push(n);
      map.set(key, g);
    }
    return Array.from(map.values());
  }, [notifs]);

  if (!session) return null;
  const unread = notifs.filter((n) => !n.read_at).length;

  return (
    <div className="relative shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}
        className="relative grid size-9 shrink-0 place-items-center rounded-md border border-border hover:bg-muted"
      >
        <Bell className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid size-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="fixed left-1/2 top-16 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 overflow-hidden rounded-md border-2 border-border bg-background shadow-lg sm:absolute sm:left-auto sm:right-0 sm:top-full sm:mt-1 sm:w-80 sm:max-w-[calc(100vw-1rem)] sm:translate-x-0">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-bold uppercase tracking-widest">Notifications</span>
              <div className="flex items-center gap-2">
                {unread > 0 && (
                  <button onClick={() => markAll.mutate()} className="inline-flex items-center gap-1 text-[10px] uppercase text-primary hover:underline">
                    <Check className="size-3" /> Tout marquer lu
                  </button>
                )}
                <Link to="/notifications" onClick={() => setOpen(false)} className="text-[10px] uppercase text-primary hover:underline">
                  Ouvrir
                </Link>
              </div>
            </div>
            <ul className="max-h-96 overflow-auto">
              {notifs.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">Aucune notification pour l'instant.</li>
              )}
              {groups.map((g) => {
                const latest = g.items[0];
                const unreadCount = g.items.filter((n) => !n.read_at).length;
                const isOpen = !!expanded[g.key];
                const isThread = g.items.length > 1;
                const openThread = () => {
                  markMany.mutate(g.items.filter((n) => !n.read_at).map((n) => n.id));
                  setOpen(false);
                };
                return (
                  <li key={g.key} className="border-b border-border last:border-0">
                    <div className={cn("flex items-start gap-1 px-3 py-2 text-xs", unreadCount > 0 && "bg-primary/5")}>
                      {isThread && (
                        <button
                          onClick={() => setExpanded((e) => ({ ...e, [g.key]: !isOpen }))}
                          className="mt-0.5 text-muted-foreground hover:text-foreground"
                          aria-label={isOpen ? "Réduire" : "Développer"}
                        >
                          {isOpen ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                        </button>
                      )}
                      <div className="flex-1">
                        {(() => {
                          const target = parseNotifUrl(g.url);
                          if (target) {
                            return (
                              <Link
                                to={target.to}
                                hash={target.hash}
                                onClick={openThread}
                                className="block hover:underline"
                              >
                                <span className="font-semibold">{latest.message}</span>
                              </Link>
                            );
                          }
                          return (
                          <button onClick={() => markOne.mutate(latest.id)} className="w-full text-left">
                            <span className="font-semibold">{latest.message}</span>
                          </button>
                          );
                        })()}
                        <div className="mt-0.5 flex items-center gap-2 text-[10px] text-muted-foreground">
                          <span>{formatDistanceToNow(new Date(latest.created_at), { addSuffix: true, locale: fr })}</span>
                          {isThread && (
                            <span className="rounded bg-muted px-1.5 py-0.5 font-semibold">
                              {g.items.length} msgs{unreadCount > 0 ? ` · ${unreadCount} nouv.` : ""}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    {isThread && isOpen && (
                      <ul className="border-t border-border/50 bg-muted/20">
                        {g.items.slice(1).map((n) => (
                          <li key={n.id} className={cn("px-3 py-1.5 pl-8 text-[11px]", !n.read_at && "bg-primary/5")}>
                            {(() => {
                              const t = parseNotifUrl(g.url);
                              if (!t) return <span>{n.message}</span>;
                              return (
                                <Link
                                  to={t.to}
                                  hash={t.hash}
                                  onClick={() => { markOne.mutate(n.id); setOpen(false); }}
                                  className="block hover:underline"
                                >
                                  <span>{n.message}</span>
                                  <span className="ml-1 text-[10px] text-muted-foreground">
                                    · {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                                  </span>
                                </Link>
                              );
                            })()}
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        </>
      )}
    </div>
  );
}