'use client'

import { useState } from 'react'
import { ScrollText, Filter, Clock, User, ArrowRight, Search } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Admin Audit Log Viewer — G8
 * Time-sorted log of all admin and system actions
 */

interface AuditEntry {
    id: string
    eventType: string
    actor: string
    actorRole: string
    target: string
    details: string
    createdAt: string
}

const mockAudit: AuditEntry[] = [
    { id: 'a1', eventType: 'user.suspended', actor: 'admin@bookacleaner.ai', actorRole: 'admin', target: 'david@example.com', details: 'Suspended for repeated late cancellations', createdAt: '2026-02-10T14:30:00' },
    { id: 'a2', eventType: 'verification.approved', actor: 'admin@bookacleaner.ai', actorRole: 'admin', target: 'maria@example.com', details: 'IICRC certification verified', createdAt: '2026-02-10T13:15:00' },
    { id: 'a3', eventType: 'content.removed', actor: 'admin@bookacleaner.ai', actorRole: 'admin', target: 'review-r1234', details: 'Review flagged as spam — removed', createdAt: '2026-02-10T11:00:00' },
    { id: 'a4', eventType: 'dispute.resolved', actor: 'admin@bookacleaner.ai', actorRole: 'admin', target: 'dispute-d567', details: 'Refund issued to client, warning to cleaner', createdAt: '2026-02-09T16:45:00' },
    { id: 'a5', eventType: 'job.cancelled', actor: 'system', actorRole: 'system', target: 'job-j892', details: 'Auto-cancelled: no cleaner accepted within 48h', createdAt: '2026-02-09T08:00:00' },
    { id: 'a6', eventType: 'payment.released', actor: 'system', actorRole: 'system', target: 'payment-p341', details: 'Escrow released after completion confirmation', createdAt: '2026-02-08T20:30:00' },
    { id: 'a7', eventType: 'user.created', actor: 'system', actorRole: 'system', target: 'newuser@example.com', details: 'New client registered via Google OAuth', createdAt: '2026-02-08T10:15:00' },
]

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
    const [search, setSearch] = useState('')
    const [typeFilter, setTypeFilter] = useState<string>('all')

    const eventTypes = ['all', ...Array.from(new Set(mockAudit.map(a => a.eventType.split('.')[0])))]

    const filtered = mockAudit.filter(a => {
        const matchSearch = !search || a.target.toLowerCase().includes(search.toLowerCase()) || a.details.toLowerCase().includes(search.toLowerCase())
        const matchType = typeFilter === 'all' || a.eventType.startsWith(typeFilter)
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
                        <p className="text-white/60 mt-1">{filtered.length} events</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 mb-6">
                    <div className="relative flex-1 min-w-[240px]">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
                        <input value={search} onChange={e => setSearch(e.target.value)}
                            placeholder="Search target or details..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/50" />
                    </div>
                    <select value={typeFilter} onChange={e => setTypeFilter(e.target.value)}
                        className="px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-brand-500/50 capitalize">
                        {eventTypes.map(t => (
                            <option key={t} value={t}>{t === 'all' ? 'All Events' : t}</option>
                        ))}
                    </select>
                </div>

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
                                <tr key={entry.id} className="border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                                    <td className="py-3 px-6 text-white/50 text-sm whitespace-nowrap">
                                        {new Date(entry.createdAt).toLocaleString()}
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={cn('text-sm font-mono', eventTypeColors[entry.eventType] || 'text-white/70')}>
                                            {entry.eventType}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={cn('text-sm', entry.actorRole === 'system' ? 'text-white/40 italic' : 'text-white/70')}>
                                            {entry.actor}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-white/80 text-sm">{entry.target}</td>
                                    <td className="py-3 px-4 text-white/50 text-sm max-w-[300px] truncate">{entry.details}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {filtered.length === 0 && (
                        <div className="py-12 text-center text-white/40">No audit entries match your filters</div>
                    )}
                </div>
            </div>
        </div>
    )
}
