import {
  Body, Container, Head, Heading, Hr, Html, Text,
} from '@react-email/components'

interface WelcomeEmailProps {
  name: string
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f6f9fc' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#1a1a1a' }}>Welcome, {name}!</Heading>
          <Text style={{ color: '#4a5568', lineHeight: '1.6' }}>
            Your account is ready. Log in to get started.
          </Text>
          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
          <Text style={{ color: '#a0aec0', fontSize: '12px' }}>
            You received this email because you signed up.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
