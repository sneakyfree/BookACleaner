'use client'

import { useState } from 'react'
import {
  Globe,
  Eye,
  Users,
  Loader2,
  AlertCircle,
  Activity,
  FileText,
  Link2,
  Flag,
  MapPin,
} from 'lucide-react'
import { cn, formatCurrency } from '@/lib/utils'
import { useAdminTraffic, useAdminGeography } from '@/hooks/use-api'

interface TrafficPoint {
  date: string
  views: number
  visitors: number
}

interface RankedItem {
  key: string
  count: number
}

interface StateRow {
  state: string
  jobs: number
  revenue: number
}

export default function AdminTrafficPage() {
  const [range, setRange] = useState<'7d' | '30d' | '90d' | '1y'>('30d')
  const {
    data: traffic,
    isLoading: trafficLoading,
    error: trafficError,
    refetch,
  } = useAdminTraffic(range)
  const { data: geography, isLoading: geoLoading } = useAdminGeography(range)

  const series: TrafficPoint[] = traffic?.series || []
  const topPaths: RankedItem[] = traffic?.top_paths || []
  const topReferrers: RankedItem[] = traffic?.top_referrers || []
  const byCountry: RankedItem[] = traffic?.by_country || []
  const byState: StateRow[] = geography?.by_state || []

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
              <Globe className="text-brand-400 h-7 w-7" />
              Website Traffic
            </h1>
            <p className="mt-1 text-white/60">Page views, visitors and geography</p>
          </div>
          <div className="flex gap-1 rounded-lg bg-white/5 p-1">
            {(['7d', '30d', '90d', '1y'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRange(r)}
                className={cn(
                  'rounded-md px-4 py-2 text-sm transition-colors',
                  range === r ? 'bg-brand-500 text-white' : 'text-white/60 hover:text-white'
                )}
              >
                {r === '7d' && '7 Days'}
                {r === '30d' && '30 Days'}
                {r === '90d' && '90 Days'}
                {r === '1y' && '1 Year'}
              </button>
            ))}
          </div>
        </div>

        {/* Error Banner */}
        {trafficError && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">
              {(trafficError as any)?.detail || 'Failed to load traffic data'}
            </p>
            <button
              onClick={() => refetch()}
              className="ml-auto text-sm font-medium text-red-400 hover:text-red-300"
            >
              Retry
            </button>
          </div>
        )}

        {trafficLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="text-brand-400 h-8 w-8 animate-spin" />
            <span className="ml-3 text-white/60">Loading traffic...</span>
          </div>
        ) : traffic && (traffic.total_views || 0) === 0 ? (
          <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-12 text-center">
            <Globe className="mx-auto mb-3 h-10 w-10 text-white/20" />
            <p className="font-medium text-white/60">No traffic recorded yet</p>
            <p className="mt-1 text-sm text-white/40">
              Page views will appear here once visitors start browsing the site
            </p>
          </div>
        ) : traffic ? (
          <>
            {/* Big numbers */}
            <div className="mb-8 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="bg-brand-500/20 flex h-10 w-10 items-center justify-center rounded-lg">
                    <Eye className="text-brand-400 h-5 w-5" />
                  </div>
                  <p className="text-sm text-white/50">Total Views</p>
                </div>
                <p className="text-4xl font-bold text-white">
                  {(traffic.total_views || 0).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/5 p-6">
                <div className="mb-4 flex items-center gap-3">
                  <div className="bg-brand-500/20 flex h-10 w-10 items-center justify-center rounded-lg">
                    <Users className="text-brand-400 h-5 w-5" />
                  </div>
                  <p className="text-sm text-white/50">Unique Visitors</p>
                </div>
                <p className="text-4xl font-bold text-white">
                  {(traffic.unique_visitors || 0).toLocaleString()}
                </p>
              </div>
            </div>

            {/* Time series chart */}
            <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6">
              <div className="mb-6 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Activity className="text-brand-400 h-5 w-5" />
                  <h3 className="text-lg font-semibold text-white">Views & Visitors Over Time</h3>
                </div>
                <div className="flex gap-4 text-xs">
                  <span className="flex items-center gap-1.5 text-white/60">
                    <span className="h-3 w-3 rounded-sm bg-emerald-400/70" /> Views
                  </span>
                  <span className="flex items-center gap-1.5 text-white/60">
                    <span className="bg-brand-400 h-0.5 w-3 rounded-full" /> Visitors
                  </span>
                </div>
              </div>
              {series.length > 0 ? (
                <TrafficChart series={series} />
              ) : (
                <div className="py-16 text-center text-white/40">
                  No time-series data for this range
                </div>
              )}
            </div>

            {/* Top lists */}
            <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-3">
              <RankedList
                title="Top Pages"
                icon={FileText}
                items={topPaths}
                emptyLabel="No page views yet"
              />
              <RankedList
                title="Top Referrers"
                icon={Link2}
                items={topReferrers}
                emptyLabel="No referrers yet"
              />
              <RankedList
                title="By Country"
                icon={Flag}
                items={byCountry}
                emptyLabel="No country data yet"
              />
            </div>
          </>
        ) : null}

        {/* Revenue by state */}
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <div className="mb-6 flex items-center gap-2">
            <MapPin className="text-brand-400 h-5 w-5" />
            <h3 className="text-lg font-semibold text-white">Revenue by State</h3>
          </div>
          {geoLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="text-brand-400 h-6 w-6 animate-spin" />
              <span className="ml-3 text-white/60">Loading geography...</span>
            </div>
          ) : byState.length === 0 ? (
            <div className="py-12 text-center text-white/40">No completed jobs by state yet</div>
          ) : (
            <div className="space-y-3">
              {(() => {
                const maxRevenue = Math.max(1, ...byState.map((s) => s.revenue))
                return byState.map((s, i) => (
                  <div key={s.state || i} className="flex items-center gap-4">
                    <span className="w-6 shrink-0 text-right text-xs text-white/40">{i + 1}</span>
                    <span className="w-24 shrink-0 truncate text-sm font-medium text-white">
                      {s.state || 'Unknown'}
                    </span>
                    <div className="h-3 flex-1 overflow-hidden rounded-full bg-white/5">
                      <div
                        className="from-brand-500 h-full rounded-full bg-gradient-to-r to-emerald-400 transition-all duration-700"
                        style={{ width: `${(s.revenue / maxRevenue) * 100}%` }}
                      />
                    </div>
                    <span className="w-16 shrink-0 text-right text-xs text-white/50">
                      {s.jobs} job{s.jobs === 1 ? '' : 's'}
                    </span>
                    <span className="w-24 shrink-0 text-right text-sm font-semibold text-green-400">
                      {formatCurrency(s.revenue || 0)}
                    </span>
                  </div>
                ))
              })()}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// Ranked horizontal-bar list (top pages / referrers / countries)
function RankedList({
  title,
  icon: Icon,
  items,
  emptyLabel,
}: {
  title: string
  icon: React.ElementType
  items: RankedItem[]
  emptyLabel: string
}) {
  const max = Math.max(1, ...items.map((i) => i.count))
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-center gap-2">
        <Icon className="text-brand-400 h-5 w-5" />
        <h3 className="font-semibold text-white">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="py-8 text-center text-sm text-white/40">{emptyLabel}</p>
      ) : (
        <div className="space-y-3">
          {items.map((item, i) => (
            <div key={item.key || i}>
              <div className="mb-1 flex items-center justify-between gap-2 text-sm">
                <span className="truncate text-white/70" title={item.key}>
                  {item.key || '(none)'}
                </span>
                <span className="shrink-0 font-medium text-white">
                  {item.count.toLocaleString()}
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-white/5">
                <div
                  className="bg-brand-400/60 h-full rounded-full transition-all duration-700"
                  style={{ width: `${(item.count / max) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Inline SVG dual-series chart: view bars + visitor line (no chart lib installed)
function TrafficChart({ series }: { series: TrafficPoint[] }) {
  const W = 800
  const H = 260
  const PAD = { top: 12, right: 48, bottom: 28, left: 40 }
  const plotW = W - PAD.left - PAD.right
  const plotH = H - PAD.top - PAD.bottom

  const maxViews = Math.max(1, ...series.map((p) => p.views))
  const maxVisitors = Math.max(1, ...series.map((p) => p.visitors))
  const n = series.length
  const step = plotW / n
  const barW = Math.max(1, Math.min(18, step * 0.6))

  const xCenter = (i: number) => PAD.left + step * i + step / 2
  const yViews = (v: number) => PAD.top + plotH * (1 - v / maxViews)
  const yVisitors = (v: number) => PAD.top + plotH * (1 - v / maxVisitors)

  const visitorPath = series
    .map(
      (p, i) => `${i === 0 ? 'M' : 'L'}${xCenter(i).toFixed(1)},${yVisitors(p.visitors).toFixed(1)}`
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
      aria-label="Page views and unique visitors over time"
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
      {/* left axis (views) */}
      <text
        x={PAD.left - 6}
        y={PAD.top + 4}
        textAnchor="end"
        fontSize={10}
        fill="rgba(52,211,153,0.8)"
      >
        {maxViews.toLocaleString()}
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
      {/* right axis (visitors) */}
      <text
        x={W - PAD.right + 6}
        y={PAD.top + 4}
        textAnchor="start"
        fontSize={10}
        fill="currentColor"
        className="text-brand-400"
      >
        {maxVisitors.toLocaleString()}
      </text>
      <text
        x={W - PAD.right + 6}
        y={PAD.top + plotH + 4}
        textAnchor="start"
        fontSize={10}
        fill="rgba(255,255,255,0.35)"
      >
        0
      </text>
      {/* view bars */}
      {series.map((p, i) => (
        <rect
          key={p.date}
          x={xCenter(i) - barW / 2}
          y={yViews(p.views)}
          width={barW}
          height={Math.max(0, PAD.top + plotH - yViews(p.views))}
          rx={1.5}
          fill="rgba(52,211,153,0.45)"
        >
          <title>{`${fmtDate(p.date)} — ${p.views.toLocaleString()} views, ${p.visitors.toLocaleString()} visitors`}</title>
        </rect>
      ))}
      {/* visitor line */}
      <path
        d={visitorPath}
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
