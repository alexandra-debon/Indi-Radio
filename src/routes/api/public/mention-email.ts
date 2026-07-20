import { createFileRoute } from "@tanstack/react-router";

const SITE = "https://radio.indi-art-culture.com";

const CONTEXT_LABELS: Record<string, string> = {
  "/": "une publication du mur",
  "/en-direct": "une dédicace en direct",
  "/top": "un commentaire du Top",
};

function contextLabelFrom(url: string | null): string {
  if (!url) return "un contenu InDi RaDio";
  if (url.startsWith("/actus")) return "une actualité";
  if (url.startsWith("/u/") && url.includes("/albums/")) return "un album photo";
  if (url.startsWith("/#post-")) return "une publication du mur";
  return CONTEXT_LABELS[url] ?? "un contenu InDi RaDio";
}

export const Route = createFileRoute("/api/public/mention-email")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let body: { notification_id?: string } = {};
        try { body = await request.json(); } catch { /* ignore */ }
        const id = body.notification_id;
        if (!id || typeof id !== "string") return new Response("Bad request", { status: 400 });

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: notif } = await supabaseAdmin
          .from("notifications")
          .select("id, type, recipient_id, actor_id, url, mention_email_sent_at")
          .eq("id", id)
          .maybeSingle();

        if (!notif || notif.type !== "mention") return new Response("ok");
        if (notif.mention_email_sent_at) return new Response("already");

        // Recipient email
        const { data: userRes } = await supabaseAdmin.auth.admin.getUserById(notif.recipient_id);
        const email = userRes?.user?.email;
        if (!email) return new Response("no-email");

        const [{ data: recipient }, { data: actor }] = await Promise.all([
          supabaseAdmin.from("profiles").select("pseudo").eq("id", notif.recipient_id).maybeSingle(),
          notif.actor_id
            ? supabaseAdmin.from("profiles").select("pseudo").eq("id", notif.actor_id).maybeSingle()
            : Promise.resolve({ data: null }),
        ]);

        // Mark first (best-effort) to prevent races
        await supabaseAdmin
          .from("notifications")
          .update({ mention_email_sent_at: new Date().toISOString() })
          .eq("id", id)
          .is("mention_email_sent_at", null);

        const url = SITE + (notif.url ?? "/");
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        try {
          await sendTemplateEmail("mention-notification", email, {
            templateData: {
              recipientPseudo: recipient?.pseudo ?? "toi",
              actorPseudo: actor?.pseudo ?? "quelqu'un",
              contextLabel: contextLabelFrom(notif.url),
              url,
              prefsUrl: `${SITE}/notifications`,
            },
            idempotencyKey: `mention-${id}`,
          });
        } catch {
          // swallow — Lovable retries handle transient issues
        }
        return new Response("ok");
      },
    },
  },
});
