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
