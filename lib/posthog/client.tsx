'use client'

import posthog from 'posthog-js'
import { PostHogProvider as PHProvider, usePostHog } from 'posthog-js/react'
import { useEffect } from 'react'
import { useUser, useOrganization } from '@clerk/nextjs'

if (typeof window !== 'undefined') {
  posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY!, {
    api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com',
    capture_pageview: true,
    capture_pageleave: true,
    autocapture: true,
  })
}

function PostHogAuthSync() {
  const { user } = useUser()
  const { organization } = useOrganization()
  const ph = usePostHog()

  useEffect(() => {
    if (user) {
      ph.identify(user.id, {
        email: user.primaryEmailAddress?.emailAddress,
        name: user.fullName,
      })
    }
  }, [user, ph])

  useEffect(() => {
    if (organization) {
      ph.group('organization', organization.id, {
        name: organization.name,
      })
    }
  }, [organization, ph])

  return null
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return (
    <PHProvider client={posthog}>
      <PostHogAuthSync />
      {children}
    </PHProvider>
  )
}
