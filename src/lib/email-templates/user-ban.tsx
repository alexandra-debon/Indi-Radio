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
    <Preview>Votre compte Indi Radio a été fermé</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Compte fermé</Heading>
        <Text style={p}>
          Bonjour{pseudo ? ` ${pseudo}` : ""},
        </Text>
        <Text style={p}>
          Nous vous informons que votre compte sur Indi Radio a été fermé par
          l'équipe de modération pour les raisons expliquées ci-dessous.
        </Text>
        <Section style={box}>
          <Text style={reasonText}>
            {reason && reason.trim().length > 0
              ? reason
              : "Non-respect des règles de la communauté."}
          </Text>
        </Section>
        <Text style={p}>
          Si vous pensez qu'il s'agit d'une erreur, vous pouvez répondre à ce
          message pour contacter l'équipe.
        </Text>
        <Text style={sig}>— L'équipe Indi Radio</Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: "Votre compte Indi Radio a été fermé",
  displayName: "Bannissement d'un utilisateur",
  previewData: {
    pseudo: "auditeur_demo",
    reason: "Propos injurieux répétés dans les commentaires malgré un premier avertissement.",
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