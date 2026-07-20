import React from "react";
import { Body, Container, Head, Heading, Html, Link, Preview, Section, Text } from "@react-email/components";
import type { TemplateEntry } from "./registry";

interface Props {
  recipientPseudo: string;
  actorPseudo: string;
  contextLabel: string;
  url: string;
  prefsUrl: string;
}

const Email = ({ recipientPseudo, actorPseudo, contextLabel, url, prefsUrl }: Props) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{actorPseudo} t'a mentionné sur InDi RaDio</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>@{actorPseudo} t'a mentionné</Heading>
        <Text style={p}>Salut {recipientPseudo},</Text>
        <Text style={p}>
          <strong>@{actorPseudo}</strong> vient de te tagger dans {contextLabel}.
        </Text>
        <Section style={box}>
          <Text style={cta}>
            <Link href={url} style={btn}>Voir la mention →</Link>
          </Text>
        </Section>
        <Text style={sig}>— L'équipe InDi RaDio</Text>
        <Text style={foot}>
          Tu ne veux plus recevoir ces emails ?{" "}
          <Link href={prefsUrl} style={linkStyle}>Gérer tes préférences</Link>.
        </Text>
      </Container>
    </Body>
  </Html>
);

export const template = {
  component: Email,
  subject: (d: Record<string, any>) => `@${d.actorPseudo || "quelqu'un"} t'a mentionné sur InDi RaDio`,
  displayName: "Mention @pseudo",
  previewData: {
    recipientPseudo: "toi",
    actorPseudo: "jeanne_artiste",
    contextLabel: "une publication du mur",
    url: "https://radio.indi-art-culture.com/",
    prefsUrl: "https://radio.indi-art-culture.com/notifications",
  },
} satisfies TemplateEntry;

const main = { backgroundColor: "#ffffff", fontFamily: "Arial, sans-serif" };
const container = { padding: "24px 28px", maxWidth: "560px" };
const h1 = { color: "#111827", fontSize: "22px", margin: "0 0 16px" };
const p = { color: "#111827", fontSize: "15px", lineHeight: "1.6", margin: "0 0 10px" };
const box = { margin: "18px 0" };
const cta = { margin: 0 };
const btn = {
  display: "inline-block",
  background: "#eab308",
  color: "#111827",
  padding: "10px 18px",
  borderRadius: "6px",
  fontWeight: 800 as const,
  textDecoration: "none",
};
const linkStyle = { color: "#eab308", fontWeight: 700 as const };
const sig = { color: "#6b7280", fontSize: "13px", marginTop: "20px" };
const foot = { color: "#9ca3af", fontSize: "11px", marginTop: "16px" };
