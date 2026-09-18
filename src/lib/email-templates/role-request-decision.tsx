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

interface RoleRequestDecisionProps {
  pseudo: string
  roleRequested: string
  decision: 'approved' | 'rejected'
  adminMessage?: string
  profileUrl: string
}

export const RoleRequestDecisionEmail = ({
  pseudo,
  roleRequested,
  decision,
  adminMessage,
  profileUrl,
}: RoleRequestDecisionProps) => {
  const approved = decision === 'approved'
  return (
    <Html lang="fr" dir="ltr">
      <Head />
      <Preview>
        {approved
          ? `Ta candidature ${roleRequested} a été acceptée`
          : `Ta candidature ${roleRequested} n'a pas été retenue`}
      </Preview>
      <Body style={main}>
        <Container style={container}>
          <Heading style={h1}>
            {approved ? 'Candidature acceptée 🎉' : 'Candidature non retenue'}
          </Heading>
          <Text style={text}>
            Bonjour <strong>{pseudo}</strong>,{' '}
            {approved
              ? `ta demande de statut ${roleRequested} a été validée par l'équipe : ton profil est désormais certifié et ta page publique est visible.`
              : `ta demande de statut ${roleRequested} n'a pas été retenue pour le moment. Tu peux en soumettre une nouvelle plus tard.`}
          </Text>
          {adminMessage && adminMessage.trim() ? (
            <>
              <Hr style={hr} />
              <Text style={label}>Message de l'équipe :</Text>
              <Text style={quote}>{adminMessage}</Text>
              <Hr style={hr} />
            </>
          ) : null}
          <Button style={button} href={profileUrl}>
            {approved ? 'Voir ma page' : 'Voir mon profil'}
          </Button>
          <Text style={muted}>
            Tu restes membre de la communauté InDi RaDio dans tous les cas.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}

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
  component: RoleRequestDecisionEmail,
  subject: (data: Record<string, any>) =>
    data?.decision === 'approved'
      ? `Ta candidature ${data?.roleRequested ?? 'artiste'} est acceptée`
      : `Ta candidature ${data?.roleRequested ?? 'artiste'} n'a pas été retenue`,
  displayName: 'Décision de candidature',
  previewData: {
    pseudo: 'NouvelArtiste',
    roleRequested: 'artiste',
    decision: 'approved',
    adminMessage: 'Bienvenue ! Pense à compléter ta bio et tes dates de concert.',
    profileUrl: 'https://www.radio.indi-art-culture.com/profile',
  },
}

export default RoleRequestDecisionEmail
