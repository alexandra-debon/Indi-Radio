import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const SITE = "https://radio.indi-art-culture.com";

const newSchema = z.object({ reportId: z.string().uuid() });

export const notifyAdminAlbumReported = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => newSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: report, error } = await supabase
      .from("album_reports")
      .select("id, reason, album_id, reporter_id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (error || !report) return { sent: false as const, reason: "not_found" };

    const [{ data: album }, { data: reporter }] = await Promise.all([
      supabase.from("photo_albums").select("id, title, owner_id").eq("id", report.album_id).maybeSingle(),
      supabase.from("profiles").select("pseudo").eq("id", report.reporter_id).maybeSingle(),
    ]);
    let ownerPseudo = "—";
    if (album?.owner_id) {
      const { data: owner } = await supabase.from("profiles").select("pseudo").eq("id", album.owner_id).maybeSingle();
      ownerPseudo = owner?.pseudo ?? "—";
    }

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    try {
      const res = await sendTemplateEmail("album-report-new", "", {
        templateData: {
          albumTitle: album?.title ?? "(album supprimé)",
          ownerPseudo,
          reporterPseudo: reporter?.pseudo ?? "auditeur",
          reason: report.reason ?? "",
          albumUrl: ownerPseudo !== "—" ? `${SITE}/u/${ownerPseudo}/albums/${report.album_id}` : undefined,
          adminUrl: `${SITE}/admin`,
        },
        idempotencyKey: `album-report-new-${report.id}`,
      });
      return { sent: res.sent };
    } catch {
      return { sent: false as const, reason: "send_failed" };
    }
  });

const resolvedSchema = z.object({
  reportId: z.string().uuid(),
  outcome: z.enum(["resolved", "dismissed"]),
  actionTaken: z.string().max(500).optional(),
});

export const notifyAdminAlbumReportResolved = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((raw) => resolvedSchema.parse(raw))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const { data: isAdmin } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
    if (!isAdmin) throw new Error("Forbidden");

    const { data: report } = await supabase
      .from("album_reports")
      .select("id, album_id")
      .eq("id", data.reportId)
      .maybeSingle();
    if (!report) return { sent: false as const, reason: "not_found" };

    const { data: album } = await supabase
      .from("photo_albums")
      .select("id, title, owner_id")
      .eq("id", report.album_id)
      .maybeSingle();
    let ownerPseudo = "—";
    if (album?.owner_id) {
      const { data: owner } = await supabase.from("profiles").select("pseudo").eq("id", album.owner_id).maybeSingle();
      ownerPseudo = owner?.pseudo ?? "—";
    }
    const { data: resolver } = await supabase.from("profiles").select("pseudo").eq("id", userId).maybeSingle();

    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    try {
      const res = await sendTemplateEmail("album-report-resolved", "", {
        templateData: {
          albumTitle: album?.title ?? "(album supprimé)",
          ownerPseudo,
          resolverPseudo: resolver?.pseudo ?? "admin",
          outcome: data.outcome,
          actionTaken: data.actionTaken,
        },
        idempotencyKey: `album-report-${data.outcome}-${report.id}`,
      });
      return { sent: res.sent };
    } catch {
      return { sent: false as const, reason: "send_failed" };
    }
  });