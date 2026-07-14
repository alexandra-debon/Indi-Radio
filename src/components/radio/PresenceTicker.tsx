import { useEffect } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useRadio } from "./RadioPlayerProvider";
import { supabase } from "@/integrations/supabase/client";
import { useQueryClient } from "@tanstack/react-query";

/**
 * Fire-and-forget presence ticker.
 * While the radio is playing AND the user is signed in, we ask the server
 * to award 1 presence point every 5 minutes. The DB function
 * `award_presence_point` enforces a per-day cap (10 pts / user).
 */
export function PresenceTicker() {
  const { session } = useAuth();
  const { playing } = useRadio();
  const qc = useQueryClient();

  useEffect(() => {
    if (!session || !playing) return;
    const tick = async () => {
      const { data } = await supabase.rpc("award_presence_point", { p_user_id: session.user.id });
      if (data) qc.invalidateQueries({ queryKey: ["profile"] });
    };
    const id = setInterval(tick, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, [session, playing, qc]);

  return null;
}