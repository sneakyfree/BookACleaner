'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
  ScrollText,
  Clock,
  Search,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Download,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminAuditLog } from '@/hooks/use-api'
import { apiFetch } from '@/lib/auth/api-client'

interface AuditEntry {
  id: string
  event_type: string
  actor: string
  actor_role: string
  target: string
  details: string
  created_at: string
}

const eventTypeColors: Record<string, string> = {
  'user.suspended': 'text-amber-400',
  'user.created': 'text-green-400',
  'verification.approved': 'text-emerald-400',
  'content.removed': 'text-red-400',
  'dispute.resolved': 'text-blue-400',
  'job.cancelled': 'text-orange-400',
  'payment.released': 'text-purple-400',
}

export default function AdminAuditPage() {
  const { data: session } = useSession()
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [page, setPage] = useState(1)
  const [dateRange, setDateRange] = useState('all')
  const [expandedId, setExpandedId] = useState<string | null>(null)

  const {
    data: rawData,
    isLoading: loading,
    error,
    refetch,
  } = useAdminAuditLog(page, typeFilter !== 'all' ? typeFilter : undefined)

  const entries: AuditEntry[] = rawData?.items || rawData?.entries || rawData || []
  const total = rawData?.total || entries.length
  const auditHealth: { healthy: boolean; last_error?: string } | undefined = rawData?.audit

  const eventTypes = [
    'all',
    ...Array.from(new Set(entries.map((a) => (a.event_type || '').split('.')[0]).filter(Boolean))),
  ]

  const filtered = entries.filter((a) => {
    const matchSearch =
      !search ||
      (a.target || '').toLowerCase().includes(search.toLowerCase()) ||
      (a.details || '').toLowerCase().includes(search.toLowerCase())
    const matchType = typeFilter === 'all' || (a.event_type || '').startsWith(typeFilter)
    return matchSearch && matchType
  })

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
              <ScrollText className="text-brand-400 h-7 w-7" />
              Audit Log
            </h1>
            <p className="mt-1 text-white/60">{total || filtered.length} events</p>
          </div>
          <button
            onClick={() => {
              const csv =
                'Timestamp,Event,Actor,Role,Target,Details\n' +
                filtered
                  .map(
                    (e) =>
                      `"${e.created_at}","${e.event_type}","${e.actor}","${e.actor_role}","${e.target}","${e.details}"`
                  )
                  .join('\n')
              const blob = new Blob([csv], { type: 'text/csv' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = 'audit_log.csv'
              a.click()
            }}
            className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>

        {auditHealth && auditHealth.healthy === false && (
          <div className="mb-6 flex items-start gap-3 rounded-lg border-2 border-amber-500/50 bg-amber-500/10 p-4">
            <AlertCircle className="h-6 w-6 shrink-0 text-amber-400" />
            <div>
              <p className="font-semibold text-amber-300">
                Audit logging is not recording
                {auditHealth.last_error ? ` (${auditHealth.last_error})` : ''}.
              </p>
              <p className="mt-0.5 text-sm text-amber-300/80">
                Actions are succeeding but the trail is incomplete.
              </p>
            </div>
          </div>
        )}

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">
              {(error as any)?.detail || 'Failed to load audit log'}
            </p>
            <button
              onClick={() => refetch()}
              className="ml-auto text-sm font-medium text-red-400 hover:text-red-300"
            >
              Retry
            </button>
          </div>
        )}

        <div className="mb-6 flex flex-wrap gap-4">
          <div className="relative min-w-[240px] flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search target or details..."
              className="focus:ring-brand-500/50 w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2"
            />
          </div>
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="focus:ring-brand-500/50 cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 capitalize text-white focus:outline-none focus:ring-2"
          >
            {eventTypes.map((t) => (
              <option key={t} value={t}>
                {t === 'all' ? 'All Events' : t}
              </option>
            ))}
          </select>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="focus:ring-brand-500/50 cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:outline-none focus:ring-2"
          >
            <option value="all">All Time</option>
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="text-brand-400 h-8 w-8 animate-spin" />
            <span className="ml-3 text-white/60">Loading audit log...</span>
          </div>
        ) : (
          <>
            <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10 text-sm text-white/50">
                    <th className="px-6 py-4 text-left font-medium">Timestamp</th>
                    <th className="px-4 py-4 text-left font-medium">Event</th>
                    <th className="px-4 py-4 text-left font-medium">Actor</th>
                    <th className="px-4 py-4 text-left font-medium">Target</th>
                    <th className="px-4 py-4 text-left font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((entry) => (
                    <>
                      <tr
                        key={entry.id}
                        onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                        className="cursor-pointer border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                      >
                        <td className="whitespace-nowrap px-6 py-3 text-sm text-white/50">
                          {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
                        </td>
                        <td className="px-4 py-3">
                          <span
                            className={cn(
                              'font-mono text-sm',
                              eventTypeColors[entry.event_type] || 'text-white/70'
                            )}
                          >
                            {entry.event_type}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <span
                              className={cn(
                                'text-sm',
                                entry.actor_role === 'system'
                                  ? 'italic text-white/40'
                                  : 'text-white/70'
                              )}
                            >
                              {entry.actor}
                            </span>
                            <span
                              className={cn(
                                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                                entry.actor_role === 'admin'
                                  ? 'bg-purple-500/20 text-purple-400'
                                  : entry.actor_role === 'system'
                                    ? 'bg-slate-500/20 text-slate-400'
                                    : 'bg-brand-500/20 text-brand-400'
                              )}
                            >
                              {entry.actor_role}
                            </span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-white/80">{entry.target}</td>
                        <td className="px-4 py-3 text-sm text-white/50">
                          <div className="flex items-center gap-2">
                            <span className="max-w-[250px] truncate">{entry.details}</span>
                            <ChevronDown
                              className={cn(
                                'h-3.5 w-3.5 shrink-0 text-white/30 transition-transform',
                                expandedId === entry.id && 'rotate-180'
                              )}
                            />
                          </div>
                        </td>
                      </tr>
                      {expandedId === entry.id && (
                        <tr key={`${entry.id}-detail`} className="border-b border-white/5">
                          <td colSpan={5} className="bg-white/[0.02] px-6 py-4">
                            <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
                              <div>
                                <span className="text-xs uppercase tracking-wider text-white/40">
                                  Event
                                </span>
                                <p
                                  className={cn(
                                    'mt-1 font-mono',
                                    eventTypeColors[entry.event_type] || 'text-white/70'
                                  )}
                                >
                                  {entry.event_type}
                                </p>
                              </div>
                              <div>
                                <span className="text-xs uppercase tracking-wider text-white/40">
                                  Actor
                                </span>
                                <p className="mt-1 text-white">
                                  {entry.actor} ({entry.actor_role})
                                </p>
                              </div>
                              <div>
                                <span className="text-xs uppercase tracking-wider text-white/40">
                                  Target
                                </span>
                                <p className="mt-1 text-white">{entry.target}</p>
                              </div>
                              <div>
                                <span className="text-xs uppercase tracking-wider text-white/40">
                                  Time
                                </span>
                                <p className="mt-1 text-white">
                                  {entry.created_at
                                    ? new Date(entry.created_at).toLocaleString()
                                    : '—'}
                                </p>
                              </div>
                            </div>
                            <div className="mt-3 rounded-lg bg-black/20 p-3">
                              <span className="text-xs uppercase tracking-wider text-white/40">
                                Full Details
                              </span>
                              <p className="mt-1 whitespace-pre-wrap text-sm text-white/80">
                                {entry.details || 'No additional details'}
                              </p>
                            </div>
                            <div className="mt-2 flex justify-end">
                              <button
                                onClick={async (e) => {
                                  e.stopPropagation()
                                  try {
                                    const data = await apiFetch(`/api/v1/explain/audit/${entry.id}`)
                                    const el = document.getElementById(`snapshot-${entry.id}`)
                                    if (el) el.textContent = JSON.stringify(data, null, 2)
                                  } catch {
                                    /* snapshot unavailable */
                                  }
                                }}
                                className="text-brand-400 hover:text-brand-300 flex items-center gap-1 text-xs"
                              >
                                📸 View Snapshot
                              </button>
                            </div>
                            <pre
                              id={`snapshot-${entry.id}`}
                              className="mt-1 max-h-32 overflow-auto text-[10px] text-white/50"
                            />
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
              {filtered.length === 0 && (
                <div className="py-12 text-center text-white/40">
                  No audit entries match your filters
                </div>
              )}
            </div>

            {total > 50 && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/60 hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-white/60">
                  Page {page} of {Math.ceil(total / 50)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / 50)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/60 hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}
