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
