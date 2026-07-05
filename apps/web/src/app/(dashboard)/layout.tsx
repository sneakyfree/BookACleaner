'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { requestPushPermission, setupForegroundListener } from '@/lib/push'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/auth/api-client'
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

    const isCleaner = session?.user?.role?.toLowerCase() === 'cleaner'
    const isAdmin = session?.user?.role?.toLowerCase() === 'admin'
    const navItems = isAdmin ? adminNavItems : isCleaner ? cleanerNavItems : clientNavItems
    const basePath = isAdmin ? '/admin' : isCleaner ? '/cleaner' : '/client'

    // Initialize push notifications after auth
    useEffect(() => {
        if (!session) return
        requestPushPermission().catch(() => { })
        setupForegroundListener().catch(() => { })
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
                    'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform lg:translate-x-0',
                    sidebarOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                {/* Logo */}
                <div className="flex items-center justify-between h-16 px-4 border-b border-slate-200 dark:border-slate-700">
                    <Link href="/" className="flex items-center gap-2">
                        <Sparkles className="w-7 h-7 text-brand-500" />
                        <span className="text-lg font-display font-bold">
                            BookACleaner<span className="text-brand-500">.ai</span>
                        </span>
                    </Link>
                    <button
                        className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="p-4 space-y-1">
                    {navItems.map((item) => {
                        const isActive = pathname === item.href || pathname.startsWith(item.href + '/')
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={cn(
                                    'flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors min-h-[44px]',
                                    isActive
                                        ? 'bg-brand-50 text-brand-600 dark:bg-brand-500/10 dark:text-brand-400'
                                        : 'text-slate-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700'
                                )}
                            >
                                <item.icon className="w-5 h-5" />
                                {item.label}
                            </Link>
                        )
                    })}
                </nav>

                {/* User section */}
                <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-slate-200 dark:border-slate-700">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                            <User className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{session?.user?.email}</p>
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
                                    }).catch(() => { })
                                    localStorage.removeItem('fcm_token')
                                }
                            } catch { }
                            signOut({ callbackUrl: '/' })
                        }}
                    >
                        <LogOut className="w-4 h-4 mr-2" />
                        Sign out
                    </Button>
                </div>
            </aside>

            {/* Main content */}
            <div className="lg:pl-64">
                {/* Top header */}
                <header className="sticky top-0 z-30 h-16 bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700 flex items-center justify-between px-4 lg:px-8">
                    <button
                        className="lg:hidden p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <Menu className="w-5 h-5" />
                    </button>

                    <div className="flex-1" />

                    <div className="flex items-center gap-4">
                        <Link href="/dashboard/notifications" className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg relative">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full" />
                        </Link>
                        {!isAdmin && (
                            <Link
                                href={`${basePath}/settings`}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-slate-700 rounded-lg"
                            >
                                <Settings className="w-5 h-5" />
                            </Link>
                        )}
                    </div>
                </header>

                {/* Page content */}
                <main className="p-4 lg:p-8">{children}</main>
            </div>
        </div>
    )
}
