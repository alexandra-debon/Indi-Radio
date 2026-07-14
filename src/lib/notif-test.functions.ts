import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const schema = z.object({
  kind: z.enum(["mention", "reply", "reply_deep", "like", "news_like"]),
});

export const triggerTestNotif = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => schema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const uid = context.userId;
    const { data: prof } = await supabaseAdmin
      .from("profiles")
      .select("pseudo")
      .eq("id", uid)
      .maybeSingle();
    const pseudo = prof?.pseudo ?? "toi";

    const rows: Record<typeof data.kind, { type: string; message: string; url: string }> = {
      mention: {
        type: "mention",
        message: `${pseudo} t'a tagué dans un message (test)`,
        url: `/#post-test-${Date.now()}`,
      },
      reply: {
        type: "reply",
        message: `${pseudo} a répondu à ton message (test)`,
        url: `/#post-test-reply`,
      },
      reply_deep: {
        type: "reply",
        message: `${pseudo} a répondu dans un fil que tu suis (test)`,
        url: `/#post-test-reply`,
      },
      like: {
        type: "like",
        message: `${pseudo} a aimé ton message (test)`,
        url: `/#post-test-like`,
      },
      news_like: {
        type: "like",
        message: `${pseudo} a aimé ta publication « Test » (test)`,
        url: `/actus#news-test`,
      },
    };
    const r = rows[data.kind];
    const { error } = await supabaseAdmin.from("notifications").insert({
      recipient_id: uid,
      actor_id: uid,
      type: r.type,
      message: r.message,
      url: r.url,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });