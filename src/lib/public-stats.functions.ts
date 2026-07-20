import { createServerFn } from "@tanstack/react-start";

/**
 * Public: total number of registered users (profiles).
 * Safe to expose as an aggregate count.
 */
export const getUserCount = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { count, error } = await supabaseAdmin
    .from("profiles")
    .select("*", { count: "exact", head: true });
  if (error) throw new Error(error.message);
  return { count: count ?? 0 };
});
