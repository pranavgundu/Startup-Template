import {
  Body, Button, Container, Head, Heading, Hr, Html, Text,
} from '@react-email/components'

interface PaymentFailedEmailProps {
  orgName: string
  amount: string
}

export function PaymentFailedEmail({ orgName, amount }: PaymentFailedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f6f9fc' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#e53e3e' }}>Payment Failed</Heading>
          <Text style={{ color: '#4a5568', lineHeight: '1.6' }}>
            We were unable to charge <strong>{amount}</strong> for <strong>{orgName}</strong>.
            Please update your payment method to avoid service interruption.
          </Text>
          <Button
            href={`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`}
            style={{
              backgroundColor: '#e53e3e',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
              marginTop: '16px',
            }}
          >
            Update Payment Method
          </Button>
          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
          <Text style={{ color: '#a0aec0', fontSize: '12px' }}>
            If you have questions, reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
