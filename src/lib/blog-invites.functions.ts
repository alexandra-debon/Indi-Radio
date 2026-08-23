import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE_ORIGIN = "https://www.radio.indi-art-culture.com";

const createSchema = z.object({
  email: z.string().trim().toLowerCase().email("Adresse email invalide").max(254),
});

const acceptSchema = z.object({ token: z.string().trim().min(10).max(120) });

async function assertAdmin(context: { supabase: any; userId: string }) {
  const { data: isAdmin, error } = await context.supabase.rpc("has_role", {
    _user_id: context.userId,
    _role: "admin",
  });
  if (error) throw new Error(error.message);
  if (!isAdmin) throw new Error("Réservé aux administrateurs.");
}

/** Admin : crée une invitation d'auteur et envoie l'email d'acceptation. */
export const createBlogInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => createSchema.parse(raw))
  .handler(async ({ data, context }) => {
    await assertAdmin(context);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Une seule invitation en attente par adresse : on remplace la précédente.
    await supabaseAdmin
      .from("blog_author_invites")
      .update({ status: "revoked" })
      .eq("status", "pending")
      .ilike("email", data.email);

    const token = crypto.randomUUID().replace(/-/g, "") + crypto.randomUUID().slice(0, 8);
    const { data: invite, error } = await supabaseAdmin
      .from("blog_author_invites")
      .insert({ email: data.email, token, invited_by: context.userId })
      .select("id, email, status, expires_at, created_at")
      .single();
    if (error) throw new Error(error.message);

    const inviteUrl = `${SITE_ORIGIN}/blog-invitation?token=${token}`;
    let sent = false;
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const res = await sendTemplateEmail("blog-author-invite", data.email, {
        templateData: {
          inviteUrl,
          invitedBy: "InDi RaDio",
          expiresAt: new Date(invite.expires_at).toLocaleDateString("fr-FR"),
        },
        idempotencyKey: `blog-invite-${invite.id}`,
      });
      sent = res.sent;
    } catch {
      sent = false;
    }
    return { ok: true as const, sent, inviteUrl, invite };
  });

/** Détail public (minimal) d'une invitation, pour la page d'acceptation. */
export const getBlogInvite = createServerFn({ method: "POST" })
  .inputValidator((raw) => acceptSchema.parse(raw))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite } = await supabaseAdmin
      .from("blog_author_invites")
      .select("email, status, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (!invite) return { found: false as const };
    const expired = new Date(invite.expires_at).getTime() < Date.now();
    return {
      found: true as const,
      email: invite.email,
      status: invite.status,
      expired,
    };
  });

/** L'invité·e connecté·e accepte l'invitation : il rejoint les auteurs du blog. */
export const acceptBlogInvite = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => acceptSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: invite, error } = await supabaseAdmin
      .from("blog_author_invites")
      .select("id, email, status, expires_at")
      .eq("token", data.token)
      .maybeSingle();
    if (error) throw new Error(error.message);
    if (!invite) throw new Error("Invitation introuvable.");
    if (invite.status === "revoked") throw new Error("Cette invitation a été révoquée.");
    if (new Date(invite.expires_at).getTime() < Date.now()) {
      throw new Error("Cette invitation a expiré.");
    }

    const email = (context.claims?.email as string | undefined)?.toLowerCase() ?? null;
    if (!email || email !== invite.email.toLowerCase()) {
      throw new Error(
        `Connecte-toi avec l'adresse invitée (${invite.email}) pour accepter cette invitation.`,
      );
    }

    const { error: insErr } = await supabaseAdmin
      .from("blog_authors")
      .upsert({ user_id: context.userId }, { onConflict: "user_id" });
    if (insErr) throw new Error(insErr.message);

    if (invite.status !== "accepted") {
      await supabaseAdmin
        .from("blog_author_invites")
        .update({ status: "accepted", accepted_at: new Date().toISOString(), accepted_by: context.userId })
        .eq("id", invite.id);
    }
    return { ok: true as const };
  });
