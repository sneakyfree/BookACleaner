'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import {
    TrendingUp, TrendingDown, Users, Calendar, DollarSign, Star,
    ArrowUpRight, ArrowDownRight, BarChart3, PieChart, Activity,
    Loader2, AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Analytics Dashboard for Admins
 * Comprehensive usage metrics — wired to GET /api/v1/admin/stats
 */

interface PlatformStats {
    users: {
        total: number
        cleaners: number
        clients: number
        new_this_week: number
    }
    jobs: {
        total: number
        pending: number
        completed: number
        completion_rate: number
    }
    revenue: {
        total: number
        platform_fee: number
    }
    verifications: {
        pending: number
    }
}

export default function AnalyticsDashboard() {
    const { data: session } = useSession()
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [stats, setStats] = useState<PlatformStats | null>(null)

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    useEffect(() => {
        const token = (session as any)?.accessToken
        if (!token) {
            setLoading(false)
            return
        }

        async function fetchStats() {
            try {
                setError(null)
                const res = await fetch(`${API_URL}/api/v1/admin/stats`, {
                    headers: {
                        Authorization: `Bearer ${(session as any)?.accessToken}`,
                    },
                })

                if (!res.ok) {
                    throw new Error(`Failed to load analytics (${res.status})`)
                }

                const data: PlatformStats = await res.json()
                setStats(data)
            } catch (err) {
                console.error('Failed to fetch analytics:', err)
                setError(err instanceof Error ? err.message : 'Failed to load analytics')
            } finally {
                setLoading(false)
            }
        }
        fetchStats()
    }, [API_URL, session])

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                <span className="ml-3 text-white/60">Loading analytics...</span>
            </div>
        )
    }

    if (error || !stats) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
                <div className="max-w-7xl mx-auto">
                    <h1 className="text-2xl font-bold text-white mb-4">Analytics Dashboard</h1>
                    <div className="bg-white/5 rounded-xl border border-red-500/30 p-8 text-center">
                        <AlertCircle className="w-10 h-10 mx-auto text-red-400 mb-3" />
                        <p className="text-red-400 font-medium">{error || 'No data available'}</p>
                        <p className="text-white/40 text-sm mt-1">Please try refreshing the page</p>
                    </div>
                </div>
            </div>
        )
    }

    const metrics = {
        totalBookings: { value: stats.jobs.total, change: 0, trend: 'up' as const },
        totalRevenue: { value: stats.revenue.total, change: 0, trend: 'up' as const },
        activeCleaners: { value: stats.users.cleaners, change: 0, trend: 'up' as const },
        activeClients: { value: stats.users.clients, change: 0, trend: 'up' as const },
        completionRate: { value: stats.jobs.completion_rate, change: 0, trend: 'up' as const },
        pendingVerifications: { value: stats.verifications.pending, change: 0, trend: 'up' as const },
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
                        <p className="text-white/60">Track your platform performance</p>
                    </div>
                    <div className="flex gap-1 p-1 rounded-lg bg-white/5">
                        {(['7d', '30d', '90d', '1y'] as const).map((range) => (
                            <button
                                key={range}
                                onClick={() => setTimeRange(range)}
                                className={cn(
                                    'px-4 py-2 rounded-md text-sm transition-colors',
                                    timeRange === range
                                        ? 'bg-brand-500 text-white'
                                        : 'text-white/60 hover:text-white'
                                )}
                            >
                                {range === '7d' && '7 Days'}
                                {range === '30d' && '30 Days'}
                                {range === '90d' && '90 Days'}
                                {range === '1y' && '1 Year'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Metric Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
                    <MetricCard
                        title="Total Bookings"
                        value={metrics.totalBookings.value.toLocaleString()}
                        change={metrics.totalBookings.change}
                        trend={metrics.totalBookings.trend}
                        icon={Calendar}
                    />
                    <MetricCard
                        title="Total Revenue"
                        value={`$${metrics.totalRevenue.value.toLocaleString()}`}
                        change={metrics.totalRevenue.change}
                        trend={metrics.totalRevenue.trend}
                        icon={DollarSign}
                    />
                    <MetricCard
                        title="Active Cleaners"
                        value={metrics.activeCleaners.value.toString()}
                        change={metrics.activeCleaners.change}
                        trend={metrics.activeCleaners.trend}
                        icon={Users}
                    />
                    <MetricCard
                        title="Active Clients"
                        value={metrics.activeClients.value.toString()}
                        change={metrics.activeClients.change}
                        trend={metrics.activeClients.trend}
                        icon={Users}
                    />
                    <MetricCard
                        title="Completion Rate"
                        value={`${metrics.completionRate.value}%`}
                        change={metrics.completionRate.change}
                        trend={metrics.completionRate.trend}
                        icon={Activity}
                    />
                    <MetricCard
                        title="Pending Verifications"
                        value={metrics.pendingVerifications.value.toString()}
                        change={0}
                        trend="up"
                        icon={Star}
                    />
                </div>

                {/* Summary Cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Revenue Breakdown */}
                    <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <BarChart3 className="w-5 h-5 text-brand-400" />
                            <h3 className="text-lg font-semibold text-white">Revenue Breakdown</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                                <span className="text-white/80">Total Revenue</span>
                                <span className="text-green-400 font-bold text-lg">${stats.revenue.total.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                                <span className="text-white/80">Platform Fee (15%)</span>
                                <span className="text-brand-400 font-bold text-lg">${stats.revenue.platform_fee.toLocaleString()}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                                <span className="text-white/80">Cleaner Payouts</span>
                                <span className="text-blue-400 font-bold text-lg">
                                    ${(stats.revenue.total - stats.revenue.platform_fee).toLocaleString()}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Jobs Breakdown */}
                    <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <PieChart className="w-5 h-5 text-brand-400" />
                            <h3 className="text-lg font-semibold text-white">Jobs Overview</h3>
                        </div>
                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                                <span className="text-white/80">Total Jobs</span>
                                <span className="text-white font-bold text-lg">{stats.jobs.total}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                                <span className="text-white/80">Completed</span>
                                <span className="text-green-400 font-bold text-lg">{stats.jobs.completed}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                                <span className="text-white/80">Pending</span>
                                <span className="text-amber-400 font-bold text-lg">{stats.jobs.pending}</span>
                            </div>
                            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                                <span className="text-white/80">New Users This Week</span>
                                <span className="text-brand-400 font-bold text-lg">{stats.users.new_this_week}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// Metric Card Component
interface MetricCardProps {
    title: string
    value: string
    change: number
    trend: 'up' | 'down'
    icon: React.ElementType
}

function MetricCard({ title, value, change, trend, icon: Icon }: MetricCardProps) {
    return (
        <div className="bg-white/5 rounded-xl border border-white/10 p-6">
            <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg bg-brand-500/20 flex items-center justify-center">
                    <Icon className="w-5 h-5 text-brand-400" />
                </div>
                {change !== 0 && (
                    <div
                        className={cn(
                            'flex items-center gap-1 text-sm',
                            trend === 'up' ? 'text-green-400' : 'text-red-400'
                        )}
                    >
                        {trend === 'up' ? (
                            <ArrowUpRight className="w-4 h-4" />
                        ) : (
                            <ArrowDownRight className="w-4 h-4" />
                        )}
                        {Math.abs(change)}%
                    </div>
                )}
            </div>
            <div>
                <p className="text-white/50 text-sm mb-1">{title}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
            </div>
        </div>
    )
}
