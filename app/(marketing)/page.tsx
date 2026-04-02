import Link from 'next/link'
import { buttonVariants } from '@/components/ui/button-variants'
import { cn } from '@/lib/utils'

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8 text-center">
      <h1 className="text-5xl font-bold tracking-tight mb-4 max-w-2xl">
        Your SaaS, Ready to Ship
      </h1>
      <p className="text-xl text-muted-foreground mb-8 max-w-lg leading-relaxed">
        A production-ready starter with auth, billing, emails, analytics, error
        tracking, Redis, and vector search — all wired up.
      </p>
      <div className="flex gap-4">
        <Link href="/sign-up" className={cn(buttonVariants({ size: 'lg' }))}>
          Get Started
        </Link>
        <Link href="/pricing" className={cn(buttonVariants({ variant: 'outline', size: 'lg' }))}>
          See Pricing
        </Link>
      </div>

      <div className="mt-16 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
        {[
          'Clerk Auth', 'Supabase', 'Stripe', 'Resend',
          'PostHog', 'Sentry', 'Upstash', 'Pinecone', 'Vercel',
        ].map((name) => (
          <span key={name} className="rounded-full border px-3 py-1">
            {name}
          </span>
        ))}
      </div>
    </main>
  )
}
