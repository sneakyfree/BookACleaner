'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
    CheckSquare, Clock, Brain, ChevronRight, CheckCircle2,
    XCircle, AlertCircle, Zap, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminApprovals } from '@/hooks/use-api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/auth/api-client'

interface HITLItem {
    id: string
    type: string
    entity_type: string
    entity_id: string
    reason: string
    priority: string
    context: Record<string, any>
    status: string
    requested_by: string | null
    reviewed_by: string | null
    review_notes: string | null
    created_at: string
}

const typeColors: Record<string, string> = {
    verification: 'bg-amber-500/20 text-amber-400',
    payout: 'bg-green-500/20 text-green-400',
    dispute: 'bg-red-500/20 text-red-400',
    account_deletion: 'bg-purple-500/20 text-purple-400',
    high_value_job: 'bg-blue-500/20 text-blue-400',
    background_check: 'bg-orange-500/20 text-orange-400',
}

const priorityColors: Record<string, string> = {
    critical: 'text-red-400',
    high: 'text-orange-400',
    medium: 'text-amber-400',
    low: 'text-white/50',
}

export default function AdminApprovalsPage() {
    const { data: session } = useSession()
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [reviewNotes, setReviewNotes] = useState('')

    const { data: rawData, isLoading: loading, error, refetch } = useAdminApprovals()
    const queryClient = useQueryClient()

    const items: HITLItem[] = rawData?.items || rawData || []
    const selected = items.find(i => i.id === selectedId)

    const decisionMut = useMutation({
        mutationFn: ({ id, approved, notes }: { id: string; approved: boolean; notes: string }) => {
            const userId = (session as any)?.user?.id || 'admin'
            return apiFetch(`/api/v1/hitl/queue/${id}?admin_id=${userId}`, {
                method: 'POST',
                body: JSON.stringify({ approved, notes: notes || null }),
            })
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'approvals'] })
            setSelectedId(null)
            setReviewNotes('')
        },
    })

    const handleDecision = (id: string, approved: boolean) => {
        decisionMut.mutate({ id, approved, notes: reviewNotes })
    }
    const actionLoading = decisionMut.isPending

    const pendingCount = items.filter(i => i.status === 'pending').length
    const approvedCount = items.filter(i => i.status === 'approved').length
    const rejectedCount = items.filter(i => i.status === 'rejected').length
    const totalDecided = approvedCount + rejectedCount
    const approvalRate = totalDecided > 0 ? Math.round((approvedCount / totalDecided) * 100) : 0

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-6xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Brain className="w-7 h-7 text-brand-400" />
                            HITL Approval Queue
                        </h1>
                        <p className="text-white/60 mt-1">{pendingCount} decisions awaiting human review</p>
                    </div>
                </div>

                {/* Stats Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                    <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4">
                        <p className="text-amber-400/60 text-xs uppercase tracking-wider">Pending</p>
                        <p className="text-2xl font-bold text-amber-400 mt-1">{pendingCount}</p>
                    </div>
                    <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                        <p className="text-green-400/60 text-xs uppercase tracking-wider">Approved</p>
                        <p className="text-2xl font-bold text-green-400 mt-1">{approvedCount}</p>
                    </div>
                    <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                        <p className="text-red-400/60 text-xs uppercase tracking-wider">Rejected</p>
                        <p className="text-2xl font-bold text-red-400 mt-1">{rejectedCount}</p>
                    </div>
                    <div className="bg-brand-500/10 border border-brand-500/20 rounded-xl p-4">
                        <p className="text-brand-400/60 text-xs uppercase tracking-wider">Approval Rate</p>
                        <p className="text-2xl font-bold text-brand-400 mt-1">{approvalRate}%</p>
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-red-300 text-sm">{(error as any)?.detail || 'Failed to load approval queue'}</p>
                        <button onClick={() => refetch()} className="ml-auto text-red-400 hover:text-red-300 text-sm font-medium">Retry</button>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                        <span className="ml-3 text-white/60">Loading approval queue...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                        <div className="lg:col-span-3 space-y-3">
                            {items.map(item => (
                                <button key={item.id} onClick={() => setSelectedId(item.id)}
                                    className={cn('w-full text-left bg-white/5 rounded-xl border p-5 transition-all hover:bg-white/[0.08]',
                                        selectedId === item.id ? 'border-brand-500/50 ring-1 ring-brand-500/20' : 'border-white/10',
                                        item.status !== 'pending' && 'opacity-60')}>
                                    <div className="flex items-start justify-between mb-2">
                                        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', typeColors[item.type] || 'bg-white/10 text-white/60')}>
                                            {item.type.replace(/_/g, ' ')}
                                        </span>
                                        <div className="flex items-center gap-2">
                                            <span className={cn('text-xs font-medium capitalize', priorityColors[item.priority] || 'text-white/50')}>
                                                {item.priority}
                                            </span>
                                            {item.status !== 'pending' && (
                                                <span className={cn('text-xs font-medium capitalize',
                                                    item.status === 'approved' ? 'text-green-400' : item.status === 'rejected' ? 'text-red-400' : 'text-amber-400')}>
                                                    {item.status}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <p className="text-white font-medium text-sm">{item.reason}</p>
                                    <p className="text-white/40 text-xs mt-1">
                                        {item.entity_type} · {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                                    </p>
                                </button>
                            ))}
                            {items.length === 0 && (
                                <div className="py-16 text-center text-white/40">
                                    <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                    <p>No items in approval queue</p>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-2">
                            {selected ? (
                                <div className="bg-white/5 rounded-xl border border-white/10 p-6 sticky top-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Review Decision</h3>

                                    <div className="space-y-4 mb-6">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium', typeColors[selected.type] || 'bg-white/10 text-white/60')}>
                                                {selected.type.replace(/_/g, ' ')}
                                            </span>
                                            <span className={cn('text-xs font-medium capitalize', priorityColors[selected.priority])}>
                                                {selected.priority} priority
                                            </span>
                                        </div>
                                        <div>
                                            <label className="text-white/40 text-xs uppercase tracking-wider">Reason</label>
                                            <div className="mt-1 bg-brand-500/10 border border-brand-500/20 rounded-lg p-3">
                                                <p className="text-brand-300 text-sm">{selected.reason}</p>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-white/40 text-xs uppercase tracking-wider">Entity</label>
                                                <p className="text-white text-sm mt-1">{selected.entity_type}</p>
                                            </div>
                                            <div>
                                                <label className="text-white/40 text-xs uppercase tracking-wider">Submitted</label>
                                                <p className="text-white text-sm mt-1">
                                                    {selected.created_at ? (() => {
                                                        const mins = Math.floor((Date.now() - new Date(selected.created_at).getTime()) / 60000)
                                                        if (mins < 60) return `${mins}m ago`
                                                        if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
                                                        return `${Math.floor(mins / 1440)}d ago`
                                                    })() : '—'}
                                                </p>
                                            </div>
                                        </div>
                                        {selected.requested_by && (
                                            <div>
                                                <label className="text-white/40 text-xs uppercase tracking-wider">Requested By</label>
                                                <p className="text-white text-sm mt-1">{selected.requested_by}</p>
                                            </div>
                                        )}
                                        {selected.context && Object.keys(selected.context).length > 0 && (
                                            <div>
                                                <label className="text-white/40 text-xs uppercase tracking-wider mb-2 block">Context</label>
                                                <div className="bg-black/20 rounded-lg p-3 space-y-1.5">
                                                    {Object.entries(selected.context).map(([k, v]) => (
                                                        <div key={k} className="flex justify-between text-sm">
                                                            <span className="text-white/50 capitalize">{k}</span>
                                                            <span className="text-white text-right max-w-[180px] truncate">{String(v)}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {selected.status === 'pending' && (
                                        <div className="space-y-2">
                                            <textarea
                                                value={reviewNotes}
                                                onChange={e => setReviewNotes(e.target.value)}
                                                placeholder="Review notes (optional)..."
                                                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-brand-500/50 resize-none mb-2"
                                                rows={2}
                                            />
                                            <button onClick={() => handleDecision(selected.id, true)}
                                                disabled={actionLoading}
                                                className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                Approve
                                            </button>
                                            <button onClick={() => handleDecision(selected.id, false)}
                                                disabled={actionLoading}
                                                className="w-full px-4 py-2.5 bg-red-600/80 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                                                <XCircle className="w-4 h-4" /> Reject
                                            </button>
                                        </div>
                                    )}

                                    {selected.status !== 'pending' && (
                                        <div className={cn(
                                            'px-4 py-3 rounded-lg text-sm font-medium text-center',
                                            selected.status === 'approved' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                        )}>
                                            {selected.status === 'approved' ? 'Approved' : 'Rejected'}
                                            {selected.review_notes && (
                                                <p className="text-white/50 text-xs mt-1">{selected.review_notes}</p>
                                            )}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white/5 rounded-xl border border-white/10 p-6 text-center text-white/40">
                                    <Brain className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                    <p>Select an item to review</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
