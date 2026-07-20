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
  albumTitle: string;
  ownerPseudo: string;
  resolverPseudo: string;
  outcome: "resolved" | "dismissed";
  actionTaken?: string;
}

const Email = ({ albumTitle, ownerPseudo, resolverPseudo, outcome, actionTaken }: Props) => {
  const outcomeLabel = outcome === "resolved" ? "Résolu" : "Rejeté";
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>Signalement d'album {outcomeLabel.toLowerCase()} — {albumTitle}</Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>✅ Signalement traité — {outcomeLabel}</Heading>
          <Text style={p}><strong>Album :</strong> {albumTitle}</Text>
          <Text style={p}><strong>Auteur :</strong> {ownerPseudo}</Text>
          <Text style={p}><strong>Traité par :</strong> {resolverPseudo}</Text>
          {actionTaken && (
            <Section style={box}>
              <Text style={messageText}>{actionTaken}</Text>
            </Section>
          )}
          <Text style={sig}>— Modération InDi RaDio</Text>
        </Container>
      </Body>
    </Html>
  );
};

export const template = {
  component: Email,
  subject: (data: Record<string, any>) => {
    const label = data.outcome === "dismissed" ? "rejeté" : "résolu";
    return `[Modération] Signalement d'album ${label} : ${data.albumTitle || ""}`.trim();
  },
  displayName: "Album signalé (traité)",
  to: "radio@indi-art-culture.com",
  previewData: {
    albumTitle: "Concert Paris 2026",
    ownerPseudo: "jeanne_artiste",
    resolverPseudo: "admin",
    outcome: "resolved",
    actionTaken: "Album supprimé.",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px 28px", maxWidth: "560px" };
const h1 = { color: "#111827", fontSize: "22px", margin: "0 0 16px" };
const p = { color: "#111827", fontSize: "15px", lineHeight: "1.6", margin: "0 0 10px" };
const box = {
  border: "1px solid #e5e7eb",
  background: "#f9fafb",
  padding: "12px 14px",
  borderRadius: "6px",
  margin: "12px 0 16px",
};
const messageText = { color: "#111827", fontSize: "14px", lineHeight: "1.6", margin: 0, whiteSpace: "pre-wrap" as const };
const sig = { color: "#6b7280", fontSize: "13px", marginTop: "20px" };