'use client'

import { UserButton } from '@clerk/nextjs'

// In Clerk v7, afterSignOutUrl is not a prop on UserButton.
// Sign-out redirect is configured via NEXT_PUBLIC_CLERK_AFTER_SIGN_OUT_URL env var.
export function UserNav() {
  return (
    <UserButton
      appearance={{
        elements: {
          avatarBox: 'h-8 w-8',
        },
      }}
    />
  )
}
