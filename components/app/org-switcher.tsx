'use client'

import { OrganizationSwitcher } from '@clerk/nextjs'

export function OrgSwitcher() {
  return (
    <OrganizationSwitcher
      hidePersonal
      afterSelectOrganizationUrl="/dashboard"
      afterCreateOrganizationUrl="/dashboard"
      appearance={{
        elements: {
          organizationSwitcherTrigger: 'w-full justify-start',
        },
      }}
    />
  )
}
