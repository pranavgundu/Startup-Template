import { UserProfile } from '@clerk/nextjs'

export default function ProfilePage() {
  return (
    <div className="p-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="text-muted-foreground">Manage your personal account settings.</p>
      </div>
      <UserProfile />
    </div>
  )
}
