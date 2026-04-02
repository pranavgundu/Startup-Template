# Startup SaaS Template Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a production-ready Next.js SaaS starter template with Clerk auth, Supabase DB, Stripe billing, Resend email, Upstash Redis, Pinecone vectors, PostHog analytics, and Sentry error tracking — all fully wired and ready to clone.

**Architecture:** Single Next.js 14 App Router monorepo. All external services isolated in `lib/<service>/` modules with typed wrappers. App shell is minimal: auth flows (Clerk), dashboard skeleton, settings (profile/org/billing). Multi-tenant via Clerk Organizations — `organizationId` is the universal tenant key across all services.

**Tech Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui · Clerk v5 · Supabase (Postgres, no Supabase Auth) · Stripe v16 · Resend + React Email · Upstash Redis + QStash · Pinecone · PostHog · Sentry v8

---

## File Map

**Created in this plan:**
```
package.json                              # All dependencies
next.config.ts                            # Sentry + Next.js config
middleware.ts                             # Clerk route protection
instrumentation.ts                        # Sentry server/edge init
sentry.client.config.ts                   # Sentry browser config
sentry.server.config.ts                   # Sentry Node config
sentry.edge.config.ts                     # Sentry edge config
.env.example                              # All env vars documented
vercel.json                               # Vercel deploy config
README.md                                 # Setup checklist

supabase/migrations/0001_initial.sql      # All DB tables + indexes

lib/supabase/types.ts                     # Hand-written DB types
lib/supabase/client.ts                    # Browser Supabase client
lib/supabase/server.ts                    # Server Supabase client
lib/supabase/admin.ts                     # Service-role admin client

lib/stripe/client.ts                      # Stripe singleton
lib/stripe/plans.ts                       # Plan config (single source of truth)
lib/stripe/checkout.ts                    # Checkout session helper
lib/stripe/portal.ts                      # Billing portal helper
lib/stripe/usage.ts                       # Usage record reporting

lib/resend/client.ts                      # Resend singleton
lib/resend/send.ts                        # Typed send functions (one per template)

lib/upstash/redis.ts                      # Redis singleton
lib/upstash/ratelimit.ts                  # Auth + anon rate limiters
lib/upstash/cache.ts                      # Typed get/set/del helpers
lib/upstash/queue.ts                      # QStash job enqueue helper

lib/pinecone/client.ts                    # Pinecone singleton + index getter
lib/pinecone/vectors.ts                   # upsert / query / delete helpers

lib/posthog/client.tsx                    # PostHogProvider + auth sync (client)
lib/posthog/server.ts                     # Server-side PostHog + captureServerEvent
lib/posthog/flags.ts                      # isFeatureEnabled helper

lib/sentry/index.ts                       # captureException + setUserContext helpers

emails/welcome.tsx                        # Welcome email template
emails/org-invite.tsx                     # Org invite email template
emails/payment-failed.tsx                 # Payment failed email template
emails/payment-success.tsx                # Payment success email template
emails/subscription-cancelled.tsx         # Subscription cancelled email template

app/layout.tsx                            # Root layout: ClerkProvider + PostHogProvider
app/(auth)/sign-in/[[...sign-in]]/page.tsx
app/(auth)/sign-up/[[...sign-up]]/page.tsx
app/(marketing)/page.tsx                  # Minimal landing page
app/(marketing)/pricing/page.tsx          # Pricing stub using PLANS config
app/(app)/layout.tsx                      # Protected layout with sidebar
app/(app)/dashboard/page.tsx              # Dashboard: org info + subscription status
app/(app)/settings/profile/page.tsx       # Clerk UserProfile component
app/(app)/settings/organization/page.tsx  # Clerk OrganizationProfile component
app/(app)/settings/billing/page.tsx       # Billing: current plan + checkout + portal

app/api/webhooks/clerk/route.ts           # Clerk webhook → Supabase sync + emails
app/api/webhooks/stripe/route.ts          # Stripe webhook → Supabase sync + emails

components/app/sidebar.tsx                # Sidebar nav with active state
components/app/org-switcher.tsx           # Clerk OrganizationSwitcher wrapper
components/app/user-nav.tsx               # Clerk UserButton wrapper
components/app/billing-card.tsx           # Billing page card component
```

---

## Task 1: Initialize Next.js Project

**Files:**
- Create: `package.json` (modified by create-next-app then npm install)
- Create: `next.config.ts`
- Create: `tailwind.config.ts`
- Create: `tsconfig.json`

- [ ] **Step 1: Scaffold Next.js app**

Run from the repo root (answer prompts as shown):
```bash
npx create-next-app@latest . \
  --typescript \
  --tailwind \
  --eslint \
  --app \
  --no-src-dir \
  --import-alias "@/*" \
  --yes
```

- [ ] **Step 2: Install all service dependencies**

```bash
npm install \
  @clerk/nextjs \
  @supabase/supabase-js \
  @supabase/ssr \
  stripe \
  resend \
  @react-email/components \
  react-email \
  @upstash/redis \
  @upstash/ratelimit \
  @upstash/qstash \
  @pinecone-database/pinecone \
  posthog-js \
  posthog-node \
  @sentry/nextjs \
  svix \
  lucide-react \
  class-variance-authority \
  clsx \
  tailwind-merge \
  @radix-ui/react-slot
```

- [ ] **Step 3: Initialize shadcn/ui**

```bash
npx shadcn@latest init --yes --defaults
```

When prompted for style: Default. When prompted for base color: Slate. When prompted for CSS variables: yes.

- [ ] **Step 4: Add shadcn components**

```bash
npx shadcn@latest add button card badge separator avatar dropdown-menu sheet --yes
```

- [ ] **Step 5: Verify project starts**

```bash
npm run dev
```

Expected: Server starts on http://localhost:3000 with no errors.

- [ ] **Step 6: Commit**

```bash
git add -A
git commit -m "feat: initialize Next.js 14 project with all dependencies"
```

---

## Task 2: Supabase Database Migration

**Files:**
- Create: `supabase/migrations/0001_initial.sql`

- [ ] **Step 1: Create migrations directory**

```bash
mkdir -p supabase/migrations
```

- [ ] **Step 2: Write initial migration**

Create `supabase/migrations/0001_initial.sql`:

```sql
-- Organizations: one per Clerk org, holds Stripe customer reference
CREATE TABLE organizations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_org_id TEXT UNIQUE NOT NULL,
  stripe_customer_id TEXT,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Users: synced from Clerk, scoped to their current active org
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clerk_user_id TEXT UNIQUE NOT NULL,
  org_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'org:member',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscriptions: one active subscription per org
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  stripe_subscription_id TEXT UNIQUE NOT NULL,
  plan TEXT NOT NULL,
  status TEXT NOT NULL,
  current_period_end TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Subscription items: line items for usage-based billing
CREATE TABLE subscription_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id UUID NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  stripe_item_id TEXT UNIQUE NOT NULL,
  price_id TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Usage records: raw usage events reported to Stripe metered billing
CREATE TABLE usage_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id UUID NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  subscription_item_id UUID NOT NULL REFERENCES subscription_items(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL,
  timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for common query patterns
CREATE INDEX idx_users_clerk_user_id ON users(clerk_user_id);
CREATE INDEX idx_users_org_id ON users(org_id);
CREATE INDEX idx_organizations_clerk_org_id ON organizations(clerk_org_id);
CREATE INDEX idx_organizations_stripe_customer_id ON organizations(stripe_customer_id);
CREATE INDEX idx_subscriptions_org_id ON subscriptions(org_id);
CREATE INDEX idx_subscriptions_stripe_sub_id ON subscriptions(stripe_subscription_id);
CREATE INDEX idx_usage_records_org_id ON usage_records(org_id);
```

- [ ] **Step 3: Install Supabase CLI and apply migration**

```bash
npx supabase login
npx supabase link --project-ref <YOUR_PROJECT_REF>
npx supabase db push
```

Expected: Migration applied successfully. Tables visible in Supabase dashboard.

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0001_initial.sql
git commit -m "feat: add initial database schema"
```

---

## Task 3: Supabase Client Helpers

**Files:**
- Create: `lib/supabase/types.ts`
- Create: `lib/supabase/client.ts`
- Create: `lib/supabase/server.ts`
- Create: `lib/supabase/admin.ts`

- [ ] **Step 1: Write database types**

Create `lib/supabase/types.ts`:

```typescript
export type OrgRole = 'org:admin' | 'org:member'

export interface Organization {
  id: string
  clerk_org_id: string
  stripe_customer_id: string | null
  name: string
  created_at: string
}

export interface User {
  id: string
  clerk_user_id: string
  org_id: string | null
  email: string
  role: OrgRole
  created_at: string
}

export interface Subscription {
  id: string
  org_id: string
  stripe_subscription_id: string
  plan: string
  status: string
  current_period_end: string
  created_at: string
}

export interface SubscriptionItem {
  id: string
  subscription_id: string
  stripe_item_id: string
  price_id: string
  created_at: string
}

export interface UsageRecord {
  id: string
  org_id: string
  subscription_item_id: string
  quantity: number
  timestamp: string
}

export type Database = {
  public: {
    Tables: {
      organizations: {
        Row: Organization
        Insert: Omit<Organization, 'id' | 'created_at'>
        Update: Partial<Omit<Organization, 'id' | 'created_at'>>
      }
      users: {
        Row: User
        Insert: Omit<User, 'id' | 'created_at'>
        Update: Partial<Omit<User, 'id' | 'created_at'>>
      }
      subscriptions: {
        Row: Subscription
        Insert: Omit<Subscription, 'id' | 'created_at'>
        Update: Partial<Omit<Subscription, 'id' | 'created_at'>>
      }
      subscription_items: {
        Row: SubscriptionItem
        Insert: Omit<SubscriptionItem, 'id' | 'created_at'>
        Update: Partial<Omit<SubscriptionItem, 'id' | 'created_at'>>
      }
      usage_records: {
        Row: UsageRecord
        Insert: Omit<UsageRecord, 'id'>
        Update: Partial<Omit<UsageRecord, 'id'>>
      }
    }
  }
}
```

- [ ] **Step 2: Write browser client**

Create `lib/supabase/client.ts`:

```typescript
import { createBrowserClient } from '@supabase/ssr'
import type { Database } from './types'

export function createClient() {
  return createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
```

- [ ] **Step 3: Write server client**

Create `lib/supabase/server.ts`:

```typescript
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from './types'

export async function createServerSupabaseClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Called from a Server Component — cookies are read-only, ignore
          }
        },
      },
    }
  )
}
```

- [ ] **Step 4: Write admin client**

Create `lib/supabase/admin.ts`:

```typescript
import { createClient } from '@supabase/supabase-js'
import type { Database } from './types'

// Service-role client — bypasses RLS. Only use in webhook handlers.
export function createAdminClient() {
  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add lib/supabase/
git commit -m "feat: add Supabase client helpers (browser, server, admin)"
```

---

## Task 4: Clerk Auth Setup

**Files:**
- Create: `middleware.ts`
- Modify: `app/layout.tsx` (placeholder — will be fully written in Task 14)

- [ ] **Step 1: Write Clerk middleware**

Create `middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'

// Everything not in this list requires auth
const isPublicRoute = createRouteMatcher([
  '/',
  '/pricing',
  '/sign-in(.*)',
  '/sign-up(.*)',
  '/api/webhooks(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect()
  }
})

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
}
```

- [ ] **Step 2: Add Clerk env vars to .env.local**

```bash
# Create .env.local from the Clerk dashboard (clerk.com → your app → API Keys)
# NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
# CLERK_SECRET_KEY=sk_test_...
# NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
# NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
# NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
# NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard
```

- [ ] **Step 3: Verify middleware compiles**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add middleware.ts
git commit -m "feat: add Clerk middleware for route protection"
```

---

## Task 5: Stripe Library

**Files:**
- Create: `lib/stripe/client.ts`
- Create: `lib/stripe/plans.ts`
- Create: `lib/stripe/checkout.ts`
- Create: `lib/stripe/portal.ts`
- Create: `lib/stripe/usage.ts`

- [ ] **Step 1: Write Stripe client singleton**

Create `lib/stripe/client.ts`:

```typescript
import Stripe from 'stripe'

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: '2024-04-10',
  typescript: true,
})
```

- [ ] **Step 2: Write plan configuration**

Create `lib/stripe/plans.ts`:

```typescript
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
```

- [ ] **Step 3: Write checkout session helper**

Create `lib/stripe/checkout.ts`:

```typescript
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
```

- [ ] **Step 4: Write billing portal helper**

Create `lib/stripe/portal.ts`:

```typescript
import { stripe } from './client'

export async function createBillingPortalSession(
  customerId: string,
  returnUrl: string
) {
  return stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: returnUrl,
  })
}
```

- [ ] **Step 5: Write usage reporting helper**

Create `lib/stripe/usage.ts`:

```typescript
import { stripe } from './client'

// Reports usage to Stripe for metered (usage-based) billing.
// Call this when your app performs a billable action.
export async function reportUsage(
  stripeSubscriptionItemId: string,
  quantity: number,
  action: 'increment' | 'set' = 'increment'
) {
  return stripe.subscriptionItems.createUsageRecord(stripeSubscriptionItemId, {
    quantity,
    timestamp: 'now',
    action,
  })
}
```

- [ ] **Step 6: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 7: Commit**

```bash
git add lib/stripe/
git commit -m "feat: add Stripe client, plans config, checkout, portal, and usage helpers"
```

---

## Task 6: Resend Library + Email Templates

**Files:**
- Create: `lib/resend/client.ts`
- Create: `lib/resend/send.ts`
- Create: `emails/welcome.tsx`
- Create: `emails/org-invite.tsx`
- Create: `emails/payment-failed.tsx`
- Create: `emails/payment-success.tsx`
- Create: `emails/subscription-cancelled.tsx`

- [ ] **Step 1: Write Resend client**

Create `lib/resend/client.ts`:

```typescript
import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)
```

- [ ] **Step 2: Write email templates**

Create `emails/welcome.tsx`:

```tsx
import {
  Body, Container, Head, Heading, Hr, Html, Text,
} from '@react-email/components'

interface WelcomeEmailProps {
  name: string
}

export function WelcomeEmail({ name }: WelcomeEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f6f9fc' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#1a1a1a' }}>Welcome, {name}!</Heading>
          <Text style={{ color: '#4a5568', lineHeight: '1.6' }}>
            Your account is ready. Log in to get started.
          </Text>
          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
          <Text style={{ color: '#a0aec0', fontSize: '12px' }}>
            You received this email because you signed up.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

Create `emails/org-invite.tsx`:

```tsx
import {
  Body, Button, Container, Head, Heading, Hr, Html, Text,
} from '@react-email/components'

interface OrgInviteEmailProps {
  orgName: string
  inviterName: string
  inviteUrl: string
}

export function OrgInviteEmail({ orgName, inviterName, inviteUrl }: OrgInviteEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f6f9fc' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#1a1a1a' }}>You&apos;ve been invited</Heading>
          <Text style={{ color: '#4a5568', lineHeight: '1.6' }}>
            {inviterName} has invited you to join <strong>{orgName}</strong>.
          </Text>
          <Button
            href={inviteUrl}
            style={{
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
              marginTop: '16px',
            }}
          >
            Accept Invitation
          </Button>
          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
          <Text style={{ color: '#a0aec0', fontSize: '12px' }}>
            If you didn&apos;t expect this, you can ignore this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

Create `emails/payment-failed.tsx`:

```tsx
import {
  Body, Button, Container, Head, Heading, Hr, Html, Text,
} from '@react-email/components'

interface PaymentFailedEmailProps {
  orgName: string
  amount: string
}

export function PaymentFailedEmail({ orgName, amount }: PaymentFailedEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f6f9fc' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#e53e3e' }}>Payment Failed</Heading>
          <Text style={{ color: '#4a5568', lineHeight: '1.6' }}>
            We were unable to charge <strong>{amount}</strong> for <strong>{orgName}</strong>.
            Please update your payment method to avoid service interruption.
          </Text>
          <Button
            href={`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`}
            style={{
              backgroundColor: '#e53e3e',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
              marginTop: '16px',
            }}
          >
            Update Payment Method
          </Button>
          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
          <Text style={{ color: '#a0aec0', fontSize: '12px' }}>
            If you have questions, reply to this email.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

Create `emails/payment-success.tsx`:

```tsx
import {
  Body, Container, Head, Heading, Hr, Html, Text,
} from '@react-email/components'

interface PaymentSuccessEmailProps {
  orgName: string
  amount: string
  period: string
}

export function PaymentSuccessEmail({ orgName, amount, period }: PaymentSuccessEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f6f9fc' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#38a169' }}>Payment Successful</Heading>
          <Text style={{ color: '#4a5568', lineHeight: '1.6' }}>
            We&apos;ve successfully charged <strong>{amount}</strong> for <strong>{orgName}</strong>.
            Your subscription is active through <strong>{period}</strong>.
          </Text>
          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
          <Text style={{ color: '#a0aec0', fontSize: '12px' }}>
            This is your payment confirmation. Keep it for your records.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

Create `emails/subscription-cancelled.tsx`:

```tsx
import {
  Body, Button, Container, Head, Heading, Hr, Html, Text,
} from '@react-email/components'

interface SubscriptionCancelledEmailProps {
  orgName: string
  plan: string
}

export function SubscriptionCancelledEmail({ orgName, plan }: SubscriptionCancelledEmailProps) {
  return (
    <Html>
      <Head />
      <Body style={{ fontFamily: 'sans-serif', backgroundColor: '#f6f9fc' }}>
        <Container style={{ maxWidth: '600px', margin: '0 auto', padding: '40px 20px' }}>
          <Heading style={{ color: '#1a1a1a' }}>Subscription Cancelled</Heading>
          <Text style={{ color: '#4a5568', lineHeight: '1.6' }}>
            The <strong>{plan}</strong> subscription for <strong>{orgName}</strong> has been cancelled.
            You&apos;ll retain access until the end of your current billing period.
          </Text>
          <Button
            href={`${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`}
            style={{
              backgroundColor: '#1a1a1a',
              color: '#ffffff',
              padding: '12px 24px',
              borderRadius: '6px',
              textDecoration: 'none',
              display: 'inline-block',
              marginTop: '16px',
            }}
          >
            Reactivate Subscription
          </Button>
          <Hr style={{ borderColor: '#e2e8f0', margin: '24px 0' }} />
          <Text style={{ color: '#a0aec0', fontSize: '12px' }}>
            We&apos;re sorry to see you go. Reply to this email if you have feedback.
          </Text>
        </Container>
      </Body>
    </Html>
  )
}
```

- [ ] **Step 3: Write typed send functions**

Create `lib/resend/send.ts`:

```typescript
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
```

- [ ] **Step 4: Preview emails locally**

```bash
npx email dev
```

Expected: Email preview server starts at http://localhost:3000 (or 3001 if Next.js is running). You can preview all 5 templates in the browser.

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add lib/resend/ emails/
git commit -m "feat: add Resend email client and all transactional email templates"
```

---

## Task 7: Upstash Library

**Files:**
- Create: `lib/upstash/redis.ts`
- Create: `lib/upstash/ratelimit.ts`
- Create: `lib/upstash/cache.ts`
- Create: `lib/upstash/queue.ts`

- [ ] **Step 1: Write Redis singleton**

Create `lib/upstash/redis.ts`:

```typescript
import { Redis } from '@upstash/redis'

export const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})
```

- [ ] **Step 2: Write rate limiters**

Create `lib/upstash/ratelimit.ts`:

```typescript
import { Ratelimit } from '@upstash/ratelimit'
import { redis } from './redis'

// 100 requests per minute per authenticated user
export const authRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(100, '1 m'),
  analytics: true,
  prefix: 'ratelimit:auth',
})

// 20 requests per minute per IP for unauthenticated routes
export const anonRatelimit = new Ratelimit({
  redis,
  limiter: Ratelimit.slidingWindow(20, '1 m'),
  analytics: true,
  prefix: 'ratelimit:anon',
})

// Usage example in a server action:
// const { success } = await authRatelimit.limit(userId)
// if (!success) throw new Error('Rate limit exceeded')
```

- [ ] **Step 3: Write cache helpers**

Create `lib/upstash/cache.ts`:

```typescript
import { redis } from './redis'

export async function cacheGet<T>(key: string): Promise<T | null> {
  return redis.get<T>(key)
}

// ttlSeconds defaults to 5 minutes
export async function cacheSet<T>(
  key: string,
  value: T,
  ttlSeconds = 300
): Promise<void> {
  await redis.set(key, value, { ex: ttlSeconds })
}

export async function cacheDel(key: string): Promise<void> {
  await redis.del(key)
}
```

- [ ] **Step 4: Write QStash job queue helper**

Create `lib/upstash/queue.ts`:

```typescript
import { Client } from '@upstash/qstash'

const qstash = new Client({
  token: process.env.UPSTASH_QSTASH_TOKEN!,
})

// Enqueue a background job. The URL must be a publicly reachable endpoint
// (your /api/jobs/* routes). Use ngrok or similar for local development.
export async function enqueueJob(
  url: string,
  body: unknown,
  delaySeconds = 0
) {
  return qstash.publishJSON({
    url,
    body,
    delay: delaySeconds,
  })
}
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add lib/upstash/
git commit -m "feat: add Upstash Redis rate limiting, caching, and QStash queue helpers"
```

---

## Task 8: Pinecone Library

**Files:**
- Create: `lib/pinecone/client.ts`
- Create: `lib/pinecone/vectors.ts`

- [ ] **Step 1: Write Pinecone client**

Create `lib/pinecone/client.ts`:

```typescript
import { Pinecone } from '@pinecone-database/pinecone'

export const pinecone = new Pinecone({
  apiKey: process.env.PINECONE_API_KEY!,
})

// Returns the configured index. Namespace by org ID for tenant isolation.
export function getPineconeIndex() {
  return pinecone.index(process.env.PINECONE_INDEX!)
}
```

- [ ] **Step 2: Write vector helpers**

Create `lib/pinecone/vectors.ts`:

```typescript
import type { RecordMetadata } from '@pinecone-database/pinecone'
import { getPineconeIndex } from './client'

interface VectorRecord {
  id: string
  values: number[]
  metadata?: RecordMetadata
}

// Upsert vectors into a namespace (use orgId as namespace for tenant isolation)
export async function upsertVectors(
  namespace: string,
  vectors: VectorRecord[]
) {
  const index = getPineconeIndex()
  return index.namespace(namespace).upsert(vectors)
}

// Similarity search — returns topK nearest vectors with metadata
export async function queryVectors(
  namespace: string,
  vector: number[],
  topK = 10
) {
  const index = getPineconeIndex()
  return index.namespace(namespace).query({
    vector,
    topK,
    includeMetadata: true,
  })
}

// Delete vectors by ID from a namespace
export async function deleteVectors(namespace: string, ids: string[]) {
  const index = getPineconeIndex()
  return index.namespace(namespace).deleteMany(ids)
}
```

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add lib/pinecone/
git commit -m "feat: add Pinecone vector client and upsert/query/delete helpers"
```

---

## Task 9: PostHog Library

**Files:**
- Create: `lib/posthog/client.tsx`
- Create: `lib/posthog/server.ts`
- Create: `lib/posthog/flags.ts`

- [ ] **Step 1: Write PostHog client provider**

Create `lib/posthog/client.tsx`:

```tsx
'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { useEffect } from 'react'
import { useUser, useOrganization } from '@clerk/nextjs'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
  })
}

// Syncs Clerk user/org identity to PostHog on mount
function PostHogAuthSync() {
  const { user } = useUser()
  const { organization } = useOrganization()
  const ph = usePostHog()

  useEffect(() => {
    if (user) {
      ph.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
      })
    }
  }, [user, ph])

  useEffect(() => {
    if (organization) {
      ph.group('organization', organization.id, {
        name: organization.name,
      })
    }
  }, [organization, ph])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <PostHogAuthSync />
      {children}
    </PHProvider>
  )
}
```

- [ ] **Step 2: Write server-side PostHog client**

Create `lib/posthog/server.ts`:

```typescript
import { PostHog } from 'posthog-node'

const posthogServer = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  flushAt: 1,
  flushInterval: 0,
})

export async function captureServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  posthogServer.capture({
    distinctId: userId,
    event,
    properties,
  })
  await posthogServer.flush()
}
```

- [ ] **Step 3: Write feature flag helper**

Create `lib/posthog/flags.ts`:

```typescript
import { PostHog } from 'posthog-node'

const client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
  host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
  flushAt: 1,
  flushInterval: 0,
})

export async function isFeatureEnabled(
  flag: string,
  userId: string
): Promise<boolean> {
  const enabled = await client.isFeatureEnabled(flag, userId)
  return enabled ?? false
}
```

- [ ] **Step 4: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 5: Commit**

```bash
git add lib/posthog/
git commit -m "feat: add PostHog provider, server client, and feature flag helper"
```

---

## Task 10: Sentry Configuration

**Files:**
- Create: `sentry.client.config.ts`
- Create: `sentry.server.config.ts`
- Create: `sentry.edge.config.ts`
- Create: `instrumentation.ts`
- Create: `lib/sentry/index.ts`
- Modify: `next.config.ts`

- [ ] **Step 1: Write Sentry configs**

Create `sentry.client.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,
  replaysOnErrorSampleRate: 1.0,
  replaysSessionSampleRate: 0.1,
})
```

Create `sentry.server.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,
})
```

Create `sentry.edge.config.ts`:

```typescript
import * as Sentry from '@sentry/nextjs'

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  debug: false,
})
```

- [ ] **Step 2: Write instrumentation.ts**

Create `instrumentation.ts`:

```typescript
export async function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    await import('./sentry.server.config')
  }
  if (process.env.NEXT_RUNTIME === 'edge') {
    await import('./sentry.edge.config')
  }
}
```

- [ ] **Step 3: Write Sentry helper**

Create `lib/sentry/index.ts`:

```typescript
import * as Sentry from '@sentry/nextjs'

export function captureException(
  error: unknown,
  context?: Record<string, unknown>
) {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context)
    }
    Sentry.captureException(error)
  })
}

export function setUserContext(userId: string, orgId: string) {
  Sentry.setUser({ id: userId })
  Sentry.setTag('org_id', orgId)
}
```

- [ ] **Step 4: Update next.config.ts**

Replace the contents of `next.config.ts`:

```typescript
import { withSentryConfig } from '@sentry/nextjs'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // Enables instrumentation.ts for Sentry server/edge init
  experimental: {
    instrumentationHook: true,
  },
}

export default withSentryConfig(nextConfig, {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Only print logs for uploading source maps in CI
  silent: !process.env.CI,
  // Upload a larger set of source maps for prettier stack traces
  widenClientFileUpload: true,
  // Route browser requests to Sentry through this Next.js route to avoid ad-blockers
  tunnelRoute: '/monitoring',
  // Hides source maps from generated client bundles
  hideSourceMaps: true,
  // Automatically tree-shake Sentry logger statements
  disableLogger: true,
})
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add sentry.client.config.ts sentry.server.config.ts sentry.edge.config.ts instrumentation.ts lib/sentry/ next.config.ts
git commit -m "feat: configure Sentry for client, server, and edge runtimes"
```

---

## Task 11: Clerk Webhook Handler

**Files:**
- Create: `app/api/webhooks/clerk/route.ts`

- [ ] **Step 1: Create webhook route**

Create `app/api/webhooks/clerk/route.ts`:

```typescript
import { headers } from 'next/headers'
import type { WebhookEvent } from '@clerk/nextjs/server'
import { Webhook } from 'svix'
import { createAdminClient } from '@/lib/supabase/admin'
import { stripe } from '@/lib/stripe/client'
import { sendWelcomeEmail, sendOrgInviteEmail } from '@/lib/resend/send'
import { captureServerEvent } from '@/lib/posthog/server'
import { captureException } from '@/lib/sentry'

export async function POST(req: Request) {
  const headerPayload = await headers()
  const svixId = headerPayload.get('svix-id')
  const svixTimestamp = headerPayload.get('svix-timestamp')
  const svixSignature = headerPayload.get('svix-signature')

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response('Missing svix headers', { status: 400 })
  }

  const body = await req.text()
  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!)

  let evt: WebhookEvent
  try {
    evt = wh.verify(body, {
      'svix-id': svixId,
      'svix-timestamp': svixTimestamp,
      'svix-signature': svixSignature,
    }) as WebhookEvent
  } catch (err) {
    captureException(err, { context: 'clerk-webhook-verify' })
    return new Response('Invalid signature', { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (evt.type) {
      case 'user.created': {
        const { id, email_addresses, first_name, last_name } = evt.data
        const email = email_addresses[0]?.email_address ?? ''
        const name = [first_name, last_name].filter(Boolean).join(' ')

        await supabase.from('users').insert({
          clerk_user_id: id,
          org_id: null,
          email,
          role: 'org:member',
        })

        await sendWelcomeEmail(email, { name: name || 'there' })
        await captureServerEvent(id, 'user_signed_up', { email })
        break
      }

      case 'organization.created': {
        const { id: clerkOrgId, name, created_by } = evt.data

        // Create Stripe customer for the org
        const customer = await stripe.customers.create({
          name,
          metadata: { clerk_org_id: clerkOrgId },
        })

        await supabase.from('organizations').insert({
          clerk_org_id: clerkOrgId,
          name,
          stripe_customer_id: customer.id,
        })

        await captureServerEvent(created_by, 'org_created', {
          org_id: clerkOrgId,
          org_name: name,
        })
        break
      }

      case 'organizationMembership.created': {
        const { organization, public_user_data, role } = evt.data

        const { data: org } = await supabase
          .from('organizations')
          .select('id')
          .eq('clerk_org_id', organization.id)
          .single()

        if (org) {
          await supabase.from('users').upsert(
            {
              clerk_user_id: public_user_data.user_id,
              org_id: org.id,
              email: public_user_data.identifier ?? '',
              role: role as 'org:admin' | 'org:member',
            },
            { onConflict: 'clerk_user_id' }
          )
        }
        break
      }

      case 'organizationMembership.deleted': {
        const { public_user_data } = evt.data
        await supabase
          .from('users')
          .update({ org_id: null })
          .eq('clerk_user_id', public_user_data.user_id)
        break
      }

      case 'organizationInvitation.created': {
        const { email_address, organization } = evt.data
        await sendOrgInviteEmail(email_address, {
          orgName: organization.name,
          inviterName: 'A team member',
          inviteUrl: `${process.env.NEXT_PUBLIC_APP_URL}/sign-up`,
        })
        break
      }
    }
  } catch (err) {
    captureException(err, { event: evt.type })
    return new Response('Webhook processing error', { status: 500 })
  }

  return new Response('OK', { status: 200 })
}
```

- [ ] **Step 2: Register webhook in Clerk dashboard**

In the Clerk dashboard → Webhooks → Add Endpoint:
- URL: `https://your-domain.com/api/webhooks/clerk` (or use ngrok for local: `ngrok http 3000`)
- Events to subscribe: `user.created`, `organization.created`, `organizationMembership.created`, `organizationMembership.deleted`, `organizationInvitation.created`
- Copy the signing secret to `CLERK_WEBHOOK_SECRET` in `.env.local`

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/clerk/
git commit -m "feat: add Clerk webhook handler (user/org sync → Supabase + emails)"
```

---

## Task 12: Stripe Webhook Handler

**Files:**
- Create: `app/api/webhooks/stripe/route.ts`

- [ ] **Step 1: Create webhook route**

Create `app/api/webhooks/stripe/route.ts`:

```typescript
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

// Helper: get admin user email for an org (for sending billing emails)
async function getOrgAdminEmail(supabase: ReturnType<typeof createAdminClient>, orgId: string) {
  const { data } = await supabase
    .from('users')
    .select('email')
    .eq('org_id', orgId)
    .eq('role', 'org:admin')
    .single()
  return data?.email ?? null
}

// Helper: get org name by Supabase UUID
async function getOrgName(supabase: ReturnType<typeof createAdminClient>, orgId: string) {
  const { data } = await supabase
    .from('organizations')
    .select('name')
    .eq('id', orgId)
    .single()
  return data?.name ?? 'Your organization'
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
          const sub = await stripe.subscriptions.retrieve(
            session.subscription as string
          )
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
                current_period_end: new Date(
                  sub.current_period_end * 1000
                ).toISOString(),
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
            current_period_end: new Date(
              sub.current_period_end * 1000
            ).toISOString(),
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
        if (!invoice.subscription) break

        const sub = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        )
        const orgId = sub.metadata?.orgId
        if (!orgId) break

        await supabase
          .from('subscriptions')
          .update({
            status: 'active',
            current_period_end: new Date(
              sub.current_period_end * 1000
            ).toISOString(),
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
            period: new Date(sub.current_period_end * 1000).toLocaleDateString(),
          })
        }
        break
      }

      case 'invoice.payment_failed': {
        const invoice = event.data.object as Stripe.Invoice
        if (!invoice.subscription) break

        const sub = await stripe.subscriptions.retrieve(
          invoice.subscription as string
        )
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
```

- [ ] **Step 2: Register Stripe webhook**

```bash
# Install Stripe CLI for local testing
brew install stripe/stripe-cli/stripe
stripe login
stripe listen --forward-to localhost:3000/api/webhooks/stripe
# Copy the webhook signing secret printed by the CLI to STRIPE_WEBHOOK_SECRET in .env.local
```

In the Stripe dashboard → Webhooks → Add Endpoint for production:
- URL: `https://your-domain.com/api/webhooks/stripe`
- Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`

- [ ] **Step 3: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 4: Commit**

```bash
git add app/api/webhooks/stripe/
git commit -m "feat: add Stripe webhook handler (subscription lifecycle + emails + analytics)"
```

---

## Task 13: Root Layout and Global Providers

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Write root layout**

Replace `app/layout.tsx`:

```tsx
import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { PostHogProvider } from '@/lib/posthog/client'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SaaS Template',
  description: 'Production-ready SaaS starter',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
```

- [ ] **Step 2: Verify dev server**

```bash
npm run dev
```

Expected: http://localhost:3000 loads without console errors.

- [ ] **Step 3: Commit**

```bash
git add app/layout.tsx
git commit -m "feat: add root layout with Clerk and PostHog providers"
```

---

## Task 14: App Shell Components

**Files:**
- Create: `components/app/org-switcher.tsx`
- Create: `components/app/user-nav.tsx`
- Create: `components/app/sidebar.tsx`
- Create: `app/(app)/layout.tsx`

- [ ] **Step 1: Write OrgSwitcher component**

Create `components/app/org-switcher.tsx`:

```tsx
'use client'

import { OrganizationSwitcher } from '@clerk/nextjs'

export function OrgSwitcher() {
  return (
    <OrganizationSwitcher
      hidePersonal
      afterSelectOrganizationUrl="/dashboard"
      afterCreateOrganizationUrl="/dashboard"
      appearance={{
        elements: {
          organizationSwitcherTrigger: 'w-full justify-start',
        },
      }}
    />
  )
}
```

- [ ] **Step 2: Write UserNav component**

Create `components/app/user-nav.tsx`:

```tsx
'use client'

import { UserButton } from '@clerk/nextjs'

export function UserNav() {
  return (
    <UserButton
      afterSignOutUrl="/"
      appearance={{
        elements: {
          avatarBox: 'h-8 w-8',
        },
      }}
    />
  )
}
```

- [ ] **Step 3: Write Sidebar component**

Create `components/app/sidebar.tsx`:

```tsx
'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OrgSwitcher } from './org-switcher'
import { UserNav } from './user-nav'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/settings/organization', label: 'Organization', icon: Users },
  { href: '/settings/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings/profile', label: 'Profile', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-background">
      <div className="p-4 border-b">
        <OrgSwitcher />
      </div>

      <nav className="flex-1 overflow-auto p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t flex items-center gap-3">
        <UserNav />
        <span className="text-sm text-muted-foreground">Account</span>
      </div>
    </aside>
  )
}
```

- [ ] **Step 4: Write protected app layout**

Create `app/(app)/layout.tsx`:

```tsx
import { Sidebar } from '@/components/app/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-muted/10">
        {children}
      </main>
    </div>
  )
}
```

- [ ] **Step 5: Verify layout renders**

```bash
npm run dev
```

Navigate to http://localhost:3000/dashboard (you'll be redirected to sign-in since you're not authenticated — that's correct).

- [ ] **Step 6: Commit**

```bash
git add components/app/ app/\(app\)/layout.tsx
git commit -m "feat: add app shell with sidebar, org switcher, and user nav"
```

---

## Task 15: Dashboard Page

**Files:**
- Create: `app/(app)/dashboard/page.tsx`

- [ ] **Step 1: Write dashboard page**

Create `app/(app)/dashboard/page.tsx`:

```tsx
import { auth } from '@clerk/nextjs/server'
import { createServerSupabaseClient } from '@/lib/supabase/server'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

export default async function DashboardPage() {
  const { orgId } = await auth()
  const supabase = await createServerSupabaseClient()

  const { data: org } = await supabase
    .from('organizations')
    .select('name, stripe_customer_id')
    .eq('clerk_org_id', orgId ?? '')
    .single()

  const { data: subscription } = orgId
    ? await supabase
        .from('subscriptions')
        .select('plan, status, current_period_end')
        .eq('org_id', (await supabase.from('organizations').select('id').eq('clerk_org_id', orgId).single()).data?.id ?? '')
        .eq('status', 'active')
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
              variant={
                subscription?.status === 'active' ? 'default' : 'secondary'
              }
            >
              {subscription?.status ?? 'No subscription'}
            </Badge>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 3: Commit**

```bash
git add app/\(app\)/dashboard/
git commit -m "feat: add dashboard page with org and subscription status"
```

---

## Task 16: Settings Pages and BillingCard Component

**Files:**
- Create: `app/(app)/settings/profile/page.tsx`
- Create: `app/(app)/settings/organization/page.tsx`
- Create: `app/(app)/settings/billing/page.tsx`
- Create: `components/app/billing-card.tsx`

- [ ] **Step 1: Write profile settings page**

Create `app/(app)/settings/profile/page.tsx`:

```tsx
import { UserProfile } from '@clerk/nextjs'

export default function ProfilePage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your personal account settings.</p>
      </div>
      <UserProfile />
    </div>
  )
}
```

- [ ] **Step 2: Write organization settings page**

Create `app/(app)/settings/organization/page.tsx`:

```tsx
import { OrganizationProfile } from '@clerk/nextjs'

export default function OrganizationPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Organization</h1>
        <p className="text-muted-foreground">Manage your organization and team members.</p>
      </div>
      <OrganizationProfile />
    </div>
  )
}
```

- [ ] **Step 3: Write BillingCard component**

Create `components/app/billing-card.tsx`:

```tsx
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
      <p className="text-muted-foreground">
        Choose a plan to get started.
      </p>
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
```

- [ ] **Step 4: Write billing settings page**

Create `app/(app)/settings/billing/page.tsx`:

```tsx
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

  async function openBillingPortal() {
    'use server'
    if (!org?.stripe_customer_id) return
    const session = await createBillingPortalSession(
      org.stripe_customer_id,
      `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`
    )
    redirect(session.url)
  }

  async function startCheckout(priceId: string) {
    'use server'
    if (!org?.stripe_customer_id || !org?.id) return
    const session = await createCheckoutSession({
      customerId: org.stripe_customer_id,
      priceId,
      mode: 'subscription',
      successUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing?success=1`,
      cancelUrl: `${process.env.NEXT_PUBLIC_APP_URL}/settings/billing`,
      orgId: org.id,
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
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add app/\(app\)/settings/ components/app/billing-card.tsx
git commit -m "feat: add settings pages (profile, organization, billing) and BillingCard component"
```

---

## Task 17: Auth Pages and Marketing Pages

**Files:**
- Create: `app/(auth)/sign-in/[[...sign-in]]/page.tsx`
- Create: `app/(auth)/sign-up/[[...sign-up]]/page.tsx`
- Create: `app/(marketing)/page.tsx`
- Create: `app/(marketing)/pricing/page.tsx`

- [ ] **Step 1: Write sign-in page**

Create `app/(auth)/sign-in/[[...sign-in]]/page.tsx`:

```tsx
import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/10">
      <SignIn />
    </div>
  )
}
```

- [ ] **Step 2: Write sign-up page**

Create `app/(auth)/sign-up/[[...sign-up]]/page.tsx`:

```tsx
import { SignUp } from '@clerk/nextjs'

export default function SignUpPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/10">
      <SignUp />
    </div>
  )
}
```

- [ ] **Step 3: Write landing page**

Create `app/(marketing)/page.tsx`:

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'

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
        <Button asChild size="lg">
          <Link href="/sign-up">Get Started</Link>
        </Button>
        <Button asChild size="lg" variant="outline">
          <Link href="/pricing">See Pricing</Link>
        </Button>
      </div>

      <div className="mt-16 flex flex-wrap justify-center gap-6 text-sm text-muted-foreground">
        {[
          'Clerk Auth',
          'Supabase',
          'Stripe',
          'Resend',
          'PostHog',
          'Sentry',
          'Upstash',
          'Pinecone',
          'Vercel',
        ].map((name) => (
          <span key={name} className="rounded-full border px-3 py-1">
            {name}
          </span>
        ))}
      </div>
    </main>
  )
}
```

- [ ] **Step 4: Write pricing page**

Create `app/(marketing)/pricing/page.tsx`:

```tsx
import Link from 'next/link'
import { Button } from '@/components/ui/button'
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
          <Card key={plan.id} className="relative">
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
              <Button asChild className="w-full">
                <Link href="/sign-up">Get Started</Link>
              </Button>
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
```

- [ ] **Step 5: Type-check**

```bash
npx tsc --noEmit
```

Expected: No errors.

- [ ] **Step 6: Commit**

```bash
git add app/\(auth\)/ app/\(marketing\)/
git commit -m "feat: add auth pages (sign-in/up) and marketing pages (landing, pricing)"
```

---

## Task 18: Environment Config, Vercel Deploy, and README

**Files:**
- Create: `.env.example`
- Create: `vercel.json`
- Modify: `README.md`

- [ ] **Step 1: Write .env.example**

Create `.env.example`:

```bash
# App
NEXT_PUBLIC_APP_URL=http://localhost:3000

# ─── Clerk ────────────────────────────────────────────────────────────────────
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_
CLERK_SECRET_KEY=sk_test_
CLERK_WEBHOOK_SECRET=whsec_

# Clerk redirect URLs (can leave as-is for most setups)
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/dashboard
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/dashboard

# ─── Supabase ─────────────────────────────────────────────────────────────────
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...

# ─── Stripe ───────────────────────────────────────────────────────────────────
STRIPE_SECRET_KEY=sk_test_
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_
STRIPE_WEBHOOK_SECRET=whsec_

# Plan price IDs — create these in the Stripe dashboard
STRIPE_STARTER_MONTHLY_PRICE_ID=price_
STRIPE_STARTER_ANNUAL_PRICE_ID=price_
STRIPE_PRO_MONTHLY_PRICE_ID=price_
STRIPE_PRO_ANNUAL_PRICE_ID=price_

# ─── Resend ───────────────────────────────────────────────────────────────────
RESEND_API_KEY=re_
RESEND_FROM_EMAIL=noreply@yourdomain.com

# ─── Upstash ──────────────────────────────────────────────────────────────────
UPSTASH_REDIS_REST_URL=https://<id>.upstash.io
UPSTASH_REDIS_REST_TOKEN=A...
UPSTASH_QSTASH_TOKEN=eyJ...

# ─── Pinecone ─────────────────────────────────────────────────────────────────
PINECONE_API_KEY=
PINECONE_INDEX=my-index
PINECONE_DIMENSION=1536

# ─── PostHog ──────────────────────────────────────────────────────────────────
NEXT_PUBLIC_POSTHOG_KEY=phc_
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com

# ─── Sentry ───────────────────────────────────────────────────────────────────
SENTRY_DSN=https://<id>@o<org>.ingest.sentry.io/<project>
SENTRY_ORG=your-sentry-org
SENTRY_PROJECT=your-sentry-project
# Only needed for CI/CD source map uploads:
# SENTRY_AUTH_TOKEN=
```

- [ ] **Step 2: Write vercel.json**

Create `vercel.json`:

```json
{
  "framework": "nextjs",
  "buildCommand": "npm run build",
  "devCommand": "npm run dev",
  "installCommand": "npm install",
  "regions": ["iad1"]
}
```

- [ ] **Step 3: Write README**

Replace `README.md`:

```markdown
# Startup SaaS Template

Production-ready Next.js SaaS starter. Clone and ship.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/YOUR_USERNAME/YOUR_REPO)

## Stack

| Service | Purpose |
|---|---|
| [Next.js 14](https://nextjs.org) | Full-stack React framework (App Router) |
| [Clerk](https://clerk.com) | Auth + Organizations (multi-tenancy) |
| [Supabase](https://supabase.com) | Postgres database |
| [Stripe](https://stripe.com) | Subscriptions, one-time payments, usage billing |
| [Resend](https://resend.com) | Transactional email |
| [Upstash](https://upstash.com) | Redis (rate limiting, caching) + QStash (job queue) |
| [Pinecone](https://pinecone.io) | Vector database (AI/semantic search) |
| [PostHog](https://posthog.com) | Product analytics + feature flags |
| [Sentry](https://sentry.io) | Error tracking |
| [Vercel](https://vercel.com) | Deployment |

## Setup

### 1. Clone and install

```bash
git clone <your-repo-url>
cd <repo>
cp .env.example .env.local
npm install
```

### 2. Clerk

1. Create an app at [clerk.com](https://clerk.com)
2. Enable Organizations in Clerk dashboard → Organizations
3. Enable Google + GitHub OAuth if desired
4. Copy `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` and `CLERK_SECRET_KEY` to `.env.local`
5. Add a webhook endpoint: `https://your-domain.com/api/webhooks/clerk`
   - Subscribe to: `user.created`, `organization.created`, `organizationMembership.created`, `organizationMembership.deleted`, `organizationInvitation.created`
   - Copy signing secret to `CLERK_WEBHOOK_SECRET`
6. For local development, use [ngrok](https://ngrok.com): `ngrok http 3000`

### 3. Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Copy URL and keys to `.env.local`
3. Apply migrations:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

### 4. Stripe

1. Create products and prices in the [Stripe dashboard](https://dashboard.stripe.com)
   - Create a "Starter" product with monthly + annual prices
   - Create a "Pro" product with monthly + annual prices
2. Copy price IDs to the `STRIPE_*_PRICE_ID` vars in `.env.local`
3. Copy API keys to `.env.local`
4. Add webhook endpoint: `https://your-domain.com/api/webhooks/stripe`
   - Subscribe to: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
   - Copy signing secret to `STRIPE_WEBHOOK_SECRET`
5. For local development:
   ```bash
   brew install stripe/stripe-cli/stripe
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

### 5. Resend

1. Create an account at [resend.com](https://resend.com)
2. Verify your sending domain
3. Copy API key to `RESEND_API_KEY`
4. Set `RESEND_FROM_EMAIL` to your verified sender address
5. Preview email templates locally: `npx email dev`

### 6. Upstash

1. Create a Redis database at [upstash.com](https://upstash.com)
2. Copy `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`
3. Create a QStash instance
4. Copy `UPSTASH_QSTASH_TOKEN`

### 7. Pinecone

1. Create an account at [pinecone.io](https://pinecone.io)
2. Create an index — set the dimension to match your embedding model (e.g., 1536 for OpenAI `text-embedding-3-small`)
3. Copy API key and index name to `.env.local`

### 8. PostHog

1. Create a project at [posthog.com](https://posthog.com)
2. Copy project key to `NEXT_PUBLIC_POSTHOG_KEY`
3. Set `NEXT_PUBLIC_POSTHOG_HOST` (default: `https://us.i.posthog.com`)

### 9. Sentry

1. Create a project at [sentry.io](https://sentry.io)
2. Copy DSN to `SENTRY_DSN`
3. Set `SENTRY_ORG` and `SENTRY_PROJECT`
4. Install the [Sentry Vercel integration](https://vercel.com/integrations/sentry) for automatic source map uploads

### 10. Deploy to Vercel

1. Push to GitHub
2. Connect repo at [vercel.com](https://vercel.com)
3. Add all env vars from `.env.example` in the Vercel dashboard
4. Set `NEXT_PUBLIC_APP_URL` to your production URL
5. Deploy

## Local Development

```bash
npm run dev
```

Open http://localhost:3000.

## Project Structure

```
app/
├── (auth)/           # Sign-in, sign-up (Clerk)
├── (marketing)/      # Landing page, pricing
├── (app)/            # Protected app: dashboard, settings
└── api/webhooks/     # Clerk + Stripe webhook handlers

lib/
├── supabase/         # DB clients (browser, server, admin)
├── stripe/           # Checkout, portal, usage, plans config
├── resend/           # Email send functions
├── upstash/          # Redis, rate limiting, cache, queue
├── pinecone/         # Vector upsert/query helpers
├── posthog/          # Analytics provider + server client
└── sentry/           # Error capture helpers

emails/               # React Email templates (5 templates)
supabase/migrations/  # SQL migrations
```
```

- [ ] **Step 4: Add .env.local to .gitignore (verify)**

```bash
grep -q ".env.local" .gitignore && echo "Already ignored" || echo ".env.local" >> .gitignore
grep -q ".env.local" .gitignore && echo "Confirmed: .env.local is gitignored"
```

Expected: Output shows `.env.local` is gitignored.

- [ ] **Step 5: Final type-check and build**

```bash
npx tsc --noEmit && echo "Types OK"
```

Expected: `Types OK`

```bash
npm run build
```

Expected: Build completes successfully. Note: some pages may warn about missing env vars — that's expected when `.env.local` isn't fully populated.

- [ ] **Step 6: Final commit**

```bash
git add .env.example vercel.json README.md .gitignore
git commit -m "feat: add env config, Vercel deploy config, and setup README"
```

---

## Self-Review

**Spec coverage check:**

| Spec requirement | Implemented in task |
|---|---|
| Next.js App Router | Task 1 |
| Supabase (DB + clients) | Tasks 2, 3 |
| Clerk auth + organizations | Tasks 4, 11 |
| Stripe (all 3 billing modes) | Tasks 5, 12 |
| Resend + React Email (5 templates) | Task 6 |
| Upstash Redis + rate limiting + QStash | Task 7 |
| Pinecone (upsert + query + delete) | Task 8 |
| PostHog (client + server + flags) | Task 9 |
| Sentry (client + server + edge) | Task 10 |
| App shell: sidebar, org switcher, user nav | Task 14 |
| Dashboard page | Task 15 |
| Settings: profile, org, billing | Task 16 |
| Auth pages | Task 17 |
| Minimal landing + pricing page | Task 17 |
| .env.example + vercel.json + README | Task 18 |
| Org ID as Pinecone namespace | Task 8 |
| Stripe customer per org | Task 11 |
| Webhook signature verification (Clerk + Stripe) | Tasks 11, 12 |
| Pre-wired PostHog events | Task 12 (subscription events) |

All spec requirements covered. ✓
