import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const contactSchema = z.object({
  name: z.string().trim().min(1, "Votre nom est requis").max(120),
  email: z.string().trim().email("Adresse email invalide").max(254),
  subject: z.string().trim().min(1, "Sujet requis").max(200),
  message: z.string().trim().min(10, "Votre message doit faire au moins 10 caractères").max(5000),
});

export const sendContactEmail = createServerFn({ method: "POST" })
  .inputValidator((raw) => contactSchema.parse(raw))
  .handler(async ({ data }) => {
    const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
    const submissionId = crypto.randomUUID();
    // 1) Notification à l'équipe (destinataire fixé par le template)
    const teamResult = await sendTemplateEmail("contact", data.email, {
      templateData: data,
      replyTo: data.email,
      idempotencyKey: `contact-team-${submissionId}`,
    });
    // 2) Accusé de réception à l'expéditeur
    let ackSent = false;
    try {
      const ack = await sendTemplateEmail("contact-confirmation", data.email, {
        templateData: { name: data.name, subject: data.subject, message: data.message },
        idempotencyKey: `contact-ack-${submissionId}`,
      });
      ackSent = ack.sent;
    } catch {
      // On n'échoue pas la soumission si l'accusé ne part pas
      ackSent = false;
    }
    return { ok: true as const, sent: teamResult.sent, ackSent };
  });
