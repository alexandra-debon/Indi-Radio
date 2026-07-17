import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const withReasonSchema = z.object({
  userId: z.string().uuid(),
  reason: z.string().trim().min(1, "Motif requis").max(2000),
});
const userOnlySchema = z.object({ userId: z.string().uuid() });

async function requireAdmin(context: {
  supabase: any;
  userId: string;
}) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Réservé aux administrateurs.");
}

async function sendModerationEmail(
  userId: string,
  reason: string,
  templateName: "user-quarantine" | "user-ban",
  idPrefix: string,
) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("pseudo")
    .eq("id", userId)
    .maybeSingle();
  const { data: userData, error: userErr } =
    await supabaseAdmin.auth.admin.getUserById(userId);
  if (userErr) throw new Error(userErr.message);
  const email = userData.user?.email ?? null;

  let emailStatus: "sent" | "suppressed" | "no_email" | "failed" = "no_email";
  let emailError: string | undefined;
  if (email) {
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const res = await sendTemplateEmail(templateName, email, {
        templateData: { pseudo: profile?.pseudo ?? undefined, reason },
        idempotencyKey: `${idPrefix}-${userId}-${Date.now()}`,
      });
      emailStatus = res.sent ? "sent" : "suppressed";
    } catch (e) {
      emailStatus = "failed";
      emailError = e instanceof Error ? e.message : String(e);
      console.error(`[${templateName}] email failed`, emailError);
    }
  }
  return { pseudo: profile?.pseudo ?? null, emailStatus, emailError };
}

/**
 * Step 1 — Soft ban: mark the profile as quarantined + reason,
 * hide their content, block new actions, notify them by email.
 * Does NOT delete the account.
 */
export const quarantineUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => withReasonSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { userId, reason } = data;
    if (userId === context.userId) {
      throw new Error("Vous ne pouvez pas vous mettre vous-même en quarantaine.");
    }
    await requireAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error: updErr } = await supabaseAdmin
      .from("profiles")
      .update({ quarantined_at: new Date().toISOString(), quarantine_reason: reason })
      .eq("id", userId);
    if (updErr) throw new Error(updErr.message);

    const mail = await sendModerationEmail(userId, reason, "user-quarantine", "quarantine");
    return { ok: true as const, ...mail };
  });

/**
 * Lift quarantine: clears the flags. No email.
 */
export const releaseUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => userOnlySchema.parse(raw))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("profiles")
      .update({ quarantined_at: null, quarantine_reason: null })
      .eq("id", data.userId);
    if (error) throw new Error(error.message);
    return { ok: true as const };
  });

/**
 * Step 2 — Hard delete. Requires the profile to already be in quarantine.
 * Sends the final ban email then deletes the auth user (cascades).
 */
export const banUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => withReasonSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { userId, reason } = data;
    if (userId === context.userId) {
      throw new Error("Vous ne pouvez pas vous bannir vous-même.");
    }
    await requireAdmin(context);

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: profile, error: profErr } = await supabaseAdmin
      .from("profiles")
      .select("quarantined_at")
      .eq("id", userId)
      .maybeSingle();
    if (profErr) throw new Error(profErr.message);
    if (!profile?.quarantined_at) {
      throw new Error(
        "Ce compte doit d'abord être mis en quarantaine avant suppression définitive.",
      );
    }

    const mail = await sendModerationEmail(userId, reason, "user-ban", "ban");

    const { error: delErr } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (delErr) throw new Error(delErr.message);

    return { ok: true as const, ...mail };
  });