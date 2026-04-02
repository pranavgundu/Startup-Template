import {
  Body, Button, Container, Head, Heading, Hr, Html, Text,
} from '@react-email/components'

interface SubscriptionCancelledEmailProps {
  orgName: string
  plan: string
}

export function SubscriptionCancelledEmail({ orgName, plan }: SubscriptionCancelledEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f6f9fc' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#1a1a1a' }}>Subscription Cancelled</Heading>
          <Text style={{ color: '#4a5568', lineHeight: '1.6' }}>
            The <strong>{plan}</strong> subscription for <strong>{orgName}</strong> has been cancelled.
            You&apos;ll retain access until the end of your current billing period.
          </Text>
          <Button
            href={`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`}
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
            Reactivate Subscription
          </Button>
          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
          <Text style={{ color: '#a0aec0', fontSize: '12px' }}>
            We&apos;re sorry to see you go. Reply to this email if you have feedback.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
