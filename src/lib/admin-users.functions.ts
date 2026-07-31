import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const schema = z.object({ userIds: z.array(z.string().uuid()).max(200) });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Réservé aux administrateurs.");
}

/**
 * Admin-only: fetch the internal moderation note (quarantine reason).
 * This column is not readable by anon/authenticated roles.
 */
export const listQuarantineReasons = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => schema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("profiles")
      .select("id, quarantine_reason")
      .in("id", data.userIds);
    if (error) throw new Error(error.message);
    const result: Record<string, string | null> = {};
    for (const r of rows ?? []) result[r.id] = r.quarantine_reason ?? null;
    return result;
  });

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