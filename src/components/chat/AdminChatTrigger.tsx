import { useEffect, useState } from "react";
import { MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";

export function AdminChatTrigger({ className }: { className?: string }) {
  const { session, isAdmin } = useAuth();
  const [unread, setUnread] = useState(0);
  const uid = session?.user.id ?? null;

  useEffect(() => {
    if (!uid || isAdmin) return;
    const load = async () => {
      const { count } = await (supabase as any)
        .from("admin_messages")
        .select("*", { count: "exact", head: true })
        .eq("user_id", uid)
        .eq("is_from_admin", true)
        .is("read_at", null);
      setUnread(count ?? 0);
    };
    load();
    const ch = supabase
      .channel(`chat_trigger_${uid}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_messages", filter: `user_id=eq.${uid}` }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [uid, isAdmin]);

  useEffect(() => {
    if (!isAdmin) return;
    const load = async () => {
      const { count } = await (supabase as any)
        .from("admin_messages")
        .select("*", { count: "exact", head: true })
        .eq("is_from_admin", false)
        .is("read_at", null);
      setUnread(count ?? 0);
    };
    load();
    const ch = supabase
      .channel(`chat_trigger_admin_all`)
      .on("postgres_changes", { event: "*", schema: "public", table: "admin_messages" }, load)
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin]);

  const onClick = () => {
    if (!session) {
      window.dispatchEvent(new Event("indi:open-auth"));
      return;
    }
    // Dispatch event AND call imperative fallback so the panel opens even
    // if the event is missed (race on first mount, WebView quirks, etc.).
    try { window.dispatchEvent(new Event("indi:open-admin-chat")); } catch {}
    try { document.dispatchEvent(new Event("indi:open-admin-chat")); } catch {}
    const fn = (window as any).__indiOpenAdminChat;
    if (typeof fn === "function") fn();
  };

  return (
    <button
      onClick={onClick}
      aria-label="Chat Team Indi"
      title="Chat Team Indi"
      className={cn("flex shrink-0 flex-col items-center gap-0.5", className)}
    >
      <span className="text-[8px] font-black uppercase leading-[1.05] tracking-wide text-primary text-center">
        Chat<br />Team Indi
      </span>
      <span className="relative grid size-9 place-items-center rounded-full border-2 border-black bg-primary text-black shadow-[2px_2px_0_0_#000]">
        <MessageCircle className="size-4" />
        {unread > 0 && (
          <span className="absolute -right-1 -top-1 grid size-4 min-w-4 place-items-center rounded-full border border-black bg-destructive px-1 text-[9px] font-bold text-destructive-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        )}
      </span>
    </button>
  );
}