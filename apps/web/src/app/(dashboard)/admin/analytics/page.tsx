'use client'

import { useState } from 'react'
import {
  TrendingUp,
  TrendingDown,
  Users,
  Calendar,
  DollarSign,
  Star,
  ArrowUpRight,
  ArrowDownRight,
  BarChart3,
  PieChart,
  Activity,
  Loader2,
  AlertCircle,
  Server,
  Database,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminStats, useAdminTimeseries } from '@/hooks/use-api'

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

interface TimeseriesPoint {
  date: string
  signups: number
  jobs: number
  revenue: number
}

interface TimeseriesData {
  range: string
  series: TimeseriesPoint[]
  deltas: {
    signups: { current: number; change_pct: number }
    jobs: { current: number; change_pct: number }
    revenue: { current: number; change_pct: number }
  }
}

export default function AnalyticsDashboard() {
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const { data: stats, isLoading: loading, error } = useAdminStats(timeRange)
  const { data: timeseries, isLoading: seriesLoading } = useAdminTimeseries(timeRange) as {
    data: TimeseriesData | undefined
    isLoading: boolean
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <Loader2 className="text-brand-400 h-8 w-8 animate-spin" />
        <span className="ml-3 text-white/60">Loading analytics...</span>
      </div>
    )
  }

  if (error || !stats) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
        <div className="mx-auto max-w-7xl">
          <h1 className="mb-4 text-2xl font-bold text-white">Analytics Dashboard</h1>
          <div className="rounded-xl border border-red-500/30 bg-white/5 p-8 text-center">
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-400" />
            <p className="font-medium text-red-400">
              {(error as any)?.detail || 'No data available'}
            </p>
            <p className="mt-1 text-sm text-white/40">Please try refreshing the page</p>
          </div>
        </div>
      </div>
    )
  }

  const deltas = timeseries?.deltas
  const asMetric = (delta?: { change_pct: number }) => ({
    change: delta?.change_pct ?? 0,
    trend: (delta?.change_pct ?? 0) >= 0 ? ('up' as const) : ('down' as const),
  })

  const metrics = {
    totalBookings: { value: stats.jobs.total, ...asMetric(deltas?.jobs) },
    totalRevenue: { value: stats.revenue.total, ...asMetric(deltas?.revenue) },
    activeCleaners: { value: stats.users.cleaners, ...asMetric(deltas?.signups) },
    activeClients: { value: stats.users.clients, ...asMetric(deltas?.signups) },
    completionRate: { value: stats.jobs.completion_rate, change: 0, trend: 'up' as const },
    pendingVerifications: { value: stats.verifications.pending, change: 0, trend: 'up' as const },
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white">Analytics Dashboard</h1>
            <p className="text-white/60">Track your platform performance</p>
          </div>
          <div className="flex gap-1 rounded-lg bg-white/5 p-1">
            {(['7d', '30d', '90d', '1y'] as const).map((range) => (
              <button
                key={range}
                onClick={() => setTimeRange(range)}
                className={cn(
                  'rounded-md px-4 py-2 text-sm transition-colors',
                  timeRange === range ? 'bg-brand-500 text-white' : 'text-white/60 hover:text-white'
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
        <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
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

        {/* Time Series Chart */}
        <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Activity className="text-brand-400 h-5 w-5" />
              <h3 className="text-lg font-semibold text-white">Signups & Revenue Over Time</h3>
            </div>
            <div className="flex gap-4 text-xs">
              <span className="flex items-center gap-1.5 text-white/60">
                <span className="h-3 w-3 rounded-sm bg-emerald-400/70" /> Signups
              </span>
              <span className="flex items-center gap-1.5 text-white/60">
                <span className="bg-brand-400 h-0.5 w-3 rounded-full" /> Revenue ($)
              </span>
            </div>
          </div>
          {seriesLoading ? (
            <div className="flex items-center justify-center py-16 text-white/50">
              <Loader2 className="text-brand-400 h-6 w-6 animate-spin" />
              <span className="ml-3">Loading time series...</span>
            </div>
          ) : timeseries && timeseries.series.length > 0 ? (
            <TimeseriesChart series={timeseries.series} />
          ) : (
            <div className="py-16 text-center text-white/40">
              No time-series data for this range
            </div>
          )}
        </div>

        {/* Summary Cards */}
        <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Revenue Breakdown */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="mb-6 flex items-center gap-2">
              <BarChart3 className="text-brand-400 h-5 w-5" />
              <h3 className="text-lg font-semibold text-white">Revenue Breakdown</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                <span className="text-white/80">Total Revenue</span>
                <span className="text-lg font-bold text-green-400">
                  ${stats.revenue.total.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                <span className="text-white/80">Platform Fee (15%)</span>
                <span className="text-brand-400 text-lg font-bold">
                  ${stats.revenue.platform_fee.toLocaleString()}
                </span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                <span className="text-white/80">Cleaner Payouts</span>
                <span className="text-lg font-bold text-blue-400">
                  ${(stats.revenue.total - stats.revenue.platform_fee).toLocaleString()}
                </span>
              </div>
            </div>
          </div>

          {/* Jobs Breakdown */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6">
            <div className="mb-6 flex items-center gap-2">
              <PieChart className="text-brand-400 h-5 w-5" />
              <h3 className="text-lg font-semibold text-white">Jobs Overview</h3>
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                <span className="text-white/80">Total Jobs</span>
                <span className="text-lg font-bold text-white">{stats.jobs.total}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                <span className="text-white/80">Completed</span>
                <span className="text-lg font-bold text-green-400">{stats.jobs.completed}</span>
              </div>
              <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                <span className="text-white/80">Pending</span>
                <span className="text-lg font-bold text-amber-400">{stats.jobs.pending}</span>
              </div>

              {/* Completion Rate Bar */}
              <div className="rounded-lg bg-white/5 p-4">
                <div className="mb-2 flex justify-between text-sm">
                  <span className="text-white/60">Completion Rate</span>
                  <span className="font-semibold text-green-400">
                    {stats.jobs.completion_rate}%
                  </span>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-white/5">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400 transition-all duration-1000"
                    style={{ width: `${stats.jobs.completion_rate}%` }}
                  />
                </div>
              </div>

              {/* Status Distribution */}
              {stats.jobs.total > 0 && (
                <div className="rounded-lg bg-white/5 p-4">
                  <p className="mb-2 text-sm text-white/60">Status Distribution</p>
                  <div className="flex h-3 overflow-hidden rounded-full">
                    <div
                      className="bg-green-500 transition-all"
                      style={{ width: `${(stats.jobs.completed / stats.jobs.total) * 100}%` }}
                    />
                    <div
                      className="bg-amber-500 transition-all"
                      style={{ width: `${(stats.jobs.pending / stats.jobs.total) * 100}%` }}
                    />
                    <div className="flex-1 bg-slate-500" />
                  </div>
                  <div className="mt-2 flex gap-4 text-[10px]">
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-green-500" />
                      Completed
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-amber-500" />
                      Pending
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-slate-500" />
                      Other
                    </span>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                <span className="text-white/80">New Users This Week</span>
                <span className="text-brand-400 text-lg font-bold">
                  {stats.users.new_this_week}
                </span>
              </div>
            </div>

            {/* Background Tasks */}
            {stats.background_tasks && (
              <div className="space-y-3 rounded-xl border border-white/10 bg-white/5 p-4">
                <div className="flex items-center gap-2">
                  <Server className="text-brand-400 h-4 w-4" />
                  <span className="text-sm font-medium text-white/80">Background Tasks</span>
                </div>
                <div className="flex items-center gap-3 text-xs">
                  <span
                    className={`flex items-center gap-1.5 rounded-full px-2 py-1 ${stats.background_tasks.cache_connected ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}
                  >
                    <Database className="h-3 w-3" />
                    Redis {stats.background_tasks.cache_connected ? 'Connected' : 'Disconnected'}
                  </span>
                  <span className="text-white/40">
                    {stats.background_tasks.scheduled.length} scheduled tasks
                  </span>
                </div>
                {stats.background_tasks.scheduled.length > 0 && (
                  <div className="space-y-1">
                    {stats.background_tasks.scheduled.map(
                      (t: { name: string; schedule: string }, i: number) => (
                        <div
                          key={i}
                          className="flex justify-between rounded bg-white/5 p-2 text-xs"
                        >
                          <span className="truncate text-white/60">{t.name}</span>
                          <span className="ml-2 flex-shrink-0 text-white/40">{t.schedule}</span>
                        </div>
                      )
                    )}
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

// Inline SVG dual-series chart: signup bars + revenue line (no chart lib installed)
function TimeseriesChart({ series }: { series: TimeseriesPoint[] }) {
  const W = 800
  const H = 260
  const PAD = { top: 12, right: 48, bottom: 28, left: 40 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const maxSignups = Math.max(1, ...series.map((p) => p.signups))
  const maxRevenue = Math.max(1, ...series.map((p) => p.revenue))
  const n = series.length
  const step = plotW / n
  const barW = Math.max(1, Math.min(18, step * 0.6))

  const xCenter = (i: number) => PAD.left + step * i + step / 2
  const ySignups = (v: number) => PAD.top + plotH * (1 - v / maxSignups)
  const yRevenue = (v: number) => PAD.top + plotH * (1 - v / maxRevenue)

  const revenuePath = series
    .map(
      (p, i) => `${i === 0 ? 'M' : 'L'}${xCenter(i).toFixed(1)},${yRevenue(p.revenue).toFixed(1)}`
    )
    .join(' ')

  const fmtDate = (d: string) => {
    const dt = new Date(d)
    return isNaN(dt.getTime())
      ? d
      : dt.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
  }
  const labelIdx = n <= 2 ? [0, n - 1].slice(0, n) : [0, Math.floor(n / 2), n - 1]

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className="h-auto w-full"
      role="img"
      aria-label="Signups and revenue over time"
    >
      {/* horizontal gridlines */}
      {[0, 0.5, 1].map((f) => (
        <line
          key={f}
          x1={PAD.left}
          x2={W - PAD.right}
          y1={PAD.top + plotH * f}
          y2={PAD.top + plotH * f}
          stroke="rgba(255,255,255,0.08)"
          strokeWidth={1}
        />
      ))}
      {/* left axis (signups) */}
      <text
        x={PAD.left - 6}
        y={PAD.top + 4}
        textAnchor="end"
        fontSize={10}
        fill="rgba(52,211,153,0.8)"
      >
        {maxSignups}
      </text>
      <text
        x={PAD.left - 6}
        y={PAD.top + plotH + 4}
        textAnchor="end"
        fontSize={10}
        fill="rgba(255,255,255,0.35)"
      >
        0
      </text>
      {/* right axis (revenue) */}
      <text
        x={W - PAD.right + 6}
        y={PAD.top + 4}
        textAnchor="start"
        fontSize={10}
        fill="currentColor"
        className="text-brand-400"
      >
        ${maxRevenue.toLocaleString()}
      </text>
      <text
        x={W - PAD.right + 6}
        y={PAD.top + plotH + 4}
        textAnchor="start"
        fontSize={10}
        fill="rgba(255,255,255,0.35)"
      >
        $0
      </text>
      {/* signup bars */}
      {series.map((p, i) => (
        <rect
          key={p.date}
          x={xCenter(i) - barW / 2}
          y={ySignups(p.signups)}
          width={barW}
          height={Math.max(0, PAD.top + plotH - ySignups(p.signups))}
          rx={1.5}
          fill="rgba(52,211,153,0.45)"
        >
          <title>{`${fmtDate(p.date)} — ${p.signups} signups, $${p.revenue.toLocaleString()} revenue`}</title>
        </rect>
      ))}
      {/* revenue line */}
      <path
        d={revenuePath}
        fill="none"
        stroke="currentColor"
        className="text-brand-400"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* x-axis date labels */}
      {labelIdx.map((i) => (
        <text
          key={i}
          x={xCenter(i)}
          y={H - 8}
          textAnchor={i === 0 ? 'start' : i === n - 1 ? 'end' : 'middle'}
          fontSize={10}
          fill="rgba(255,255,255,0.4)"
        >
          {fmtDate(series[i].date)}
        </text>
      ))}
    </svg>
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
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-start justify-between">
        <div className="bg-brand-500/20 flex h-10 w-10 items-center justify-center rounded-lg">
          <Icon className="text-brand-400 h-5 w-5" />
        </div>
        {change !== 0 && (
          <div
            className={cn(
              'flex items-center gap-1 text-sm',
              trend === 'up' ? 'text-green-400' : 'text-red-400'
            )}
          >
            {trend === 'up' ? (
              <ArrowUpRight className="h-4 w-4" />
            ) : (
              <ArrowDownRight className="h-4 w-4" />
            )}
            {Math.abs(Math.round(change * 10) / 10)}%
          </div>
        )}
      </div>
      <div>
        <p className="mb-1 text-sm text-white/50">{title}</p>
        <p className="text-2xl font-bold text-white">{value}</p>
      </div>
    </div>
  )
}
