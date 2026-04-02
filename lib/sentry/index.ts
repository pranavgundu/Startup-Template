import * as Sentry from '@sentry/nextjs'

export function captureException(
  error: unknown,
  context?: Record<string, unknown>
) {
  Sentry.withScope((scope) => {
    if (context) {
      scope.setExtras(context)
    }
    Sentry.captureException(error)
  })
}

export function setUserContext(userId: string, orgId: string) {
  Sentry.setUser({ id: userId })
  Sentry.setTag('org_id', orgId)
}
