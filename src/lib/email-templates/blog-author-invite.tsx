import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Html,
  Link,
  Preview,
  Text,
} from '@react-email/components'

interface BlogAuthorInviteProps {
  inviteUrl: string
  invitedBy?: string
  expiresAt?: string
}

export const BlogAuthorInviteEmail = ({
  inviteUrl,
  invitedBy,
  expiresAt,
}: BlogAuthorInviteProps) => (
  <Html lang="fr" dir="ltr">
    <Head />
    <Preview>Invitation à rédiger sur le Blog InDi ArT CulTuRe</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Invitation — Blog InDi ArT CulTuRe</Heading>
        <Text style={text}>
          {invitedBy ? `${invitedBy} vous invite` : 'Vous êtes invité·e'} à devenir auteur·rice du
          Blog InDi ArT CulTuRe sur InDi RaDio. En acceptant, vous pourrez publier et modifier vos
          articles sur le blog.
        </Text>
        <Button style={button} href={inviteUrl}>
          Accepter l'invitation
        </Button>
        <Text style={text}>
          Ou copiez ce lien dans votre navigateur :{' '}
          <Link href={inviteUrl} style={link}>
            {inviteUrl}
          </Link>
        </Text>
        {expiresAt && (
          <Text style={muted}>Cette invitation expire le {expiresAt}.</Text>
        )}
        <Text style={muted}>
          Si vous n'attendiez pas cette invitation, ignorez simplement ce message.
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
const link = { color: '#b58900', wordBreak: 'break-all' as const }
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
  component: BlogAuthorInviteEmail,
  subject: 'Invitation à rédiger sur le Blog InDi ArT CulTuRe',
  displayName: 'Invitation auteur blog',
  previewData: {
    inviteUrl: 'https://www.radio.indi-art-culture.com/blog-invitation?token=demo',
    invitedBy: 'InDi RaDio',
    expiresAt: '30/09/2026',
  },
}

export default BlogAuthorInviteEmail
