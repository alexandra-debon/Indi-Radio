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
  pseudo?: string;
  reason?: string;
}

const Email = ({ pseudo, reason }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Votre compte Indi Radio est temporairement suspendu</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Compte mis en quarantaine</Heading>
        <Text style={p}>Bonjour{pseudo ? ` ${pseudo}` : ""},</Text>
        <Text style={p}>
          Votre compte a été mis en quarantaine par l'équipe de modération.
          Il reste actif mais vos publications, commentaires, likes et
          dédicaces sont temporairement masqués et bloqués le temps de la
          revue.
        </Text>
        <Section style={box}>
          <Text style={reasonText}>
            {reason && reason.trim().length > 0
              ? reason
              : "Non-respect des règles de la communauté."}
          </Text>
        </Section>
        <Text style={p}>
          Si vous pensez qu'il s'agit d'une erreur ou souhaitez répondre,
          vous pouvez contacter l'équipe en répondant à ce message. Sans
          nouvelles de votre part, le compte pourra être définitivement
          fermé.
        </Text>
        <Text style={sig}>— L'équipe Indi Radio</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Votre compte Indi Radio est mis en quarantaine",
  displayName: "Mise en quarantaine d'un utilisateur",
  previewData: {
    pseudo: "auditeur_demo",
    reason: "Plusieurs signalements pour propos déplacés — revue en cours.",
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
const reasonText = { color: "#111827", fontSize: "14px", lineHeight: "1.6", margin: 0, whiteSpace: "pre-wrap" as const };
const sig = { color: "#6b7280", fontSize: "13px", marginTop: "20px" };