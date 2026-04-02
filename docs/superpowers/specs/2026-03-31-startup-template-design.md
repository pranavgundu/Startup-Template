# Startup SaaS Template — Design Spec

**Date:** 2026-03-31
**Stack:** Next.js 14 (App Router) · TypeScript · Tailwind CSS · shadcn/ui

---

## Overview

A minimal but fully-wired SaaS starter template. The goal is a clean, opinionated foundation that any SaaS product can clone and immediately start building on — without spending weeks integrating services. All external platforms are pre-integrated and production-ready. The app shell is intentionally thin: auth flows, a dashboard skeleton, settings, and billing. No marketing bloat.

---

## Project Structure

```
/
├── app/
│   ├── (auth)/                    # Clerk-handled: sign-in, sign-up, org selection
│   ├── (marketing)/               # Public: minimal landing page, pricing stub
│   ├── (app)/                     # Protected app shell
│   │   ├── dashboard/
│   │   ├── settings/
│   │   │   ├── profile/
│   │   │   ├── organization/
│   │   │   └── billing/
│   │   └── layout.tsx             # Sidebar, nav, org switcher
│   └── api/
│       ├── webhooks/
│       │   ├── stripe/            # Stripe webhook handler
│       │   └── clerk/             # Clerk webhook → sync user/org to Supabase
│       └── [...]/                 # Future API routes
├── lib/
│   ├── supabase/                  # Client, server, admin clients + typed helpers
│   ├── stripe/                    # Client, subscription helpers, billing portal, plans config
│   ├── resend/                    # Email client + typed template wrappers
│   ├── upstash/                   # Redis client, rate limiter, cache, QStash queue
│   ├── pinecone/                  # Vector client, upsert/query helpers
│   ├── posthog/                   # Client-side + server-side analytics, feature flags
│   └── sentry/                    # Config, error capture helpers
├── components/
│   ├── ui/                        # shadcn/ui components
│   └── app/                       # App-specific: sidebar, org-switcher, billing card
├── emails/                        # React Email templates
├── middleware.ts                   # Clerk auth + route protection
└── supabase/
    └── migrations/                # SQL migration files
```

---

## Section 1: Auth & Multi-Tenancy (Clerk)

- Clerk handles all auth: sign-up, sign-in, MFA, OAuth (Google + GitHub enabled by default)
- **Organizations** are the multi-tenancy primitive — every user belongs to at least one org
- `organizationId` from Clerk is the universal tenant identifier used across all services (Supabase, Stripe, Pinecone)
- A Clerk webhook at `/api/webhooks/clerk` syncs events to Supabase:
  - `user.created` → insert into `users`, send welcome email
  - `organization.created` → insert into `organizations`, create Stripe customer
  - `organizationMembership.created/deleted` → update membership records
  - `organizationInvitation.created` → send org-invite email via Resend
- `middleware.ts` protects all `/app/*` routes — unauthenticated users redirected to sign-in
- **Roles**: Clerk built-in `org:admin` and `org:member`. Role checked server-side via `auth().orgRole` before sensitive actions (billing changes, member management)
- `OrgSwitcher` component in sidebar for switching between orgs

---

## Section 2: Database (Supabase)

- Supabase Postgres is the primary database for all app data
- **Supabase auth is disabled** — Clerk owns authentication
- Row-level security uses `organization_id` as the tenant boundary, enforced at the query layer in server actions (not RLS policies, since there's no Supabase auth token to use)
- Service role key used server-side only. Anon key used for client-side reads where applicable

### Schema

| Table | Key Columns | Purpose |
|---|---|---|
| `organizations` | `id`, `clerk_org_id`, `stripe_customer_id`, `name` | Synced from Clerk, holds Stripe customer reference |
| `users` | `id`, `clerk_user_id`, `org_id`, `email`, `role` | Synced from Clerk user + membership events |
| `subscriptions` | `id`, `org_id`, `stripe_subscription_id`, `plan`, `status`, `current_period_end` | Active subscription state |
| `subscription_items` | `id`, `subscription_id`, `stripe_item_id`, `price_id` | Line items for usage-based billing |
| `usage_records` | `id`, `org_id`, `subscription_item_id`, `quantity`, `timestamp` | Raw usage events for metered billing |

### Clients

- `createClient()` — browser-side (anon key), used only for public/non-sensitive reads (e.g., public config). All authenticated data goes through server actions.
- `createServerClient()` — server components and server actions
- `createAdminClient()` — webhooks requiring service role (no RLS bypass elsewhere)

### Migrations

Tracked in `supabase/migrations/`. Applied with `supabase db push` or `supabase migration up`.

---

## Section 3: Payments (Stripe)

All three billing models are supported:

### Subscriptions
- Stripe Products + Prices (monthly/annual)
- Plan config defined in `lib/stripe/plans.ts` as single source of truth (name, price IDs, features, limits)

### One-time Payments
- Stripe Checkout sessions with `mode: 'payment'`
- Used for lifetime deals, add-ons

### Usage-based Billing
- Metered Stripe Prices
- Usage reported via `stripe.subscriptionItems.createUsageRecord()` from `usage_records` table

### Stripe Customer
- Created per organization (not per user) at `organization.created` Clerk event
- Stored in `organizations.stripe_customer_id`

### Billing Portal
- Stripe-hosted portal for self-serve changes (plan upgrades, cancellations, payment methods)
- Server action returns a portal session URL, client redirects to it

### Checkout
- Stripe-hosted Checkout sessions
- Success/cancel URLs redirect back into app settings/billing

### Webhook Handler (`/api/webhooks/stripe`)
Processes and syncs to Supabase:

| Event | Action |
|---|---|
| `checkout.session.completed` | Activate subscription or fulfill one-time purchase |
| `customer.subscription.updated` | Sync plan + status to `subscriptions` |
| `customer.subscription.deleted` | Mark subscription inactive, send cancellation email |
| `invoice.paid` | Update `current_period_end` in `subscriptions` |
| `invoice.payment_failed` | Send payment-failed dunning email via Resend |

Webhook signature verified with `stripe-signature` header on every request.

---

## Section 4: Email (Resend + React Email)

- All outbound email via Resend SDK
- Templates built with React Email in `emails/` directory
- Local preview: `npx email dev`
- All sends go through `lib/resend/send.ts` typed wrapper — no raw `resend.emails.send()` scattered in the codebase

### Templates

| Template | Trigger |
|---|---|
| `welcome.tsx` | `user.created` Clerk webhook |
| `org-invite.tsx` | `organizationInvitation.created` Clerk webhook |
| `payment-failed.tsx` | `invoice.payment_failed` Stripe webhook |
| `payment-success.tsx` | `invoice.paid` Stripe webhook |
| `subscription-cancelled.tsx` | `customer.subscription.deleted` Stripe webhook |

---

## Section 5: Caching, Rate Limiting & Queuing (Upstash)

### Rate Limiting (`lib/upstash/ratelimit.ts`)
- `@upstash/ratelimit` with sliding window algorithm
- Default limits: 100 req/min per authenticated user, 20 req/min per IP for unauthenticated routes
- Applied in middleware or at the top of server actions

### Caching (`lib/upstash/cache.ts`)
- Thin typed wrapper around `redis.get/set` with configurable TTL defaults
- Used for expensive Supabase queries or external API responses

### Job Queuing (`lib/upstash/queue.ts`)
- `@upstash/qstash` for deferring background work
- Used for: async email sends, processing usage records, webhooks that need retry logic

---

## Section 6: Vector Database (Pinecone)

- `lib/pinecone/client.ts` — singleton Pinecone client initialized from env vars
- `lib/pinecone/vectors.ts` — typed helpers:
  - `upsert(namespace, vectors)` — insert/update vectors
  - `query(namespace, vector, topK)` — similarity search
- **Namespace = organization ID** — tenant isolation at the vector level, prevents cross-org data leakage
- Index name and dimension configured via `PINECONE_INDEX` and `PINECONE_DIMENSION` env vars
- No specific AI feature pre-built — wiring only. Drop in your embedding model and call the helpers.

---

## Section 7: Analytics (PostHog)

### Client-side
- `PostHogProvider` wraps the app in root layout
- Auto-captures pageviews, clicks, form submissions

### Server-side
- `lib/posthog/server.ts` — PostHog Node client for server actions and webhooks

### Identification
- `posthog.identify()` called on sign-in with Clerk user ID
- `posthog.group()` called with org ID — all events tagged with org context

### Pre-wired Events
- `user_signed_up`
- `org_created`
- `subscription_started`
- `subscription_cancelled`
- `payment_failed`

### Feature Flags
- `lib/posthog/flags.ts` — typed `isFeatureEnabled(flag, userId)` helper for gradual rollouts

---

## Section 8: Error Tracking (Sentry)

- Configured via `instrumentation.ts` (Next.js native Sentry integration via `@sentry/nextjs`)
- Captures both client-side and server-side errors automatically
- Source maps uploaded on Vercel build — no manual config needed
- `sentry.captureException()` called explicitly in webhook handlers and critical server actions
- **User/org context**: Sentry scope set with Clerk user ID and org ID per request via middleware

---

## Section 9: Deployment (Vercel)

- `vercel.json` for project config
- Deploy Button in README for one-click deployment
- Three environments: `development`, `preview` (per PR branch), `production`
- Vercel Edge Config used for feature flag fallbacks and kill switches
- Official Vercel integrations used for: Sentry (source maps), PostHog, Clerk, Upstash

---

## Environment Variables

Single `.env.example` as the canonical reference, organized by service:

```bash
# Clerk
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
CLERK_WEBHOOK_SECRET=

# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Stripe
STRIPE_SECRET_KEY=
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=
STRIPE_WEBHOOK_SECRET=

# Resend
RESEND_API_KEY=
RESEND_FROM_EMAIL=

# Upstash
UPSTASH_REDIS_REST_URL=
UPSTASH_REDIS_REST_TOKEN=
UPSTASH_QSTASH_TOKEN=

# Pinecone
PINECONE_API_KEY=
PINECONE_INDEX=
PINECONE_DIMENSION=

# PostHog
NEXT_PUBLIC_POSTHOG_KEY=
NEXT_PUBLIC_POSTHOG_HOST=

# Sentry
SENTRY_DSN=
SENTRY_ORG=
SENTRY_PROJECT=
```

---

## Setup Checklist (README)

Step-by-step per service:
1. Clone repo, copy `.env.example` to `.env.local`
2. Clerk — create app, enable Organizations, configure OAuth providers, register webhook URL
3. Supabase — create project, run migrations (`supabase db push`), copy keys
4. Stripe — create products/prices, register webhook URL, copy keys. Use Stripe CLI for local testing
5. Resend — verify domain, copy API key
6. Upstash — create Redis database + QStash instance, copy tokens
7. Pinecone — create index (set correct dimension for your embedding model), copy key
8. PostHog — create project, copy key
9. Sentry — create project, install Vercel integration for source maps
10. Deploy to Vercel — connect repo, inject env vars, deploy

---

## Key Decisions

| Decision | Rationale |
|---|---|
| Clerk owns auth, not Supabase Auth | Clerk has superior org/role management built-in; avoids duplicating auth logic |
| Organization as billing unit | SaaS standard — one Stripe customer per team, not per user |
| Org ID as Pinecone namespace | Simplest tenant isolation without a separate index per org |
| QStash for background jobs | Serverless-native, no persistent worker needed, pairs perfectly with Vercel |
| React Email for templates | Type-safe, version-controlled templates with local preview |
| Service role only in webhooks/admin | Minimizes blast radius of a leaked key |
