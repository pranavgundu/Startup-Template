'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, CreditCard, Users, Settings } from 'lucide-react'
import { cn } from '@/lib/utils'
import { OrgSwitcher } from './org-switcher'
import { UserNav } from './user-nav'

const navItems = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/settings/organization', label: 'Organization', icon: Users },
  { href: '/settings/billing', label: 'Billing', icon: CreditCard },
  { href: '/settings/profile', label: 'Profile', icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="flex h-screen w-60 flex-col border-r bg-background">
      <div className="p-4 border-b">
        <OrgSwitcher />
      </div>

      <nav className="flex-1 overflow-auto p-3 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors',
              pathname.startsWith(item.href)
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
            )}
          >
            <item.icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t flex items-center gap-3">
        <UserNav />
        <span className="text-sm text-muted-foreground">Account</span>
      </div>
    </aside>
  )
}
