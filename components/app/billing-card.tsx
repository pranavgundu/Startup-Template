import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { Plan } from '@/lib/stripe/plans'
import type { Subscription } from '@/lib/supabase/types'

interface BillingCardProps {
  subscription: Subscription | null
  plans: Plan[]
  onManageBilling: () => Promise<void>
  onSelectPlan: (priceId: string) => Promise<void>
}

export function BillingCard({
  subscription,
  plans,
  onManageBilling,
  onSelectPlan,
}: BillingCardProps) {
  if (subscription) {
    return (
      <Card className="max-w-lg">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Current Plan</CardTitle>
            <Badge variant={subscription.status === 'active' ? 'default' : 'destructive'}>
              {subscription.status}
            </Badge>
          </div>
          <CardDescription>
            Renews on{' '}
            {new Date(subscription.current_period_end).toLocaleDateString('en-US', {
              month: 'long',
              day: 'numeric',
              year: 'numeric',
            })}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-2xl font-bold capitalize">{subscription.plan}</p>
        </CardContent>
        <Separator />
        <CardFooter className="pt-4">
          <form action={onManageBilling}>
            <Button type="submit" variant="outline">
              Manage Billing
            </Button>
          </form>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      <p className="text-muted-foreground">Choose a plan to get started.</p>
      <div className="grid gap-4 md:grid-cols-2 max-w-2xl">
        {plans.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle>{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-1.5 text-sm text-muted-foreground">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="text-green-500 font-bold">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <Separator />
            <CardFooter className="pt-4 gap-2">
              <form action={onSelectPlan.bind(null, plan.monthlyPriceId)}>
                <Button type="submit" size="sm">Monthly</Button>
              </form>
              <form action={onSelectPlan.bind(null, plan.annualPriceId)}>
                <Button type="submit" size="sm" variant="outline">Annual</Button>
              </form>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  )
}
