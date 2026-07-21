import React from "react";
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  actorPseudo: string;
  preview: string;
  url: string;
}

const Email = ({ actorPseudo, preview, url }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{actorPseudo} t'a envoyé un message sur InDi RaDio</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nouveau message de @{actorPseudo}</Heading>
        <Text style={p}>{preview}</Text>
        <Section style={box}>
          <Link href={url} style={btn}>Répondre dans le panneau admin →</Link>
        </Section>
        <Text style={sig}>— InDi RaDio</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `Nouveau message de @${d.actorPseudo || "un auditeur"}`,
  displayName: "Message admin",
  previewData: {
    actorPseudo: "jeanne",
    preview: "Bonjour, j'aurais une question…",
    url: "https://radio.indi-art-culture.com/admin/messages",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px", maxWidth: "560px", margin: "0 auto" };
const h1 = { fontSize: "20px", fontWeight: 700, color: "#111" };
const p = { fontSize: "15px", color: "#333", lineHeight: 1.5 };
const box = { padding: "16px 0" };
const btn = { background: "#facc15", color: "#000", padding: "10px 16px", borderRadius: "6px", fontWeight: 700, textDecoration: "none" };
const sig = { fontSize: "13px", color: "#555", marginTop: "24px" };