export type BillingInterval = 'month' | 'year'

export interface Plan {
  id: string
  name: string
  description: string
  monthlyPriceId: string
  annualPriceId: string
  features: string[]
  limits: {
    seats: number
    storageGb: number
  }
}

// Single source of truth for all plan config.
// Create these products/prices in the Stripe dashboard and paste the price IDs here.
export const PLANS: Plan[] = [
  {
    id: 'starter',
    name: 'Starter',
    description: 'For small teams getting started',
    monthlyPriceId: process.env.STRIPE_STARTER_MONTHLY_PRICE_ID ?? '',
    annualPriceId: process.env.STRIPE_STARTER_ANNUAL_PRICE_ID ?? '',
    features: ['Up to 5 seats', '10 GB storage', 'Email support'],
    limits: { seats: 5, storageGb: 10 },
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing teams',
    monthlyPriceId: process.env.STRIPE_PRO_MONTHLY_PRICE_ID ?? '',
    annualPriceId: process.env.STRIPE_PRO_ANNUAL_PRICE_ID ?? '',
    features: ['Up to 20 seats', '100 GB storage', 'Priority support'],
    limits: { seats: 20, storageGb: 100 },
  },
]

export function getPlanById(id: string): Plan | undefined {
  return PLANS.find((p) => p.id === id)
}

export function getPlanByPriceId(priceId: string): Plan | undefined {
  return PLANS.find(
    (p) => p.monthlyPriceId === priceId || p.annualPriceId === priceId
  )
}
