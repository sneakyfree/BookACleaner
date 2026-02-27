'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import { ScrollText, Clock, Search, Loader2, AlertCircle, ChevronLeft, ChevronRight, ChevronDown, Download } from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
    const [entries, setEntries] = useState<AuditEntry[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('all')
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [dateRange, setDateRange] = useState('all')
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const fetchAudit = useCallback(async () => {
        const token = (session as any)?.accessToken
        if (!token) return

        try {
            setLoading(true)
            setError('')
            const params = new URLSearchParams({ page: String(page), limit: '50' })
            if (typeFilter !== 'all') params.set('event_type', typeFilter)
            if (search) params.set('search', search)
            if (dateRange !== 'all') {
                const days = parseInt(dateRange)
                const from = new Date(Date.now() - days * 86400000).toISOString()
                params.set('date_from', from)
            }

            const res = await fetch(`${API_URL}/api/v1/admin/audit?${params}`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error(`Failed to load audit log (${res.status})`)
            const data = await res.json()
            setEntries(data.items || data.entries || data || [])
            setTotal(data.total || 0)
        } catch (err: any) {
            setError(err.message || 'Failed to load audit log')
        } finally {
            setLoading(false)
        }
    }, [session, page, typeFilter, search, dateRange])

    useEffect(() => {
        if (session) fetchAudit()
    }, [session, fetchAudit])

    const eventTypes = ['all', ...Array.from(new Set(entries.map(a => (a.event_type || '').split('.')[0]).filter(Boolean)))]

    const filtered = entries.filter(a => {
        const matchSearch = !search || (a.target || '').toLowerCase().includes(search.toLowerCase()) || (a.details || '').toLowerCase().includes(search.toLowerCase())
        const matchType = typeFilter === 'all' || (a.event_type || '').startsWith(typeFilter)
        return matchSearch && matchType
    })

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <ScrollText className="w-7 h-7 text-brand-400" />
                            Audit Log
                        </h1>
                        <p className="text-white/60 mt-1">{total || filtered.length} events</p>
                    </div>
                    <button
                        onClick={() => {
                            const csv = 'Timestamp,Event,Actor,Role,Target,Details\n' + filtered.map(e => `"${e.created_at}","${e.event_type}","${e.actor}","${e.actor_role}","${e.target}","${e.details}"`).join('\n')
                            const blob = new Blob([csv], { type: 'text/csv' })
                            const url = URL.createObjectURL(blob)
                            const a = document.createElement('a'); a.href = url; a.download = 'audit_log.csv'; a.click()
                        }}
                        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-lg text-sm font-medium flex items-center gap-2 transition"
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-red-300 text-sm">{error}</p>
                        <button onClick={fetchAudit} className="ml-auto text-red-400 hover:text-red-300 text-sm font-medium">Retry</button>
                    </div>
                )}

                <div className="flex flex-wrap gap-4 mb-6">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search target or details..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                        />
                    </div>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50 capitalize">
                        {eventTypes.map(t => (
                            <option key={t} value={t}>{t === 'all' ? 'All Events' : t}</option>
                        ))}
                    </select>
                    <select value={dateRange} onChange={e => setDateRange(e.target.value)}
                        className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50">
                        <option value="all">All Time</option>
                        <option value="7">Last 7 days</option>
                        <option value="30">Last 30 days</option>
                        <option value="90">Last 90 days</option>
                    </select>
                </div>

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                        <span className="ml-3 text-white/60">Loading audit log...</span>
                    </div>
                ) : (
                    <>
                        <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                            <table className="w-full">
                                <thead>
                                    <tr className="text-white/50 text-sm border-b border-white/10">
                                        <th className="text-left py-4 px-6 font-medium">Timestamp</th>
                                        <th className="text-left py-4 px-4 font-medium">Event</th>
                                        <th className="text-left py-4 px-4 font-medium">Actor</th>
                                        <th className="text-left py-4 px-4 font-medium">Target</th>
                                        <th className="text-left py-4 px-4 font-medium">Details</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {filtered.map(entry => (
                                        <>
                                            <tr key={entry.id}
                                                onClick={() => setExpandedId(expandedId === entry.id ? null : entry.id)}
                                                className="border-b border-white/5 hover:bg-white/[0.02] transition-colors cursor-pointer">
                                                <td className="py-3 px-6 text-white/50 text-sm whitespace-nowrap">
                                                    {entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}
                                                </td>
                                                <td className="py-3 px-4">
                                                    <span className={cn('text-sm font-mono', eventTypeColors[entry.event_type] || 'text-white/70')}>
                                                        {entry.event_type}
                                                    </span>
                                                </td>
                                                <td className="py-3 px-4">
                                                    <div className="flex items-center gap-2">
                                                        <span className={cn('text-sm', entry.actor_role === 'system' ? 'text-white/40 italic' : 'text-white/70')}>
                                                            {entry.actor}
                                                        </span>
                                                        <span className={cn('px-1.5 py-0.5 rounded text-[10px] font-medium',
                                                            entry.actor_role === 'admin' ? 'bg-purple-500/20 text-purple-400'
                                                                : entry.actor_role === 'system' ? 'bg-slate-500/20 text-slate-400'
                                                                    : 'bg-brand-500/20 text-brand-400')}>
                                                            {entry.actor_role}
                                                        </span>
                                                    </div>
                                                </td>
                                                <td className="py-3 px-4 text-white/80 text-sm">{entry.target}</td>
                                                <td className="py-3 px-4 text-white/50 text-sm">
                                                    <div className="flex items-center gap-2">
                                                        <span className="max-w-[250px] truncate">{entry.details}</span>
                                                        <ChevronDown className={cn('w-3.5 h-3.5 text-white/30 transition-transform shrink-0',
                                                            expandedId === entry.id && 'rotate-180')} />
                                                    </div>
                                                </td>
                                            </tr>
                                            {expandedId === entry.id && (
                                                <tr key={`${entry.id}-detail`} className="border-b border-white/5">
                                                    <td colSpan={5} className="px-6 py-4 bg-white/[0.02]">
                                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                            <div>
                                                                <span className="text-white/40 text-xs uppercase tracking-wider">Event</span>
                                                                <p className={cn('mt-1 font-mono', eventTypeColors[entry.event_type] || 'text-white/70')}>{entry.event_type}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-white/40 text-xs uppercase tracking-wider">Actor</span>
                                                                <p className="text-white mt-1">{entry.actor} ({entry.actor_role})</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-white/40 text-xs uppercase tracking-wider">Target</span>
                                                                <p className="text-white mt-1">{entry.target}</p>
                                                            </div>
                                                            <div>
                                                                <span className="text-white/40 text-xs uppercase tracking-wider">Time</span>
                                                                <p className="text-white mt-1">{entry.created_at ? new Date(entry.created_at).toLocaleString() : '—'}</p>
                                                            </div>
                                                        </div>
                                                        <div className="mt-3 p-3 bg-black/20 rounded-lg">
                                                            <span className="text-white/40 text-xs uppercase tracking-wider">Full Details</span>
                                                            <p className="text-white/80 text-sm mt-1 whitespace-pre-wrap">{entry.details || 'No additional details'}</p>
                                                        </div>
                                                    </td>
                                                </tr>
                                            )}
                                        </>
                                    ))}
                                </tbody>
                            </table>
                            {filtered.length === 0 && (
                                <div className="py-12 text-center text-white/40">No audit entries match your filters</div>
                            )}
                        </div>

                        {total > 50 && (
                            <div className="flex items-center justify-center gap-4 mt-6">
                                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
                                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-30">
                                    <ChevronLeft className="w-4 h-4" />
                                </button>
                                <span className="text-white/60 text-sm">Page {page} of {Math.ceil(total / 50)}</span>
                                <button onClick={() => setPage(p => p + 1)} disabled={page >= Math.ceil(total / 50)}
                                    className="px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white/60 hover:bg-white/10 disabled:opacity-30">
                                    <ChevronRight className="w-4 h-4" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    )
}
