# Startup SaaS Template

Production-ready Next.js SaaS starter. Clone and ship.

## Stack

| Service | Purpose |
|---|---|
| [Next.js](https://nextjs.org) | Full-stack React framework (App Router) |
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
2. Enable Organizations: Dashboard → Organizations
3. Enable Google + GitHub OAuth
4. Copy keys to `.env.local`
5. Add webhook: `https://your-domain.com/api/webhooks/clerk`
   - Events: `user.created`, `organization.created`, `organizationMembership.created`, `organizationMembership.deleted`, `organizationInvitation.created`
   - Copy signing secret to `CLERK_WEBHOOK_SECRET`

### 3. Supabase

1. Create project at [supabase.com](https://supabase.com)
2. Copy URL and keys to `.env.local`
3. Apply migrations:
   ```bash
   npx supabase login
   npx supabase link --project-ref <your-project-ref>
   npx supabase db push
   ```

### 4. Stripe

1. Create products and prices at [dashboard.stripe.com](https://dashboard.stripe.com)
2. Copy price IDs to `.env.local`
3. Add webhook: `https://your-domain.com/api/webhooks/stripe`
   - Events: `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`, `invoice.paid`, `invoice.payment_failed`
4. For local testing:
   ```bash
   brew install stripe/stripe-cli/stripe
   stripe login
   stripe listen --forward-to localhost:3000/api/webhooks/stripe
   ```

### 5. Resend

1. Create account at [resend.com](https://resend.com)
2. Verify your sending domain
3. Copy API key, set `RESEND_FROM_EMAIL` to your verified address

### 6. Upstash

1. Create Redis database + QStash at [upstash.com](https://upstash.com)
2. Copy tokens to `.env.local`

### 7. Pinecone

1. Create index at [pinecone.io](https://pinecone.io)
2. Set dimension to match your embedding model (e.g., 1536 for OpenAI `text-embedding-3-small`)
3. Copy API key and index name

### 8. PostHog

1. Create project at [posthog.com](https://posthog.com)
2. Copy project key

### 9. Sentry

1. Create project at [sentry.io](https://sentry.io)
2. Install [Vercel integration](https://vercel.com/integrations/sentry) for source maps
3. Copy DSN, org, project

### 10. Deploy to Vercel

1. Push to GitHub
2. Connect repo at [vercel.com](https://vercel.com)
3. Add all env vars from `.env.example`
4. Set `NEXT_PUBLIC_APP_URL` to your production URL

## Local Development

```bash
npm run dev
```

## Project Structure

```
app/
├── (auth)/              # Sign-in, sign-up (Clerk)
├── (marketing)/         # Landing page, pricing
├── (app)/               # Protected: dashboard, settings
└── api/webhooks/        # Clerk + Stripe webhook handlers

lib/
├── supabase/            # DB clients (browser, server, admin)
├── stripe/              # Checkout, portal, usage, plans config
├── resend/              # Typed email send functions
├── upstash/             # Redis, rate limiting, cache, QStash queue
├── pinecone/            # Vector upsert/query helpers
├── posthog/             # Analytics provider + server client + flags
└── sentry/              # Error capture helpers

emails/                  # React Email templates (5 templates)
supabase/migrations/     # SQL migrations
```
