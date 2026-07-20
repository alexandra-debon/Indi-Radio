import React from "react";
import {
  Body,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  albumTitle: string;
  ownerPseudo: string;
  reporterPseudo: string;
  reason: string;
  albumUrl?: string;
  adminUrl?: string;
}

const Email = ({ albumTitle, ownerPseudo, reporterPseudo, reason, albumUrl, adminUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Nouveau signalement d'album — {albumTitle}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>🚩 Nouveau signalement d'album</Heading>
        <Text style={p}><strong>Album :</strong> {albumTitle}</Text>
        <Text style={p}><strong>Auteur :</strong> {ownerPseudo}</Text>
        <Text style={p}><strong>Signalé par :</strong> {reporterPseudo}</Text>
        <Section style={box}>
          <Text style={label}>Motif</Text>
          <Text style={messageText}>{reason}</Text>
        </Section>
        {albumUrl && (
          <Text style={p}><Link href={albumUrl} style={linkStyle}>Ouvrir l'album →</Link></Text>
        )}
        {adminUrl && (
          <Text style={p}><Link href={adminUrl} style={linkStyle}>Modérer dans l'admin →</Link></Text>
        )}
        <Text style={sig}>— Modération InDi RaDio</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => `[Modération] Album signalé : ${data.albumTitle || ""}`.trim(),
  displayName: "Album signalé (nouveau)",
  to: "radio@indi-art-culture.com",
  previewData: {
    albumTitle: "Concert Paris 2026",
    ownerPseudo: "jeanne_artiste",
    reporterPseudo: "auditeur42",
    reason: "Contenu inapproprié dans la photo 3.",
    albumUrl: "https://radio.indi-art-culture.com/u/jeanne_artiste/albums/abc",
    adminUrl: "https://radio.indi-art-culture.com/admin",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px 28px", maxWidth: "560px" };
const h1 = { color: "#111827", fontSize: "22px", margin: "0 0 16px" };
const p = { color: "#111827", fontSize: "15px", lineHeight: "1.6", margin: "0 0 10px" };
const label = { color: "#6b7280", fontSize: "12px", textTransform: "uppercase" as const, letterSpacing: "0.05em", margin: "0 0 6px" };
const box = {
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  padding: "12px 14px",
  borderRadius: "6px",
  margin: "12px 0 16px",
};
const messageText = { color: "#111827", fontSize: "14px", lineHeight: "1.6", margin: 0, whiteSpace: "pre-wrap" as const };
const linkStyle = { color: "#eab308", fontWeight: 700 as const };
const sig = { color: "#6b7280", fontSize: "13px", marginTop: "20px" };