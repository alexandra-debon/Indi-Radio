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
  subject: string;
  message: string;
}

const Email = ({ name, subject, message }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Nous avons bien reçu votre message — InDi RaDio</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Merci {name} !</Heading>
        <Text style={p}>
          Nous avons bien reçu votre message et vous répondrons dans les meilleurs délais.
        </Text>
        <Text style={p}>
          <strong>Sujet :</strong> {subject}
        </Text>
        <Section style={box}>
          <Text style={messageText}>{message}</Text>
        </Section>
        <Text style={p}>
          En attendant, retrouvez-nous en direct sur{" "}
          <a href="https://radio.indi-art-culture.com" style={link}>
            radio.indi-art-culture.com
          </a>
          .
        </Text>
        <Text style={sig}>— L'équipe InDi RaDio</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) =>
    `Nous avons bien reçu votre message — ${data.subject || "InDi RaDio"}`,
  displayName: "Accusé de réception — Contact",
  previewData: {
    name: "Jeanne Artiste",
    subject: "Soumission d'un morceau",
    message: "Bonjour, je souhaite soumettre mon dernier single.",
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
const link = { color: "#eab308", textDecoration: "underline" };
const sig = { color: "#6b7280", fontSize: "13px", marginTop: "20px" };