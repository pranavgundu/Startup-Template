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
