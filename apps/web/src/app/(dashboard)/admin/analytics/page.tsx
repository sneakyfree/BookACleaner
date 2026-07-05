'use client'

import { useState } from 'react'
import {
    TrendingUp, TrendingDown, Users, Calendar, DollarSign, Star,
    ArrowUpRight, ArrowDownRight, BarChart3, PieChart, Activity,
    Loader2, AlertCircle, Server, Database,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminStats } from '@/hooks/use-api'

/**
 * Analytics Dashboard for Admins
 * Comprehensive usage metrics — wired via useAdminStats React Query hook
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
    background_tasks?: {
        scheduled: { name: string; schedule: string; task: string }[]
        cache_connected: boolean
    }
}

export default function AnalyticsDashboard() {
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
    const { data: stats, isLoading: loading, error } = useAdminStats(timeRange)

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
                        <p className="text-red-400 font-medium">{(error as any)?.detail || 'No data available'}</p>
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

                            {/* Completion Rate Bar */}
                            <div className="p-4 rounded-lg bg-white/5">
                                <div className="flex justify-between text-sm mb-2">
                                    <span className="text-white/60">Completion Rate</span>
                                    <span className="text-green-400 font-semibold">{stats.jobs.completion_rate}%</span>
                                </div>
                                <div className="h-3 bg-white/5 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-1000 bg-gradient-to-r from-green-500 to-emerald-400"
                                        style={{ width: `${stats.jobs.completion_rate}%` }}
                                    />
                                </div>
                            </div>

                            {/* Status Distribution */}
                            {stats.jobs.total > 0 && (
                                <div className="p-4 rounded-lg bg-white/5">
                                    <p className="text-white/60 text-sm mb-2">Status Distribution</p>
                                    <div className="h-3 rounded-full overflow-hidden flex">
                                        <div className="bg-green-500 transition-all" style={{ width: `${(stats.jobs.completed / stats.jobs.total * 100)}%` }} />
                                        <div className="bg-amber-500 transition-all" style={{ width: `${(stats.jobs.pending / stats.jobs.total * 100)}%` }} />
                                        <div className="bg-slate-500 flex-1" />
                                    </div>
                                    <div className="flex gap-4 mt-2 text-[10px]">
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-green-500" />Completed</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-amber-500" />Pending</span>
                                        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full bg-slate-500" />Other</span>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                                <span className="text-white/80">New Users This Week</span>
                                <span className="text-brand-400 font-bold text-lg">{stats.users.new_this_week}</span>
                            </div>
                        </div>

                        {/* Background Tasks */}
                        {stats.background_tasks && (
                            <div className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Server className="w-4 h-4 text-brand-400" />
                                    <span className="text-white/80 font-medium text-sm">Background Tasks</span>
                                </div>
                                <div className="flex items-center gap-3 text-xs">
                                    <span className={`flex items-center gap-1.5 px-2 py-1 rounded-full ${stats.background_tasks.cache_connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                        <Database className="w-3 h-3" />
                                        Redis {stats.background_tasks.cache_connected ? 'Connected' : 'Disconnected'}
                                    </span>
                                    <span className="text-white/40">
                                        {stats.background_tasks.scheduled.length} scheduled tasks
                                    </span>
                                </div>
                                {stats.background_tasks.scheduled.length > 0 && (
                                    <div className="space-y-1">
                                        {stats.background_tasks.scheduled.map((t: { name: string; schedule: string }, i: number) => (
                                            <div key={i} className="flex justify-between text-xs p-2 rounded bg-white/5">
                                                <span className="text-white/60 truncate">{t.name}</span>
                                                <span className="text-white/40 ml-2 flex-shrink-0">{t.schedule}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
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
