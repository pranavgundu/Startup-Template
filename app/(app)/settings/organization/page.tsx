import { OrganizationProfile } from '@clerk/nextjs'

export default function OrganizationPage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Organization</h1>
        <p className="text-muted-foreground">Manage your organization and team members.</p>
      </div>
      <OrganizationProfile />
    </div>
  )
}
