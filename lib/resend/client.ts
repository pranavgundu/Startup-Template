import { Resend } from 'resend'

let _client: Resend | null = null

// Lazy singleton — defers instantiation until first use so builds without
// env vars don't throw at module load time.
export function getResend(): Resend {
  if (!_client) {
    _client = new Resend(process.env.RESEND_API_KEY!)
  }
  return _client
}
