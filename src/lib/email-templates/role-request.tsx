import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from '@react-email/components'

interface RoleRequestProps {
  pseudo: string
  roleRequested: string
  stageName?: string
  note?: string
  reviewUrl: string
}

export const RoleRequestEmail = ({
  pseudo,
  roleRequested,
  stageName,
  note,
  reviewUrl,
}: RoleRequestProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>{`Nouvelle candidature ${roleRequested} — ${pseudo}`}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Nouvelle candidature {roleRequested}</Heading>
        <Text style={text}>
          <strong>{pseudo}</strong>
          {stageName ? ` (${stageName})` : ''} demande le statut{' '}
          <strong>{roleRequested}</strong> sur InDi RaDio.
        </Text>
        {note && note.trim() ? (
          <>
            <Hr style={hr} />
            <Text style={label}>Message du candidat :</Text>
            <Text style={quote}>{note}</Text>
            <Hr style={hr} />
          </>
        ) : null}
        <Button style={button} href={reviewUrl}>
          Examiner la candidature
        </Button>
        <Text style={muted}>
          Le compte reste simple auditeur tant que la candidature n'est pas approuvée.
        </Text>
      </Container>
    </Body>
  </Html>
)

const main = { backgroundColor: '#ffffff', fontFamily: 'Helvetica, Arial, sans-serif' }
const container = { margin: '0 auto', padding: '24px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold', color: '#111111' }
const text = { fontSize: '15px', lineHeight: '24px', color: '#222222' }
const muted = { fontSize: '12px', lineHeight: '20px', color: '#666666' }
const hr = { borderColor: '#eeeeee', margin: '16px 0' }
const label = { fontSize: '13px', fontWeight: 'bold', color: '#444444', margin: '0 0 4px' }
const quote = {
  fontSize: '15px',
  lineHeight: '24px',
  color: '#222222',
  whiteSpace: 'pre-wrap' as const,
  borderLeft: '3px solid #facc15',
  paddingLeft: '12px',
  margin: '0',
}
const button = {
  backgroundColor: '#facc15',
  color: '#000000',
  fontWeight: 'bold',
  padding: '12px 20px',
  borderRadius: '6px',
  textDecoration: 'none',
  display: 'inline-block',
}

export const template = {
  component: RoleRequestEmail,
  subject: (data: Record<string, any>) =>
    `Nouvelle candidature ${data?.roleRequested ?? 'artiste'} — ${data?.pseudo ?? 'membre'}`,
  displayName: 'Candidature artiste / média',
  previewData: {
    pseudo: 'NouvelArtiste',
    roleRequested: 'artiste',
    stageName: 'The Indie Tapes',
    note: "Groupe de rock indé lyonnais, premier EP sorti en mars. On aimerait rejoindre la galerie d'artistes.",
    reviewUrl: 'https://www.radio.indi-art-culture.com/admin/candidatures',
  },
}

export default RoleRequestEmail
