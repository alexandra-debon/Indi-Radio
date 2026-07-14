import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { useQuery, useQueryClient, useMutation } from "@tanstack/react-query";
import { formatDistanceToNow } from "date-fns";
import { fr } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

  const markOne = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("notifications")
        .update({ read_at: new Date().toISOString() })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["notifications", session?.user.id] }),
  });

  if (!session) return null;
  const unread = notifs.filter((n) => !n.read_at).length;

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={`Notifications${unread ? ` (${unread} non lues)` : ""}`}
        className="relative grid size-9 place-items-center rounded-md border border-border hover:bg-muted"
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
          <div className="absolute right-0 top-full z-50 mt-1 w-80 max-w-[calc(100vw-1rem)] overflow-hidden rounded-md border-2 border-border bg-background shadow-lg">
            <div className="flex items-center justify-between border-b border-border px-3 py-2">
              <span className="text-xs font-bold uppercase tracking-widest">Notifications</span>
              {unread > 0 && (
                <button onClick={() => markAll.mutate()} className="inline-flex items-center gap-1 text-[10px] uppercase text-primary hover:underline">
                  <Check className="size-3" /> Tout marquer lu
                </button>
              )}
            </div>
            <ul className="max-h-96 overflow-auto">
              {notifs.length === 0 && (
                <li className="px-3 py-6 text-center text-xs text-muted-foreground">Aucune notification pour l'instant.</li>
              )}
              {notifs.map((n) => {
                const body = (
                  <div className={cn("flex flex-col gap-0.5 px-3 py-2 text-xs", !n.read_at && "bg-primary/5")}>
                    <span className="font-semibold">{n.message}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(n.created_at), { addSuffix: true, locale: fr })}
                    </span>
                  </div>
                );
                return (
                  <li key={n.id} className="border-b border-border last:border-0">
                    {n.url ? (
                      <a
                        href={n.url}
                        onClick={() => { markOne.mutate(n.id); setOpen(false); }}
                        className="block hover:bg-muted"
                      >
                        {body}
                      </a>
                    ) : (
                      <button onClick={() => markOne.mutate(n.id)} className="w-full text-left hover:bg-muted">
                        {body}
                      </button>
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