import {
  Body, Container, Head, Heading, Hr, Html, Text,
} from '@react-email/components'

interface PaymentSuccessEmailProps {
  orgName: string
  amount: string
  period: string
}

export function PaymentSuccessEmail({ orgName, amount, period }: PaymentSuccessEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f6f9fc' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#38a169' }}>Payment Successful</Heading>
          <Text style={{ color: '#4a5568', lineHeight: '1.6' }}>
            We&apos;ve successfully charged <strong>{amount}</strong> for <strong>{orgName}</strong>.
            Your subscription is active through <strong>{period}</strong>.
          </Text>
          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
          <Text style={{ color: '#a0aec0', fontSize: '12px' }}>
            This is your payment confirmation. Keep it for your records.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
