import { auth } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { createBillingPortalSession } from '@/lib/stripe/portal'
import { createCheckoutSession } from '@/lib/stripe/checkout'
import { PLANS } from '@/lib/stripe/plans'
import { BillingCard } from '@/components/app/billing-card'

export default async function BillingPage() {
  const { orgId } = await auth()
  const supabase = await createServerSupabaseClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('id, name, stripe_customer_id')
    .eq('clerk_org_id', orgId ?? '')
    .single()

  const { data: subscription } = org
    ? await supabase
        .from('subscriptions')
        .select('*')
        .eq('org_id', org.id)
        .in('status', ['active', 'trialing', 'past_due'])
        .single()
    : { data: null }

  const stripeCustomerId = org?.stripe_customer_id
  const orgDbId = org?.id

  async function openBillingPortal() {
    'use server'
    if (!stripeCustomerId) return
    const session = await createBillingPortalSession(
      stripeCustomerId,
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`
    )
    redirect(session.url)
  }

  async function startCheckout(priceId: string) {
    'use server'
    if (!stripeCustomerId || !orgDbId) return
    const session = await createCheckoutSession({
      customerId: stripeCustomerId,
      priceId,
      mode: 'subscription',
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=1`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
      orgId: orgDbId,
    })
    if (session.url) redirect(session.url)
  }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Billing</h1>
        <p className="text-muted-foreground">Manage your subscription and payment methods.</p>
      </div>
      <BillingCard
        subscription={subscription}
        plans={PLANS}
        onManageBilling={openBillingPortal}
        onSelectPlan={startCheckout}
      />
    </div>
  )
}
