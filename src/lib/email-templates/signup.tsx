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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="en" dir="ltr">
    <Head />
    <Preview>Bienvenue sur Indi Radio — confirme ton adresse email</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Bienvenue sur Indi Radio 🎙️</Heading>
        <Text style={text}>
          Salut, et bienvenue dans la communauté d'{' '}
          <Link href={siteUrl} style={link}>
            <strong>Indi Radio</strong>
          </Link>{' '}
          — la radio d'InDi ArT CulTuRe, dédiée aux arts et à la scène indépendante.
        </Text>
        <Text style={text}>
          Pour finaliser ton inscription et activer ton compte ({' '}
          <Link href={`mailto:${recipient}`} style={link}>
            {recipient}
          </Link>
          ), clique sur le bouton ci-dessous :
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmer mon adresse email
        </Button>
        <Text style={text}>
          Une fois ton compte validé, tu pourras :
        </Text>
        <Text style={list}>
          • Écouter le live et participer au mur social<br />
          • Liker, commenter et voter dans les charts<br />
          • Envoyer des dédicaces à l'antenne<br />
          • Gagner des points de présence et monter en niveau
        </Text>
        <Text style={text}>
          <strong>Règles d'usage :</strong> reste bienveillant·e, respecte les autres auditeurs et les artistes. Les comportements toxiques peuvent entraîner une mise en quarantaine, puis la suppression du compte.
        </Text>
        <Text style={footer}>
          Si tu n'es pas à l'origine de cette inscription, tu peux simplement ignorer cet email — aucun compte ne sera créé sans ta confirmation.
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '20px 25px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#000000',
  margin: '0 0 20px',
}
const text = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.5',
  margin: '0 0 25px',
}
const link = { color: 'inherit', textDecoration: 'underline' }
const button = {
  backgroundColor: '#000000',
  color: '#ffffff',
  fontSize: '14px',
  borderRadius: '8px',
  padding: '12px 20px',
  textDecoration: 'none',
}
const footer = { fontSize: '12px', color: '#999999', margin: '30px 0 0' }
const list = {
  fontSize: '14px',
  color: '#55575d',
  lineHeight: '1.8',
  margin: '0 0 25px',
  paddingLeft: '4px',
}
