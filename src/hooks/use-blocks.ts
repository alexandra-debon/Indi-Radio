import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";

/**
 * Blocage d'un membre par un autre membre (exigence App Store 1.2 / Google UGC).
 * Les contenus des personnes bloquées sont masqués côté client.
 */
export function useBlockedIds() {
  const { session } = useAuth();
  const uid = session?.user.id ?? null;
  const { data = [] } = useQuery<string[]>({
    queryKey: ["user-blocks", uid],
    enabled: !!uid,
    staleTime: 60_000,
    queryFn: async () => {
      const { data, error } = await supabase.from("user_blocks").select("blocked_id");
      if (error) throw error;
      return (data ?? []).map((r) => r.blocked_id as string);
    },
  });
  return data;
}

export function useIsBlocked(userId: string | null | undefined) {
  const blocked = useBlockedIds();
  return !!userId && blocked.includes(userId);
}

export function useToggleBlock() {
  const { session } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ userId, block }: { userId: string; block: boolean }) => {
      const uid = session?.user.id;
      if (!uid) throw new Error("auth");
      if (block) {
        const { error } = await supabase
          .from("user_blocks")
          .insert({ blocker_id: uid, blocked_id: userId });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase
          .from("user_blocks")
          .delete()
          .eq("blocker_id", uid)
          .eq("blocked_id", userId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["user-blocks"] });
      void qc.invalidateQueries({ queryKey: ["wall-posts"] });
      void qc.invalidateQueries({ queryKey: ["wall-comments"] });
    },
  });
}
