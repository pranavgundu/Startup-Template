import { stripe } from './client'

interface CreateCheckoutSessionParams {
  customerId: string
  priceId: string
  mode: 'subscription' | 'payment'
  successUrl: string
  cancelUrl: string
  orgId: string  // Supabase org UUID — stored in session metadata for webhook lookup
}

export async function createCheckoutSession({
  customerId,
  priceId,
  mode,
  successUrl,
  cancelUrl,
  orgId,
}: CreateCheckoutSessionParams) {
  return stripe.checkout.sessions.create({
    customer: customerId,
    line_items: [{ price: priceId, quantity: 1 }],
    mode,
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { orgId },
    subscription_data:
      mode === 'subscription' ? { metadata: { orgId } } : undefined,
  })
}
