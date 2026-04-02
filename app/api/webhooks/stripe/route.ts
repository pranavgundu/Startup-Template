import { headers } from 'next/headers'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe/client'
import { getPlanByPriceId } from '@/lib/stripe/plans'
import { createAdminClient } from '@/lib/supabase/admin'
import {
  sendPaymentFailedEmail,
  sendPaymentSuccessEmail,
  sendSubscriptionCancelledEmail,
} from '@/lib/resend/send'
import { captureServerEvent } from '@/lib/posthog/server'
import { captureException } from '@/lib/sentry'

type SupabaseClient = ReturnType<typeof createAdminClient>

async function getOrgAdminEmail(supabase: SupabaseClient, orgId: string) {
  const { data } = await supabase
    .from('users')
    .select('email')
    .eq('org_id', orgId)
    .eq('role', 'org:admin')
    .single()
  return data?.email ?? null
}

async function getOrgName(supabase: SupabaseClient, orgId: string) {
  const { data } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()
  return data?.name ?? 'Your organization'
}

// In Stripe v21, Subscription has no current_period_end.
// We use billing_cycle_anchor as a proxy for the next renewal date.
function getSubscriptionPeriodEnd(sub: Stripe.Subscription): string {
  return new Date(sub.billing_cycle_anchor * 1000).toISOString()
}

// In Stripe v21, Invoice has no top-level .subscription field.
// The subscription ID is nested under parent.subscription_details.subscription
function getInvoiceSubscriptionId(
  invoice: Stripe.Invoice
): string | null {
  const subRef = invoice.parent?.subscription_details?.subscription
  if (!subRef) return null
  return typeof subRef === 'string' ? subRef : subRef.id
}

export async function POST(req: Request) {
  const body = await req.text()
  const headerPayload = await headers()
  const signature = headerPayload.get('stripe-signature')

  if (!signature) {
    return new Response('Missing stripe-signature header', { status: 400 })
  }

  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    )
  } catch (err) {
    captureException(err, { context: 'stripe-webhook-verify' })
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const orgId = session.metadata?.orgId
        if (!orgId) break

        if (session.mode === 'subscription' && session.subscription) {
          const subId =
            typeof session.subscription === 'string'
              ? session.subscription
              : session.subscription.id
          const sub = await stripe.subscriptions.retrieve(subId)
          const priceId = sub.items.data[0]?.price.id ?? ''
          const plan = getPlanByPriceId(priceId)

          const { data: subscription } = await supabase
            .from('subscriptions')
            .upsert(
              {
                org_id: orgId,
                stripe_subscription_id: sub.id,
                plan: plan?.id ?? 'unknown',
                status: sub.status,
                current_period_end: getSubscriptionPeriodEnd(sub),
              },
              { onConflict: 'stripe_subscription_id' }
            )
            .select('id')
            .single()

          if (subscription) {
            for (const item of sub.items.data) {
              await supabase.from('subscription_items').upsert(
                {
                  subscription_id: subscription.id,
                  stripe_item_id: item.id,
                  price_id: item.price.id,
                },
                { onConflict: 'stripe_item_id' }
              )
            }
          }

          await captureServerEvent(orgId, 'subscription_started', {
            plan: plan?.id,
            org_id: orgId,
          })
        }
        break
      }

      case 'customer.subscription.updated': {
        const sub = event.data.object as Stripe.Subscription
        const orgId = sub.metadata?.orgId
        if (!orgId) break

        const priceId = sub.items.data[0]?.price.id ?? ''
        const plan = getPlanByPriceId(priceId)

        await supabase
          .from('subscriptions')
          .update({
            plan: plan?.id ?? 'unknown',
            status: sub.status,
            current_period_end: getSubscriptionPeriodEnd(sub),
          })
          .eq('stripe_subscription_id', sub.id)
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const orgId = sub.metadata?.orgId
        if (!orgId) break

        const priceId = sub.items.data[0]?.price.id ?? ''
        const plan = getPlanByPriceId(priceId)

        await supabase
          .from('subscriptions')
          .update({ status: 'canceled' })
          .eq('stripe_subscription_id', sub.id)

        const [adminEmail, orgName] = await Promise.all([
          getOrgAdminEmail(supabase, orgId),
          getOrgName(supabase, orgId),
        ])

        if (adminEmail) {
          await sendSubscriptionCancelledEmail(adminEmail, {
            orgName,
            plan: plan?.name ?? 'Pro',
          })
        }

        await captureServerEvent(orgId, 'subscription_cancelled', {
          plan: plan?.id,
          org_id: orgId,
        })
        break
      }

      case 'invoice.paid': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = getInvoiceSubscriptionId(invoice)
        if (!subId) break

        const sub = await stripe.subscriptions.retrieve(subId)
        const orgId = sub.metadata?.orgId
        if (!orgId) break

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_end: getSubscriptionPeriodEnd(sub),
          })
          .eq('stripe_subscription_id', sub.id)

        const [adminEmail, orgName] = await Promise.all([
          getOrgAdminEmail(supabase, orgId),
          getOrgName(supabase, orgId),
        ])

        if (adminEmail) {
          await sendPaymentSuccessEmail(adminEmail, {
            orgName,
            amount: `$${((invoice.amount_paid ?? 0) / 100).toFixed(2)}`,
            period: new Date(sub.billing_cycle_anchor * 1000).toLocaleDateString(),
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        const subId = getInvoiceSubscriptionId(invoice)
        if (!subId) break

        const sub = await stripe.subscriptions.retrieve(subId)
        const orgId = sub.metadata?.orgId
        if (!orgId) break

        const [adminEmail, orgName] = await Promise.all([
          getOrgAdminEmail(supabase, orgId),
          getOrgName(supabase, orgId),
        ])

        if (adminEmail) {
          await sendPaymentFailedEmail(adminEmail, {
            orgName,
            amount: `$${((invoice.amount_due ?? 0) / 100).toFixed(2)}`,
          })
        }

        await captureServerEvent(orgId, 'payment_failed', { org_id: orgId })
        break
      }
    }
  } catch (err) {
    captureException(err, { event: event.type })
    return new Response('Webhook processing error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
