import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { AtSign, MessageCircle, CornerDownRight, Heart, Settings2, Bell } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type Prefs = {
  user_id: string;
  mentions: boolean;
  replies: boolean;
  thread_replies: boolean;
  likes: boolean;
};

const FIELDS: Array<{ key: keyof Omit<Prefs, "user_id">; label: string; hint: string; icon: LucideIcon }> = [
  { key: "mentions", label: "Tags (@toi)", hint: "Quand quelqu'un te tague dans un message", icon: AtSign },
  { key: "replies", label: "Réponses directes", hint: "Quand on répond à ton message ou commente ton actu", icon: MessageCircle },
  { key: "thread_replies", label: "Réponses dans un fil suivi", hint: "Quand quelqu'un répond dans un fil auquel tu as participé", icon: CornerDownRight },
  { key: "likes", label: "Likes", hint: "Quand on aime ton message ou ton actu", icon: Heart },
];
void Bell;

export function NotificationPreferences() {
  const { session } = useAuth();
  const qc = useQueryClient();

  const { data: prefs } = useQuery<Prefs>({
    queryKey: ["notif-prefs", session?.user.id],
    enabled: !!session,
    queryFn: async () => {
      if (!session) throw new Error("no session");
      const { data } = await supabase
        .from("notification_preferences")
        .select("user_id, mentions, replies, thread_replies, likes")
        .eq("user_id", session.user.id)
        .maybeSingle();
      return (data as Prefs) ?? {
        user_id: session.user.id,
        mentions: true, replies: true, thread_replies: true, likes: true,
      };
    },
  });

  const save = useMutation({
    mutationFn: async (patch: Partial<Prefs>) => {
      if (!session || !prefs) return;
      const next = { ...prefs, ...patch, user_id: session.user.id };
      const { error } = await supabase
        .from("notification_preferences")
        .upsert(next, { onConflict: "user_id" });
      if (error) throw error;
      return next;
    },
    onMutate: (patch) => {
      const prev = qc.getQueryData<Prefs>(["notif-prefs", session?.user.id]);
      if (prev) qc.setQueryData(["notif-prefs", session?.user.id], { ...prev, ...patch });
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["notif-prefs", session?.user.id], ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["notif-prefs", session?.user.id] }),
  });

  if (!session || !prefs) return null;

  return (
    <section className="space-y-3 rounded-md border-2 border-border bg-card p-4">
      <header className="flex items-center gap-2">
        <Settings2 className="size-4" />
        <h2 className="text-sm font-black uppercase tracking-widest">Préférences</h2>
      </header>
      <ul className="divide-y divide-border/60">
        {FIELDS.map(({ key, label, hint, icon: Icon }) => {
          const on = prefs[key];
          return (
            <li key={key} className="flex items-center justify-between gap-3 py-2.5">
              <div className="flex min-w-0 items-start gap-2">
                <Icon className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{label}</p>
                  <p className="text-[11px] text-muted-foreground">{hint}</p>
                </div>
              </div>
              <button
                onClick={() => save.mutate({ [key]: !on } as Partial<Prefs>)}
                aria-pressed={on}
                className={cn(
                  "relative h-6 w-11 shrink-0 rounded-full border-2 border-border transition",
                  on ? "bg-primary" : "bg-muted",
                )}
              >
                <span
                  className={cn(
                    "absolute top-0.5 grid size-4 place-items-center rounded-full bg-background shadow transition",
                    on ? "left-[calc(100%-1.25rem)]" : "left-0.5",
                  )}
                />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="text-[10px] text-muted-foreground">
        Les préférences s'appliquent aux nouvelles notifications. Les notifications déjà reçues ne sont pas supprimées.
      </p>
    </section>
  );
}