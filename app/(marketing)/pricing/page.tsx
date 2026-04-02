import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { PLANS } from '@/lib/stripe/plans'

export default function PricingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center py-24 px-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-tight mb-3">Pricing</h1>
        <p className="text-xl text-muted-foreground">
          Simple, transparent pricing. No surprises.
        </p>
      </div>

      <div className="grid gap-8 md:grid-cols-2 max-w-3xl w-full">
        {PLANS.map((plan) => (
          <Card key={plan.id}>
            <CardHeader>
              <CardTitle className="text-xl">{plan.name}</CardTitle>
              <CardDescription>{plan.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm">
                {plan.features.map((feature) => (
                  <li key={feature} className="flex items-center gap-2">
                    <span className="text-green-500 font-bold text-base">✓</span>
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <Separator />
            <CardFooter className="pt-4">
              <Link href="/sign-up" className={cn(buttonVariants(), 'w-full justify-center')}>
                Get Started
              </Link>
            </CardFooter>
          </Card>
        ))}
      </div>

      <p className="mt-12 text-sm text-muted-foreground">
        All plans include a 14-day free trial. No credit card required.
      </p>
    </main>
  )
}
