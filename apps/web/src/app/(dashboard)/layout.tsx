'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { requestPushPermission, setupForegroundListener } from '@/lib/push'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/auth/api-client'
import { useUnreadCount } from '@/hooks/use-api'
import { Button } from '@/components/ui/button'
import {
  Sparkles,
  LayoutDashboard,
  Calendar,
  MessageSquare,
  Star,
  Settings,
  LogOut,
  Menu,
  X,
  User,
  Bell,
  Building2,
  Briefcase,
  DollarSign,
  Shield,
  BarChart3,
  Users,
  ClipboardCheck,
  FileText,
  AlertTriangle,
  Rss,
  MapPin,
  ShoppingBag,
  Clock,
  CreditCard,
} from 'lucide-react'

interface NavItem {
  label: string
  href: string
  icon: React.ElementType
}

const cleanerNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/cleaner', icon: LayoutDashboard },
  { label: 'Jobs', href: '/cleaner/jobs', icon: Briefcase },
  { label: 'Calendar', href: '/cleaner/calendar', icon: Calendar },
  { label: 'Marketplace', href: '/cleaner/marketplace', icon: ShoppingBag },
  { label: 'Routes', href: '/cleaner/routes', icon: MapPin },
  { label: 'Schedule Gaps', href: '/cleaner/schedule-gaps', icon: Clock },
  { label: 'Messages', href: '/cleaner/messages', icon: MessageSquare },
  { label: 'Earnings', href: '/cleaner/earnings', icon: DollarSign },
  { label: 'Reviews', href: '/cleaner/reviews', icon: Star },
  { label: 'Subscription', href: '/cleaner/subscription', icon: CreditCard },
  { label: 'Verification', href: '/cleaner/verification', icon: Shield },
  { label: 'Settings', href: '/cleaner/settings', icon: Settings },
]

const clientNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/client', icon: LayoutDashboard },
  { label: 'Properties', href: '/client/properties', icon: Building2 },
  { label: 'Bookings', href: '/client/bookings', icon: Calendar },
  { label: 'Payments', href: '/client/payments', icon: DollarSign },
  { label: 'Messages', href: '/client/messages', icon: MessageSquare },
  { label: 'Reviews', href: '/client/reviews', icon: Star },
  { label: 'Agreements', href: '/client/agreements', icon: FileText },
  { label: 'Settings', href: '/client/settings', icon: Settings },
]

const adminNavItems: NavItem[] = [
  { label: 'Dashboard', href: '/admin', icon: LayoutDashboard },
  { label: 'Analytics', href: '/admin/analytics', icon: BarChart3 },
  { label: 'Users', href: '/admin/users', icon: Users },
  { label: 'Verifications', href: '/admin/verifications', icon: ClipboardCheck },
  { label: 'Jobs', href: '/admin/jobs', icon: Briefcase },
  { label: 'Disputes', href: '/admin/disputes', icon: AlertTriangle },
  { label: 'Audit Trail', href: '/admin/audit', icon: FileText },
  { label: 'Feed Manager', href: '/admin/feed-manager', icon: Rss },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const { data: unreadData } = useUnreadCount()
  const unreadCount = unreadData?.unread_count ?? 0

  const isCleaner = session?.user?.role?.toLowerCase() === 'cleaner'
  const isAdmin = session?.user?.role?.toLowerCase() === 'admin'
  const navItems = isAdmin ? adminNavItems : isCleaner ? cleanerNavItems : clientNavItems
  const basePath = isAdmin ? '/admin' : isCleaner ? '/cleaner' : '/client'

  // Initialize push notifications after auth
  useEffect(() => {
    if (!session) return
    requestPushPermission().catch(() => {})
    setupForegroundListener().catch(() => {})
  }, [session])

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 w-64 transform border-r border-slate-200 bg-white transition-transform lg:translate-x-0 dark:border-slate-700 dark:bg-slate-800',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Logo */}
        <div className="flex h-16 items-center justify-between border-b border-slate-200 px-4 dark:border-slate-700">
          <Link href="/" className="flex items-center gap-2">
            <Sparkles className="text-brand-500 h-7 w-7" />
            <span className="font-display text-lg font-bold">
              BookACleaner<span className="text-brand-500">.ai</span>
            </span>
          </Link>
          <button
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-700"
            onClick={() => setSidebarOpen(false)}
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 p-4">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  'flex min-h-[44px] items-center gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                    : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                )}
              >
                <item.icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>

        {/* User section */}
        <div className="absolute bottom-0 left-0 right-0 border-t border-slate-200 p-4 dark:border-slate-700">
          <div className="mb-4 flex items-center gap-3">
            <div className="bg-brand-100 dark:bg-brand-500/20 flex h-10 w-10 items-center justify-center rounded-full">
              <User className="text-brand-600 dark:text-brand-400 h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{session?.user?.email}</p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {isAdmin ? 'Admin' : isCleaner ? 'Cleaner' : 'Client'}
              </p>
            </div>
          </div>
          <Button
            variant="outline"
            className="w-full justify-start"
            onClick={async () => {
              try {
                const fcmToken = localStorage.getItem('fcm_token')
                if (fcmToken) {
                  await apiFetch('/api/v1/notifications/unregister-device', {
                    method: 'DELETE',
                    body: JSON.stringify({ token: fcmToken }),
                  }).catch(() => {})
                  localStorage.removeItem('fcm_token')
                }
              } catch {
                // best-effort device unregister; sign out regardless
              }
              signOut({ callbackUrl: '/' })
            }}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign out
          </Button>
        </div>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white px-4 lg:px-8 dark:border-slate-700 dark:bg-slate-800">
          <button
            className="rounded-lg p-2 hover:bg-slate-100 lg:hidden dark:hover:bg-slate-700"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-4">
            <Link
              href="/dashboard/notifications"
              className="relative rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-semibold leading-none text-white">
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </Link>
            <Link
              href={`${basePath}/settings`}
              className="rounded-lg p-2 hover:bg-slate-100 dark:hover:bg-slate-700"
            >
              <Settings className="h-5 w-5" />
            </Link>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8">{children}</main>
      </div>
    </div>
  )
}
