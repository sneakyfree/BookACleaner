'use client'

import { useState } from 'react'
import {
    TrendingUp, TrendingDown, Users, Calendar, DollarSign, Star,
    ArrowUpRight, ArrowDownRight, BarChart3, PieChart, Activity
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Analytics Dashboard for Admins
 * Comprehensive usage metrics and charts
 */

// Mock data for demo
const mockMetrics = {
    totalBookings: { value: 1247, change: 12.5, trend: 'up' },
    totalRevenue: { value: 89400, change: 8.3, trend: 'up' },
    activeCleaners: { value: 156, change: 5.2, trend: 'up' },
    activeClients: { value: 892, change: -2.1, trend: 'down' },
    avgRating: { value: 4.8, change: 0.1, trend: 'up' },
    completionRate: { value: 94.2, change: 1.5, trend: 'up' },
}

const mockChartData = {
    bookings: [
        { month: 'Jan', value: 145 },
        { month: 'Feb', value: 178 },
        { month: 'Mar', value: 201 },
        { month: 'Apr', value: 189 },
        { month: 'May', value: 234 },
        { month: 'Jun', value: 267 },
    ],
    revenue: [
        { month: 'Jan', value: 12500 },
        { month: 'Feb', value: 14200 },
        { month: 'Mar', value: 15800 },
        { month: 'Apr', value: 14900 },
        { month: 'May', value: 17500 },
        { month: 'Jun', value: 19200 },
    ],
    serviceTypes: [
        { name: 'Standard', value: 45, color: 'bg-blue-500' },
        { name: 'Deep Clean', value: 25, color: 'bg-green-500' },
        { name: 'Move In/Out', value: 15, color: 'bg-purple-500' },
        { name: 'Turnover', value: 10, color: 'bg-amber-500' },
        { name: 'Custom', value: 5, color: 'bg-pink-500' },
    ],
}

const mockTopCleaners = [
    { name: 'Maria Garcia', jobs: 89, rating: 4.9, revenue: 8940 },
    { name: 'James Wilson', jobs: 76, rating: 4.8, revenue: 7620 },
    { name: 'Sarah Johnson', jobs: 72, rating: 4.9, revenue: 7440 },
    { name: 'David Chen', jobs: 68, rating: 4.7, revenue: 6800 },
    { name: 'Emily Brown', jobs: 61, rating: 4.8, revenue: 6100 },
]

export default function AnalyticsDashboard() {
    const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')

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
                        value={mockMetrics.totalBookings.value.toLocaleString()}
                        change={mockMetrics.totalBookings.change}
                        trend={mockMetrics.totalBookings.trend as 'up' | 'down'}
                        icon={Calendar}
                    />
                    <MetricCard
                        title="Total Revenue"
                        value={`$${mockMetrics.totalRevenue.value.toLocaleString()}`}
                        change={mockMetrics.totalRevenue.change}
                        trend={mockMetrics.totalRevenue.trend as 'up' | 'down'}
                        icon={DollarSign}
                    />
                    <MetricCard
                        title="Active Cleaners"
                        value={mockMetrics.activeCleaners.value.toString()}
                        change={mockMetrics.activeCleaners.change}
                        trend={mockMetrics.activeCleaners.trend as 'up' | 'down'}
                        icon={Users}
                    />
                    <MetricCard
                        title="Active Clients"
                        value={mockMetrics.activeClients.value.toString()}
                        change={mockMetrics.activeClients.change}
                        trend={mockMetrics.activeClients.trend as 'up' | 'down'}
                        icon={Users}
                    />
                    <MetricCard
                        title="Average Rating"
                        value={mockMetrics.avgRating.value.toString()}
                        change={mockMetrics.avgRating.change}
                        trend={mockMetrics.avgRating.trend as 'up' | 'down'}
                        icon={Star}
                    />
                    <MetricCard
                        title="Completion Rate"
                        value={`${mockMetrics.completionRate.value}%`}
                        change={mockMetrics.completionRate.change}
                        trend={mockMetrics.completionRate.trend as 'up' | 'down'}
                        icon={Activity}
                    />
                </div>

                {/* Charts Row */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
                    {/* Bookings Chart */}
                    <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <BarChart3 className="w-5 h-5 text-brand-400" />
                            <h3 className="text-lg font-semibold text-white">Bookings Trend</h3>
                        </div>
                        <div className="h-64 flex items-end gap-4">
                            {mockChartData.bookings.map((item) => {
                                const maxValue = Math.max(...mockChartData.bookings.map((b) => b.value))
                                const height = (item.value / maxValue) * 100
                                return (
                                    <div key={item.month} className="flex-1 flex flex-col items-center gap-2">
                                        <div
                                            className="w-full bg-brand-500 rounded-t-md transition-all hover:bg-brand-400"
                                            style={{ height: `${height}%` }}
                                        />
                                        <span className="text-white/50 text-xs">{item.month}</span>
                                    </div>
                                )
                            })}
                        </div>
                    </div>

                    {/* Service Types Distribution */}
                    <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                        <div className="flex items-center gap-2 mb-6">
                            <PieChart className="w-5 h-5 text-brand-400" />
                            <h3 className="text-lg font-semibold text-white">Service Distribution</h3>
                        </div>
                        <div className="space-y-4">
                            {mockChartData.serviceTypes.map((service) => (
                                <div key={service.name} className="flex items-center gap-4">
                                    <div className={cn('w-3 h-3 rounded-full', service.color)} />
                                    <span className="text-white/80 flex-1">{service.name}</span>
                                    <div className="w-32 h-2 bg-white/10 rounded-full overflow-hidden">
                                        <div
                                            className={cn('h-full rounded-full', service.color)}
                                            style={{ width: `${service.value}%` }}
                                        />
                                    </div>
                                    <span className="text-white/50 text-sm w-10 text-right">
                                        {service.value}%
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Top Performers */}
                <div className="bg-white/5 rounded-xl border border-white/10 p-6">
                    <div className="flex items-center justify-between mb-6">
                        <div className="flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-brand-400" />
                            <h3 className="text-lg font-semibold text-white">Top Performing Cleaners</h3>
                        </div>
                        <span className="text-white/40 text-sm">{timeRange} period</span>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead>
                                <tr className="text-white/50 text-sm border-b border-white/10">
                                    <th className="text-left py-3 font-medium">Rank</th>
                                    <th className="text-left py-3 font-medium">Cleaner</th>
                                    <th className="text-right py-3 font-medium">Jobs</th>
                                    <th className="text-right py-3 font-medium">Rating</th>
                                    <th className="text-right py-3 font-medium">Revenue</th>
                                </tr>
                            </thead>
                            <tbody>
                                {mockTopCleaners.map((cleaner, index) => (
                                    <tr key={cleaner.name} className="border-b border-white/5">
                                        <td className="py-4">
                                            <span
                                                className={cn(
                                                    'w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold',
                                                    index === 0 && 'bg-amber-500 text-amber-900',
                                                    index === 1 && 'bg-gray-300 text-gray-700',
                                                    index === 2 && 'bg-amber-700 text-amber-100',
                                                    index > 2 && 'bg-white/10 text-white/60'
                                                )}
                                            >
                                                {index + 1}
                                            </span>
                                        </td>
                                        <td className="py-4 text-white font-medium">{cleaner.name}</td>
                                        <td className="py-4 text-white/80 text-right">{cleaner.jobs}</td>
                                        <td className="py-4 text-right">
                                            <span className="inline-flex items-center gap-1 text-amber-400">
                                                <Star className="w-3 h-3 fill-current" />
                                                {cleaner.rating}
                                            </span>
                                        </td>
                                        <td className="py-4 text-green-400 text-right">
                                            ${cleaner.revenue.toLocaleString()}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
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
            </div>
            <div>
                <p className="text-white/50 text-sm mb-1">{title}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
            </div>
        </div>
    )
}
