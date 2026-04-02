import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage() {
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
        .select('plan, status, current_period_end')
        .eq('org_id', org.id)
        .in('status', ['active', 'trialing'])
        .single()
    : { data: null }

  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Welcome back{org?.name ? ` to ${org.name}` : ''}.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Organization
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold">{org?.name ?? '—'}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Plan
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-xl font-semibold capitalize">
              {subscription?.plan ?? 'Free'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Status
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Badge
              variant={subscription?.status === 'active' ? 'default' : 'secondary'}
            >
              {subscription?.status ?? 'No subscription'}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
