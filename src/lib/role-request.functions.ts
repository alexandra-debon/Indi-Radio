import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE_ORIGIN = "https://www.radio.indi-art-culture.com";

const submitSchema = z.object({
  role: z.enum(["artiste", "media"]),
  stageName: z.string().trim().max(80).optional().or(z.literal("")),
  punchline: z.string().trim().max(160).optional().or(z.literal("")),
  note: z.string().trim().min(30, "Présente-toi en quelques lignes (30 caractères minimum).").max(2000),
  socialLinks: z.record(z.string(), z.any()).optional(),
});

const reviewSchema = z.object({
  userId: z.string().uuid(),
  decision: z.enum(["approved", "rejected"]),
});

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Réservé aux administrateurs.");
}

/** Candidat : soumet une demande de statut Artiste ou Média (reste auditeur en attendant). */
export const submitRoleRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => submitSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const patch: any = {
      role_requested: data.role,
      role_request_status: "pending",
      role_request_note: data.note,
      role_request_submitted_at: new Date().toISOString(),
    };
    if (data.stageName) patch.stage_name = data.stageName;
    if (data.punchline) patch.punchline = data.punchline;
    if (data.socialLinks) patch.social_links = data.socialLinks;

    const { data: profile, error } = await context.supabase
      .from("profiles")
      .update(patch)
      .eq("id", context.userId)
      .select("pseudo, stage_name, role_requested, role_request_note")
      .single();
    if (error) throw new Error(error.message);

    // Email aux admins (les notifications in-app sont créées par un trigger DB).
    try {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const { data: admins } = await supabaseAdmin.from("profiles").select("id").eq("role", "admin");
      for (const a of admins ?? []) {
        const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(a.id);
        const email = userRes?.user?.email;
        if (!email) continue;
        await sendTemplateEmail("role-request", email, {
          templateData: {
            pseudo: profile?.pseudo ?? "Un membre",
            roleRequested: data.role === "media" ? "Média" : "Artiste",
            stageName: profile?.stage_name ?? "",
            note: data.note,
            reviewUrl: `${SITE_ORIGIN}/admin/candidatures`,
          },
          idempotencyKey: `role-request-${context.userId}-${a.id}-${Date.now()}`,
        });
      }
    } catch {
      /* l'email ne doit jamais bloquer la candidature */
    }

    return { ok: true as const };
  });

/** Admin : approuve ou refuse une candidature. */
export const reviewRoleRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => reviewSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: candidate, error: readErr } = await supabaseAdmin
      .from("profiles")
      .select("id, role_requested, role_request_status")
      .eq("id", data.userId)
      .maybeSingle();
    if (readErr) throw new Error(readErr.message);
    if (!candidate) throw new Error("Candidat introuvable.");
    if (candidate.role_request_status !== "pending") throw new Error("Candidature déjà traitée.");

    const now = new Date().toISOString();
    const patch: any =
      data.decision === "approved"
        ? {
            role: candidate.role_requested ?? "artiste",
            is_certified: true,
            role_request_status: "approved",
            role_request_reviewed_at: now,
          }
        : {
            role_request_status: "rejected",
            role_requested: null,
            role_request_reviewed_at: now,
          };

    const { error } = await supabaseAdmin.from("profiles").update(patch).eq("id", data.userId);
    if (error) throw new Error(error.message);

    await supabaseAdmin.from("notifications").insert({
      recipient_id: data.userId,
      actor_id: context.userId,
      type: "role_request",
      message:
        data.decision === "approved"
          ? "Ta candidature a été acceptée : ton profil est désormais certifié."
          : "Ta candidature n'a pas été retenue pour le moment. Tu peux en soumettre une nouvelle.",
      url: "/profile",
    });

    return { ok: true as const };
  });
