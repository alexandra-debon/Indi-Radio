import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { EmailAPIError } from "@lovable.dev/email-js";
import { sendTemplateEmail } from "@/lib/email-templates/send-email";

async function ensureAdmin(ctx: { supabase: any; userId: string }) {
  const { data, error } = await ctx.supabase.rpc("has_role", {
    _user_id: ctx.userId,
    _role: "admin",
  });
  if (error || !data) throw new Error("Forbidden");
}

export const sendTestEmail = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: { to: string }) => {
    if (!d?.to || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(d.to)) {
      throw new Error("Adresse email invalide");
    }
    return d;
  })
  .handler(async ({ data, context }) => {
    await ensureAdmin(context);
    try {
      const res = await sendTemplateEmail("contact-confirmation", data.to, {
        templateData: { name: "Admin (test)" },
        idempotencyKey: `email-diag-${Date.now()}`,
      });
      if (res.sent) return { ok: true as const };
      return { ok: false as const, code: "recipient_suppressed", message: "Destinataire supprimé côté serveur mail (bounce/plainte/désinscription)." };
    } catch (e: any) {
      if (e instanceof EmailAPIError) {
        return {
          ok: false as const,
          code: e.code || "email_api_error",
          status: e.status,
          retryAfterSeconds: e.retryAfterSeconds ?? null,
          message: e.message,
        };
      }
      return { ok: false as const, code: "unknown", message: e?.message || "Erreur inconnue" };
    }
  });

export const listRecentEmailEvents = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await ensureAdmin(context);
    try {
      const mod: any = await import("@lovable.dev/email-js");
      if (typeof mod.listEmailLogs !== "function") {
        return { supported: false as const, events: [] as any[] };
      }
      const res = await mod.listEmailLogs({ limit: 20 });
      const events = (res?.events || res?.data || res || []) as any[];
      return { supported: true as const, events };
    } catch (e: any) {
      return { supported: false as const, events: [], error: e?.message };
    }
  });