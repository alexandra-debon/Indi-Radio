import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Bell, BellOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { Button } from "@/components/ui/button";
import { useVillageTxt } from "@/components/village/village-i18n";

/** Abonnement global aux articles RéDaK'Village (notification à chaque publication/mise à jour). */
export function VillageSubscribeButton({ className }: { className?: string }) {
  const txt = useVillageTxt();
  const { session, requireAuth } = useAuth();
  const qc = useQueryClient();
  const uid = session?.user?.id ?? null;

  const { data: subscribed = false } = useQuery({
    queryKey: ["village-subscription", uid],
    enabled: !!uid,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("village_subscriptions")
        .select("id")
        .eq("user_id", uid!)
        .maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });

  const toggle = useMutation({
    mutationFn: async () => {
      if (!uid) return false;
      if (subscribed) {
        const { error } = await supabase
          .from("village_subscriptions")
          .delete()
          .eq("user_id", uid);
        if (error) throw error;
        return false;
      }
      const { error } = await supabase
        .from("village_subscriptions")
        .insert({ user_id: uid });
      if (error) throw error;
      return true;
    },
    onSuccess: (now) => {
      qc.invalidateQueries({ queryKey: ["village-subscription", uid] });
      toast.success(now ? txt.subscribed : txt.unsubscribed);
    },
    onError: () => toast.error(txt.subError),
  });

  return (
    <Button
      type="button"
      variant={subscribed ? "secondary" : "outline"}
      className={"gap-1.5 " + (className ?? "")}
      disabled={toggle.isPending}
      onClick={() => requireAuth(() => toggle.mutate())}
      aria-pressed={subscribed}
    >
      {subscribed ? <BellOff className="size-4" /> : <Bell className="size-4" />}
      {subscribed ? txt.unsubscribe : txt.subscribe}
    </Button>
  );
}
