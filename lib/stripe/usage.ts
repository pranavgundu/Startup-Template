import { stripe } from './client'

// Reports usage to Stripe for metered (usage-based) billing via Billing Meter Events.
// In Stripe v21, the legacy subscriptionItems.createUsageRecord() was removed.
// Use stripe.billing.meterEvents.create() with a meter event_name configured in the dashboard.
// The customerId is the Stripe customer ID and quantity is the usage value.
export async function reportUsage(
  eventName: string,
  customerId: string,
  quantity: number
) {
  return stripe.billing.meterEvents.create({
    event_name: eventName,
    payload: {
      stripe_customer_id: customerId,
      value: String(quantity),
    },
  })
}
