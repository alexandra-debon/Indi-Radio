import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://radio.indi-art-culture.com";

export const Route = createFileRoute("/api/public/admin-message-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { message_id?: string } = {};
        try { body = await request.json(); } catch { /* ignore */ }
        const id = body.message_id;
        if (!id || typeof id !== "string") return new Response("Bad request", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: msg } = await (supabaseAdmin as any)
          .from("admin_messages")
          .select("id, sender_id, body, image_url, is_from_admin")
          .eq("id", id)
          .maybeSingle();

        if (!msg || msg.is_from_admin) return new Response("ok");

        const { data: actor } = await supabaseAdmin
          .from("profiles")
          .select("pseudo")
          .eq("id", msg.sender_id)
          .maybeSingle();

        // List admins
        const { data: admins } = await supabaseAdmin
          .from("profiles")
          .select("id")
          .eq("role", "admin");

        if (!admins || admins.length === 0) return new Response("no-admin");

        const preview = (msg.body && msg.body.trim().length > 0)
          ? (msg.body.length > 200 ? msg.body.slice(0, 197) + "…" : msg.body)
          : "[image]";

        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");

        for (const a of admins) {
          const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(a.id);
          const email = userRes?.user?.email;
          if (!email) continue;
          try {
            await sendTemplateEmail("admin-message", email, {
              templateData: {
                actorPseudo: actor?.pseudo ?? "un auditeur",
                preview,
                url: `${SITE}/admin/messages`,
              },
              idempotencyKey: `admin-msg-${id}-${a.id}`,
            });
          } catch { /* swallow */ }
        }
        return new Response("ok");
      },
    },
  },
});