import { createElement } from 'react'
import { resend } from './client'
import { WelcomeEmail } from '@/emails/welcome'
import { OrgInviteEmail } from '@/emails/org-invite'
import { PaymentFailedEmail } from '@/emails/payment-failed'
import { PaymentSuccessEmail } from '@/emails/payment-success'
import { SubscriptionCancelledEmail } from '@/emails/subscription-cancelled'

const FROM = process.env.RESEND_FROM_EMAIL!

export async function sendWelcomeEmail(to: string, props: { name: string }) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Welcome!',
    react: createElement(WelcomeEmail, props),
  })
}

export async function sendOrgInviteEmail(
  to: string,
  props: { orgName: string; inviterName: string; inviteUrl: string }
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: `You've been invited to ${props.orgName}`,
    react: createElement(OrgInviteEmail, props),
  })
}

export async function sendPaymentFailedEmail(
  to: string,
  props: { orgName: string; amount: string }
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Payment failed — action required',
    react: createElement(PaymentFailedEmail, props),
  })
}

export async function sendPaymentSuccessEmail(
  to: string,
  props: { orgName: string; amount: string; period: string }
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Payment confirmed',
    react: createElement(PaymentSuccessEmail, props),
  })
}

export async function sendSubscriptionCancelledEmail(
  to: string,
  props: { orgName: string; plan: string }
) {
  return resend.emails.send({
    from: FROM,
    to,
    subject: 'Your subscription has been cancelled',
    react: createElement(SubscriptionCancelledEmail, props),
  })
}
