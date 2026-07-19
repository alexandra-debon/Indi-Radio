import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({ userIds: z.array(z.string().uuid()).max(200) });

/**
 * Admin-only: fetch email addresses for a list of user IDs.
 * Returns { [userId]: email | null }.
 */
export const listUserEmails = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => schema.parse(raw))
  .handler(async ({ data, context }) => {
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc("has_role", {
      _user_id: context.userId,
      _role: "admin",
    });
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Réservé aux administrateurs.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const result: Record<string, string | null> = {};
    await Promise.all(
      data.userIds.map(async (id) => {
        const { data: u, error } = await supabaseAdmin.auth.admin.getUserById(id);
        if (error) {
          result[id] = null;
          return;
        }
        result[id] = u.user?.email ?? null;
      }),
    );
    return result;
  });