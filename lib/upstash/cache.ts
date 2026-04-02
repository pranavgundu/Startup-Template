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
