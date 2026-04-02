import {
  Body, Button, Container, Head, Heading, Hr, Html, Text,
} from '@react-email/components'

interface OrgInviteEmailProps {
  orgName: string
  inviterName: string
  inviteUrl: string
}

export function OrgInviteEmail({ orgName, inviterName, inviteUrl }: OrgInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f6f9fc' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#1a1a1a' }}>You&apos;ve been invited</Heading>
          <Text style={{ color: '#4a5568', lineHeight: '1.6' }}>
            {inviterName} has invited you to join <strong>{orgName}</strong>.
          </Text>
          <Button
            href={inviteUrl}
            style={{
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
              marginTop: '16px',
            }}
          >
            Accept Invitation
          </Button>
          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
          <Text style={{ color: '#a0aec0', fontSize: '12px' }}>
            If you didn&apos;t expect this, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
