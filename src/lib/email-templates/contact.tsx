import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const Email = ({ name, email, subject, message }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Nouveau message de contact — {subject}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nouveau message de contact</Heading>
        <Text style={p}>
          <strong>De :</strong> {name} ({email})
        </Text>
        <Text style={p}>
          <strong>Sujet :</strong> {subject}
        </Text>
        <Section style={box}>
          <Text style={messageText}>{message}</Text>
        </Section>
        <Text style={sig}>— Formulaire de contact InDi Radio</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => `[Contact] ${data.subject || "Nouveau message"}`,
  displayName: "Message de contact",
  to: "radio@indi-art-culture.com",
  previewData: {
    name: "Jeanne Artiste",
    email: "jeanne@example.com",
    subject: "Soumission d'un morceau",
    message: "Bonjour, je souhaite soumettre mon dernier single pour diffusion sur InDi Radio.",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px 28px", maxWidth: "560px" };
const h1 = { color: "#111827", fontSize: "22px", margin: "0 0 16px" };
const p = { color: "#111827", fontSize: "15px", lineHeight: "1.6", margin: "0 0 12px" };
const box = {
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  padding: "14px 16px",
  borderRadius: "6px",
  margin: "12px 0 16px",
};
const messageText = { color: "#111827", fontSize: "14px", lineHeight: "1.6", margin: 0, whiteSpace: "pre-wrap" as const };
const sig = { color: "#6b7280", fontSize: "13px", marginTop: "20px" };
