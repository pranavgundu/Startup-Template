import { PostHog } from 'posthog-node'

let _client: PostHog | null = null

function getPostHogServer(): PostHog {
  if (!_client) {
    _client = new PostHog(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
      host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
      flushAt: 1,
      flushInterval: 0,
    })
  }
  return _client
}

export async function captureServerEvent(
  userId: string,
  event: string,
  properties?: Record<string, unknown>
) {
  const client = getPostHogServer()
  client.capture({ distinctId: userId, event, properties })
  await client.flush()
}
