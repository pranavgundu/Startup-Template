import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import { ClerkProvider } from '@clerk/nextjs'
import { PostHogProvider } from '@/lib/posthog/client'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SaaS Template',
  description: 'Production-ready SaaS starter',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ClerkProvider>
      <html lang="en" suppressHydrationWarning>
        <body className={inter.className}>
          <PostHogProvider>
            {children}
          </PostHogProvider>
        </body>
      </html>
    </ClerkProvider>
  )
}
