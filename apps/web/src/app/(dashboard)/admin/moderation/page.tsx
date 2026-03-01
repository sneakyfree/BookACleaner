'use client'

import { useState } from 'react'
import {
    Flag, Eye, Trash2, AlertTriangle, MessageSquare, Star,
    CheckCircle2, XCircle, Clock, ChevronDown, Loader2, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminModeration } from '@/hooks/use-api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/auth/api-client'

interface FlaggedItem {
    id: string
    content_type: string
    content_id: string
    flagged_by: string
    flagged_by_name?: string
    reason: string
    details: string
    status: string
    content?: string
    created_at: string
}

const reasonColors: Record<string, string> = {
    spam: 'bg-yellow-500/20 text-yellow-400',
    harassment: 'bg-red-500/20 text-red-400',
    fraud: 'bg-orange-500/20 text-orange-400',
    inappropriate: 'bg-pink-500/20 text-pink-400',
    other: 'bg-gray-500/20 text-gray-400',
}

const typeIcons: Record<string, typeof Star> = {
    review: Star,
    message: MessageSquare,
    feed: Flag,
}

export default function AdminModerationPage() {
    const [statusFilter, setStatusFilter] = useState<string>('pending')
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const { data: rawData, isLoading: loading, error, refetch } = useAdminModeration(1, statusFilter !== 'all' ? statusFilter : undefined)
    const queryClient = useQueryClient()

    const items: FlaggedItem[] = rawData?.items || rawData || []

    const actionMut = useMutation({
        mutationFn: ({ id, action }: { id: string; action: 'remove' | 'dismiss' }) =>
            apiFetch(`/api/v1/moderation/flagged/${id}/review?action=${action}`, { method: 'POST' }),
        onMutate: ({ id }) => setActionLoading(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'moderation'] })
        },
        onSettled: () => setActionLoading(null),
    })

    const handleAction = (id: string, action: 'remove' | 'dismiss') => {
        actionMut.mutate({ id, action })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Flag className="w-7 h-7 text-brand-400" />
                            Content Moderation
                        </h1>
                        <p className="text-white/60 mt-1">
                            {items.filter(i => i.status === 'pending').length} items pending review
                        </p>
                    </div>
                    <div className="flex gap-1 p-1 rounded-lg bg-white/5">
                        {['pending', 'removed', 'dismissed', 'all'].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={cn('px-3 py-1.5 rounded-md text-sm transition-colors capitalize',
                                    statusFilter === s ? 'bg-brand-500 text-white' : 'text-white/60 hover:text-white')}>
                                {s}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Error Banner */}
                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-red-300 text-sm">{(error as any)?.detail || 'Failed to load flagged content'}</p>
                        <button onClick={() => refetch()} className="ml-auto text-red-400 hover:text-red-300 text-sm font-medium">Retry</button>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                        <span className="ml-3 text-white/60">Loading flagged content...</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {items.map(item => {
                            const TypeIcon = typeIcons[item.content_type] || Flag
                            return (
                                <div key={item.id} className="bg-white/5 rounded-xl border border-white/10 p-6">
                                    <div className="flex items-start justify-between mb-3">
                                        <div className="flex items-center gap-3">
                                            <TypeIcon className="w-5 h-5 text-white/50" />
                                            <span className="text-white/60 text-sm capitalize">{item.content_type}</span>
                                            <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', reasonColors[item.reason])}>
                                                {item.reason}
                                            </span>
                                        </div>
                                        <span className="text-white/40 text-sm">
                                            {item.created_at ? new Date(item.created_at).toLocaleDateString() : '—'}
                                        </span>
                                    </div>

                                    {item.details && (
                                        <div className="bg-black/20 rounded-lg p-4 mb-4 border-l-2 border-red-500/50">
                                            <p className="text-white/80 text-sm italic">&quot;{item.details}&quot;</p>
                                        </div>
                                    )}

                                    <p className="text-white/50 text-sm mb-4">
                                        <strong className="text-white/70">Reported by:</strong> {item.flagged_by_name || item.flagged_by || 'Unknown'}
                                    </p>

                                    {item.status === 'pending' ? (
                                        <div className="flex gap-3">
                                            <button onClick={() => handleAction(item.id, 'remove')}
                                                disabled={actionLoading === item.id}
                                                className="px-4 py-2 bg-red-600/80 hover:bg-red-500 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                                {actionLoading === item.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                                                Remove Content
                                            </button>
                                            <button onClick={() => handleAction(item.id, 'dismiss')}
                                                disabled={actionLoading === item.id}
                                                className="px-4 py-2 bg-white/10 hover:bg-white/20 disabled:opacity-50 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                                <CheckCircle2 className="w-3.5 h-3.5" /> Dismiss Report
                                            </button>
                                        </div>
                                    ) : (
                                        <span className={cn('text-sm font-medium capitalize',
                                            item.status === 'removed' ? 'text-red-400' : 'text-green-400')}>
                                            {item.status}
                                        </span>
                                    )}
                                </div>
                            )
                        })}
                        {items.length === 0 && (
                            <div className="py-16 text-center text-white/40">
                                <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                <p>No flagged content in this queue</p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    )
}
