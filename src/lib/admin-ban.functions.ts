import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const inputSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().trim().min(1, "Motif requis").max(2000),
});

/**
 * Admin-only: send a ban notification email to the user, then delete their
 * auth account (which cascades to the public.profiles row and related data).
 */
export const banUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => inputSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { userId, reason } = data;

    if (userId === context.userId) {
      throw new Error("Vous ne pouvez pas vous bannir vous-même.");
    }

    // Confirm caller is admin under RLS
    const { data: isAdmin, error: roleErr } = await context.supabase.rpc(
      "has_role",
      { _user_id: context.userId, _role: "admin" },
    );
    if (roleErr) throw new Error(roleErr.message);
    if (!isAdmin) throw new Error("Réservé aux administrateurs.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Fetch pseudo (for email) before deletion
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("pseudo")
      .eq("id", userId)
      .maybeSingle();

    // Fetch email from auth
    const { data: userData, error: userErr } =
      await supabaseAdmin.auth.admin.getUserById(userId);
    if (userErr) throw new Error(userErr.message);
    const email = userData.user?.email ?? null;

    // Send email if we have an address (don't block the ban if it fails)
    let emailStatus: "sent" | "suppressed" | "no_email" | "failed" = "no_email";
    let emailError: string | undefined;
    if (email) {
      try {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        const res = await sendTemplateEmail("user-ban", email, {
          templateData: { pseudo: profile?.pseudo ?? undefined, reason },
          idempotencyKey: `ban-${userId}`,
        });
        emailStatus = res.sent ? "sent" : "suppressed";
      } catch (e) {
        emailStatus = "failed";
        emailError = e instanceof Error ? e.message : String(e);
        console.error("[banUser] email failed", emailError);
      }
    }

    // Delete the auth user — profiles.id FK cascades
    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) throw new Error(delErr.message);

    return { ok: true as const, emailStatus, emailError };
  });