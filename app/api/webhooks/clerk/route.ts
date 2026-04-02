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
        // evt.data is OrganizationJSON — created_by is optional string
        const { id: clerkOrgId, name, created_by } = evt.data

        const customer = await stripe.customers.create({
          name,
          metadata: { clerk_org_id: clerkOrgId },
        })

        await supabase.from('organizations').insert({
          clerk_org_id: clerkOrgId,
          name,
          stripe_customer_id: customer.id,
        })

        await captureServerEvent(created_by ?? clerkOrgId, 'org_created', {
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
        // evt.data is OrganizationInvitationJSON — uses public_organization_data, not organization
        const { email_address, public_organization_data } = evt.data
        const orgName = public_organization_data?.name ?? 'Your organization'
        await sendOrgInviteEmail(email_address, {
          orgName,
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
