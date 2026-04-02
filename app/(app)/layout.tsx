import { Sidebar } from '@/components/app/sidebar'

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-auto bg-muted/10">
        {children}
      </main>
    </div>
  )
}
