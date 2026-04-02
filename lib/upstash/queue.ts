import { Client } from '@upstash/qstash'

const qstash = new Client({
  token: process.env.UPSTASH_QSTASH_TOKEN!,
})

// Enqueue a background job. The URL must be a publicly reachable endpoint.
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
