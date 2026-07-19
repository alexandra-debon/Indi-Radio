import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Self-service account deletion (App Store Guideline 5.1.1(v) — obligatoire).
 * L'utilisateur authentifié supprime définitivement son compte et ses données.
 *
 * Les tables liées suppriment leurs lignes via ON DELETE CASCADE des FKs vers
 * auth.users (profiles, notifications, content_comments, content_likes, etc.).
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const userId = context.userId;
    if (!userId) throw new Error("Non authentifié.");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    // Best-effort nettoyage explicite pour les tables sans cascade stricte.
    await supabaseAdmin.from("notifications").delete().eq("recipient_id", userId);
    await supabaseAdmin.from("profiles").delete().eq("id", userId);

    const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
    if (error) throw new Error(error.message);

    return { ok: true };
  });