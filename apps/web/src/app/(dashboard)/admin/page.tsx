'use client'

import Link from 'next/link'
import { useAdminStats } from '@/hooks/use-api'
import {
    Users,
    Calendar,
    DollarSign,
    ClipboardCheck,
    BarChart3,
    AlertTriangle,
    FileText,
    Rss,
    ShieldCheck,
    Flag,
    Briefcase,
    Loader2,
    AlertCircle,
    ArrowRight,
} from 'lucide-react'

/**
 * Admin landing / overview page.
 * `/dashboard` redirects admins here, so this must exist (was a 404).
 * Surfaces headline platform stats + quick links to every admin section,
 * including Approvals & Moderation which are not in the sidebar nav.
 */

const sections = [
    { label: 'Analytics', href: '/admin/analytics', icon: BarChart3, desc: 'Platform usage & revenue metrics' },
    { label: 'Users', href: '/admin/users', icon: Users, desc: 'Manage all platform users' },
    { label: 'Verifications', href: '/admin/verifications', icon: ClipboardCheck, desc: 'Review cleaner verification documents' },
    { label: 'Approvals', href: '/admin/approvals', icon: ShieldCheck, desc: 'Items waiting in the approval queue' },
    { label: 'Jobs', href: '/admin/jobs', icon: Briefcase, desc: 'Oversee every booking on the platform' },
    { label: 'Disputes', href: '/admin/disputes', icon: AlertTriangle, desc: 'Resolve client & cleaner disputes' },
    { label: 'Moderation', href: '/admin/moderation', icon: Flag, desc: 'Review flagged content' },
    { label: 'Audit Trail', href: '/admin/audit', icon: FileText, desc: 'System audit log' },
    { label: 'Feed Manager', href: '/admin/feed-manager', icon: Rss, desc: 'Manage the community feed' },
]

export default function AdminDashboard() {
    const { data: stats, isLoading, error } = useAdminStats('30d')

    const cards = [
        { label: 'Total Users', value: stats?.users?.total ?? 0, sub: `${stats?.users?.cleaners ?? 0} cleaners · ${stats?.users?.clients ?? 0} clients`, icon: Users },
        { label: 'Total Bookings', value: stats?.jobs?.total ?? 0, sub: `${stats?.jobs?.pending ?? 0} pending · ${stats?.jobs?.completed ?? 0} completed`, icon: Calendar },
        { label: 'Revenue', value: `$${(stats?.revenue?.total ?? 0).toLocaleString()}`, sub: `Platform fee $${(stats?.revenue?.platform_fee ?? 0).toLocaleString()}`, icon: DollarSign },
        { label: 'Pending Verifications', value: stats?.verifications?.pending ?? 0, sub: 'Awaiting review', icon: ClipboardCheck },
    ]

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                <div>
                    <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
                    <p className="text-white/50 mt-1">Platform overview and management tools</p>
                </div>

                {isLoading ? (
                    <div className="flex items-center justify-center py-16">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                        <span className="ml-3 text-white/60">Loading overview…</span>
                    </div>
                ) : error ? (
                    <div className="bg-white/5 rounded-xl border border-red-500/30 p-6 text-center">
                        <AlertCircle className="w-8 h-8 mx-auto text-red-400 mb-2" />
                        <p className="text-red-400 font-medium">{(error as any)?.detail || 'Could not load platform stats'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                        {cards.map((c) => (
                            <div key={c.label} className="bg-white/5 rounded-xl border border-white/10 p-5">
                                <div className="flex items-center justify-between">
                                    <span className="text-white/60 text-sm">{c.label}</span>
                                    <c.icon className="w-5 h-5 text-brand-400" />
                                </div>
                                <div className="text-2xl font-bold text-white mt-2">{c.value}</div>
                                <div className="text-xs text-white/40 mt-1">{c.sub}</div>
                            </div>
                        ))}
                    </div>
                )}

                <div>
                    <h2 className="text-lg font-semibold text-white mb-4">Management</h2>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {sections.map((s) => (
                            <Link
                                key={s.href}
                                href={s.href}
                                className="group bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 hover:border-brand-500/40 p-5 transition-colors"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-lg bg-brand-500/15 flex items-center justify-center">
                                            <s.icon className="w-5 h-5 text-brand-400" />
                                        </div>
                                        <span className="text-white font-medium">{s.label}</span>
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-white/30 group-hover:text-brand-400 transition-colors" />
                                </div>
                                <p className="text-sm text-white/50 mt-3">{s.desc}</p>
                            </Link>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
