'use client'

import { useState } from 'react'
import {
    Briefcase, Clock, CheckCircle2, XCircle, Play, AlertTriangle,
    Loader2, AlertCircle, Search, ChevronDown, ExternalLink, User, MapPin
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminJobs } from '@/hooks/use-api'

interface AdminJob {
    id: string
    title: string
    status: string
    total_price: number
    scheduled_date: string
    scheduled_time?: string
    address?: string
    city?: string
    client_name?: string
    cleaner_name?: string
    services: string[]
    created_at: string
}

const statusConfig: Record<string, { color: string; bg: string; icon: typeof Clock }> = {
    pending: { color: 'text-amber-400', bg: 'bg-amber-500/20', icon: Clock },
    accepted: { color: 'text-blue-400', bg: 'bg-blue-500/20', icon: CheckCircle2 },
    in_progress: { color: 'text-cyan-400', bg: 'bg-cyan-500/20', icon: Play },
    completed: { color: 'text-green-400', bg: 'bg-green-500/20', icon: CheckCircle2 },
    cancelled: { color: 'text-red-400', bg: 'bg-red-500/20', icon: XCircle },
    disputed: { color: 'text-orange-400', bg: 'bg-orange-500/20', icon: AlertTriangle },
}

export default function AdminJobsPage() {
    const [statusFilter, setStatusFilter] = useState('all')
    const [search, setSearch] = useState('')
    const [expandedId, setExpandedId] = useState<string | null>(null)

    const { data: rawData, isLoading: loading, error, refetch } = useAdminJobs(1, statusFilter !== 'all' ? statusFilter : undefined)

    const filtered: AdminJob[] = rawData?.jobs || rawData?.items || rawData || []

    const formatDate = (d: string) => {
        const date = new Date(d)
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    const timeAgo = (d: string) => {
        const mins = Math.floor((Date.now() - new Date(d).getTime()) / 60000)
        if (mins < 60) return `${mins}m ago`
        if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
        return `${Math.floor(mins / 1440)}d ago`
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Briefcase className="w-7 h-7 text-brand-400" />
                            Jobs Management
                        </h1>
                        <p className="text-white/60 mt-1">
                            {filtered.length} jobs {statusFilter !== 'all' ? `(${statusFilter})` : 'total'}
                        </p>
                    </div>
                </div>

                {/* Filters */}
                <div className="flex flex-wrap items-center gap-4 mb-6">
                    <div className="relative flex-1 max-w-sm">
                        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
                        <input
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                            placeholder="Search jobs..."
                            className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/50"
                        />
                    </div>
                    <div className="flex gap-1 p-1 rounded-lg bg-white/5">
                        {['all', 'pending', 'in_progress', 'completed', 'cancelled', 'disputed'].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={cn('px-3 py-1.5 rounded-md text-sm transition-colors capitalize',
                                    statusFilter === s ? 'bg-brand-500 text-white' : 'text-white/60 hover:text-white')}>
                                {s === 'in_progress' ? 'In Progress' : s}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-red-300 text-sm">{(error as any)?.detail || 'Failed to load jobs'}</p>
                        <button onClick={() => refetch()} className="ml-auto text-red-400 hover:text-red-300 text-sm font-medium">Retry</button>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                        <span className="ml-3 text-white/60">Loading jobs...</span>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {filtered.map(job => {
                            const cfg = statusConfig[job.status] || statusConfig.pending
                            const StatusIcon = cfg.icon
                            const isExpanded = expandedId === job.id
                            return (
                                <div key={job.id} className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
                                    <button
                                        onClick={() => setExpandedId(isExpanded ? null : job.id)}
                                        className="w-full text-left p-4 flex items-center justify-between hover:bg-white/[0.03] transition-colors"
                                    >
                                        <div className="flex items-center gap-4 flex-1 min-w-0">
                                            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
                                                <StatusIcon className={cn('w-4 h-4', cfg.color)} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className="text-white font-medium truncate">{job.title || `Job ${job.id.slice(0, 8)}`}</p>
                                                <p className="text-white/40 text-sm">{formatDate(job.scheduled_date)} {job.scheduled_time ? `at ${job.scheduled_time}` : ''}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-green-400 font-semibold">${job.total_price}</span>
                                            <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', cfg.bg, cfg.color)}>
                                                {job.status.replace('_', ' ')}
                                            </span>
                                            <ChevronDown className={cn('w-4 h-4 text-white/40 transition-transform', isExpanded && 'rotate-180')} />
                                        </div>
                                    </button>
                                    {isExpanded && (
                                        <div className="px-4 pb-4 border-t border-white/5 pt-3">
                                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                                <div>
                                                    <span className="text-white/40 text-xs uppercase">Client</span>
                                                    <p className="text-white flex items-center gap-1 mt-0.5">
                                                        <User className="w-3 h-3" /> {job.client_name || '—'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-white/40 text-xs uppercase">Cleaner</span>
                                                    <p className="text-white flex items-center gap-1 mt-0.5">
                                                        <User className="w-3 h-3" /> {job.cleaner_name || 'Unassigned'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-white/40 text-xs uppercase">Location</span>
                                                    <p className="text-white flex items-center gap-1 mt-0.5">
                                                        <MapPin className="w-3 h-3" /> {job.city || job.address || '—'}
                                                    </p>
                                                </div>
                                                <div>
                                                    <span className="text-white/40 text-xs uppercase">Created</span>
                                                    <p className="text-white mt-0.5">{job.created_at ? timeAgo(job.created_at) : '—'}</p>
                                                </div>
                                            </div>
                                            {job.services && job.services.length > 0 && (
                                                <div className="mt-3 flex items-center gap-2 flex-wrap">
                                                    {job.services.map(s => (
                                                        <span key={s} className="px-2 py-0.5 rounded-full text-[10px] bg-white/10 text-white/60 capitalize">{s.replace(/_/g, ' ')}</span>
                                                    ))}
                                                </div>
                                            )}
                                            <div className="mt-3 flex justify-end">
                                                <a href={`/client/bookings/${job.id}`} className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1">
                                                    <ExternalLink className="w-3 h-3" /> View Details
                                                </a>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )
                        })}
                        {filtered.length === 0 && (
                            <div className="py-16 text-center text-white/40">
                                <Briefcase className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                <p>No jobs found</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
