import { PostHog } from 'posthog-node'

let _client: PostHog | null = null

function getClient(): PostHog {
  if (!_client) {
    _client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return _client
}

export async function isFeatureEnabled(
  flag: string,
  userId: string
): Promise<boolean> {
  const enabled = await getClient().isFeatureEnabled(flag, userId)
  return enabled ?? false
}
