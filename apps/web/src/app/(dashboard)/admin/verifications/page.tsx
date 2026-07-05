'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import {
    Shield, ShieldCheck, ShieldAlert, FileText, Eye, CheckCircle2,
    XCircle, Clock, User, Loader2, AlertCircle, ExternalLink, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAdminVerifications } from '@/hooks/use-api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/auth/api-client'

interface VerificationItem {
    id: string
    user_id: string
    user_name?: string
    user_email?: string
    verification_type: string
    status: string
    document_url: string | null
    extracted_data: Record<string, string> | null
    created_at: string
    current_tier?: number
}

const typeLabels: Record<string, string> = {
    id: 'Government ID',
    business_license: 'Business License',
    insurance: 'Insurance Certificate',
    iicrc: 'IICRC Certification',
    epa: 'EPA Certification',
    osha: 'OSHA Certification',
    background_check: 'Background Check',
    phone: 'Phone Verification',
    email: 'Email Verification',
}

const statusConfig: Record<string, { color: string; icon: typeof Clock }> = {
    pending: { color: 'text-amber-400', icon: Clock },
    in_review: { color: 'text-blue-400', icon: Eye },
    verified: { color: 'text-green-400', icon: CheckCircle2 },
    rejected: { color: 'text-red-400', icon: XCircle },
}

export default function AdminVerificationsPage() {
    const { data: session } = useSession()
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('pending')
    const [aiVerdict, setAiVerdict] = useState<any>(null)
    const [aiVerifying, setAiVerifying] = useState(false)

    const { data: rawData, isLoading: loading, error, refetch } = useAdminVerifications(1, statusFilter !== 'all' ? statusFilter : undefined)
    const queryClient = useQueryClient()

    const verifications: VerificationItem[] = rawData?.verifications || rawData?.items || rawData || []
    const selected = verifications.find(v => v.id === selectedId)

    const approveMut = useMutation({
        mutationFn: (id: string) =>
            apiFetch(`/api/v1/admin/verifications/${id}/approve`, { method: 'POST' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] })
            setSelectedId(null)
        },
    })

    const rejectMut = useMutation({
        mutationFn: ({ id, reason }: { id: string; reason: string }) =>
            apiFetch(`/api/v1/admin/verifications/${id}/reject`, {
                method: 'POST',
                body: JSON.stringify({ reason }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin', 'verifications'] })
            setRejectReason('')
            setSelectedId(null)
        },
    })

    const handleApprove = (id: string) => approveMut.mutate(id)
    const handleReject = (id: string) => {
        if (!rejectReason.trim()) return
        rejectMut.mutate({ id, reason: rejectReason })
    }
    const actionLoading = approveMut.isPending || rejectMut.isPending

    const filtered = verifications.filter(v => statusFilter === 'all' || v.status === statusFilter)

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Shield className="w-7 h-7 text-brand-400" />
                            Verification Queue
                        </h1>
                        <p className="text-white/60 mt-1">
                            {filtered.filter(v => v.status === 'pending').length} pending reviews
                        </p>
                    </div>
                    <div className="flex gap-1 p-1 rounded-lg bg-white/5">
                        {['pending', 'in_review', 'verified', 'rejected', 'all'].map(s => (
                            <button key={s} onClick={() => setStatusFilter(s)}
                                className={cn('px-3 py-1.5 rounded-md text-sm transition-colors capitalize',
                                    statusFilter === s ? 'bg-brand-500 text-white' : 'text-white/60 hover:text-white')}>
                                {s === 'in_review' ? 'In Review' : s}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-red-300 text-sm">{(error as any)?.detail || 'Failed to load verification queue'}</p>
                        <button onClick={() => refetch()} className="ml-auto text-red-400 hover:text-red-300 text-sm font-medium">Retry</button>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                        <span className="ml-3 text-white/60">Loading verification queue...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        <div className="lg:col-span-2 space-y-3">
                            {filtered.map(v => {
                                const StatusIcon = statusConfig[v.status]?.icon || Clock
                                return (
                                    <button key={v.id} onClick={() => setSelectedId(v.id)}
                                        className={cn('w-full text-left bg-white/5 rounded-xl border p-4 transition-all hover:bg-white/[0.08]',
                                            selectedId === v.id ? 'border-brand-500/50 ring-1 ring-brand-500/20' : 'border-white/10')}>
                                        <div className="flex items-start justify-between">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                                    <User className="w-5 h-5 text-white/60" />
                                                </div>
                                                <div>
                                                    <p className="text-white font-medium">{v.user_name || 'User'}</p>
                                                    <p className="text-white/40 text-sm">{v.user_email || v.user_id}</p>
                                                </div>
                                            </div>
                                            <span className={cn('text-xs font-medium capitalize flex items-center gap-1', statusConfig[v.status]?.color)}>
                                                <StatusIcon className="w-3.5 h-3.5" />
                                                {v.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                        <div className="mt-3 flex items-center gap-4">
                                            <span className="text-white/60 text-sm flex items-center gap-1.5">
                                                <FileText className="w-3.5 h-3.5" />
                                                {typeLabels[v.verification_type] || v.verification_type}
                                            </span>
                                            <span className="text-white/40 text-sm">
                                                {v.created_at ? new Date(v.created_at).toLocaleDateString() : '—'}
                                            </span>
                                        </div>
                                    </button>
                                )
                            })}
                            {filtered.length === 0 && (
                                <div className="py-16 text-center text-white/40">
                                    <ShieldCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                    <p>No verifications in this queue</p>
                                </div>
                            )}
                        </div>

                        <div className="lg:col-span-1">
                            {selected ? (
                                <div className="bg-white/5 rounded-xl border border-white/10 p-6 sticky top-6">
                                    <h3 className="text-lg font-semibold text-white mb-4">Review Details</h3>
                                    <div className="space-y-4 mb-6">
                                        <div className="flex items-center gap-2">
                                            <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium',
                                                statusConfig[selected.status]?.color || 'text-white/60',
                                                selected.status === 'verified' ? 'bg-green-500/20' : selected.status === 'rejected' ? 'bg-red-500/20' : 'bg-amber-500/20'
                                            )}>{selected.status.replace('_', ' ')}</span>
                                            {selected.current_tier && (
                                                <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-purple-500/20 text-purple-400">
                                                    Tier {selected.current_tier}
                                                </span>
                                            )}
                                        </div>
                                        <div>
                                            <label className="text-white/40 text-xs uppercase tracking-wider">Type</label>
                                            <p className="text-white font-medium">{typeLabels[selected.verification_type] || selected.verification_type}</p>
                                        </div>
                                        <div className="grid grid-cols-2 gap-3">
                                            <div>
                                                <label className="text-white/40 text-xs uppercase tracking-wider">User</label>
                                                <p className="text-white text-sm">{selected.user_name || 'User'}</p>
                                                <p className="text-white/50 text-xs">{selected.user_email || selected.user_id}</p>
                                            </div>
                                            <div>
                                                <label className="text-white/40 text-xs uppercase tracking-wider">Submitted</label>
                                                <p className="text-white text-sm">
                                                    {selected.created_at ? (() => {
                                                        const mins = Math.floor((Date.now() - new Date(selected.created_at).getTime()) / 60000)
                                                        if (mins < 60) return `${mins}m ago`
                                                        if (mins < 1440) return `${Math.floor(mins / 60)}h ago`
                                                        return `${Math.floor(mins / 1440)}d ago`
                                                    })() : '—'}
                                                </p>
                                            </div>
                                        </div>
                                        {selected.document_url && (
                                            <div className="space-y-2">
                                                <label className="text-white/40 text-xs uppercase tracking-wider">Document</label>
                                                <div className="flex gap-2">
                                                    <a href={selected.document_url} target="_blank" rel="noopener noreferrer"
                                                        className="flex-1 px-3 py-2 bg-brand-500/10 border border-brand-500/20 rounded-lg text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1.5">
                                                        <ExternalLink className="w-3.5 h-3.5" /> View Document
                                                    </a>
                                                    <button
                                                        onClick={async () => {
                                                            try {
                                                                await apiFetch('/api/v1/ai/parse-document', {
                                                                    method: 'POST',
                                                                    body: JSON.stringify({ document_url: selected.document_url, type: selected.verification_type }),
                                                                })
                                                                refetch()
                                                            } catch { /* AI unavailable */ }
                                                        }}
                                                        className="px-3 py-2 bg-purple-500/10 border border-purple-500/20 rounded-lg text-purple-400 hover:text-purple-300 text-sm flex items-center gap-1.5"
                                                    >
                                                        <Sparkles className="w-3.5 h-3.5" /> AI Parse
                                                    </button>
                                                    <button
                                                        disabled={aiVerifying}
                                                        onClick={async () => {
                                                            setAiVerifying(true)
                                                            setAiVerdict(null)
                                                            try {
                                                                const result = await apiFetch('/api/v1/ai/verify-document', {
                                                                    method: 'POST',
                                                                    body: JSON.stringify({ document_url: selected.document_url, type: selected.verification_type }),
                                                                })
                                                                setAiVerdict(result)
                                                            } catch { setAiVerdict({ error: 'AI verification unavailable' }) }
                                                            finally { setAiVerifying(false) }
                                                        }}
                                                        className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-lg text-emerald-400 hover:text-emerald-300 text-sm flex items-center gap-1.5"
                                                    >
                                                        {aiVerifying ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />} AI Verify
                                                    </button>
                                                </div>
                                                {aiVerdict && !aiVerdict.error && (
                                                    <div className="mt-3 p-3 bg-black/20 rounded-lg space-y-2">
                                                        <div className="flex items-center gap-2">
                                                            {aiVerdict.is_valid ? (
                                                                <span className="text-green-400 text-xs font-medium px-2 py-0.5 bg-green-500/20 rounded-full">✓ Valid</span>
                                                            ) : (
                                                                <span className="text-red-400 text-xs font-medium px-2 py-0.5 bg-red-500/20 rounded-full">✗ Invalid</span>
                                                            )}
                                                            <span className="text-white/50 text-xs">Confidence: {Math.round((aiVerdict.confidence || 0) * 100)}%</span>
                                                        </div>
                                                        {aiVerdict.concerns?.length > 0 && (
                                                            <div className="text-xs">
                                                                <span className="text-amber-400">Concerns:</span>
                                                                <ul className="list-disc list-inside text-white/60 mt-1">
                                                                    {aiVerdict.concerns.map((c: string, i: number) => <li key={i}>{c}</li>)}
                                                                </ul>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                        {selected.extracted_data && Object.keys(selected.extracted_data).length > 0 && (
                                            <div>
                                                <label className="text-white/40 text-xs uppercase tracking-wider mb-2 block">Extracted Data (AI)</label>
                                                <div className="bg-black/20 rounded-lg p-3 space-y-1.5">
                                                    {Object.entries(selected.extracted_data).map(([k, v]) => (
                                                        <div key={k} className="flex justify-between text-sm">
                                                            <span className="text-white/50 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                                            <span className="text-white">{v}</span>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {(selected.status === 'pending' || selected.status === 'in_review') ? (
                                        <div className="space-y-3">
                                            <button onClick={() => handleApprove(selected.id)}
                                                disabled={actionLoading}
                                                className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                                                {actionLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                                Approve
                                            </button>
                                            <textarea
                                                value={rejectReason}
                                                onChange={e => setRejectReason(e.target.value)}
                                                placeholder="Rejection reason (required)..."
                                                className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                                                rows={2}
                                            />
                                            <button onClick={() => handleReject(selected.id)}
                                                disabled={!rejectReason.trim() || actionLoading}
                                                className="w-full px-4 py-2.5 bg-red-600/80 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                                                <XCircle className="w-4 h-4" /> Reject
                                            </button>
                                        </div>
                                    ) : (
                                        <div className={cn(
                                            'px-4 py-3 rounded-lg text-sm font-medium text-center',
                                            selected.status === 'verified' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                                        )}>
                                            {selected.status === 'verified' ? 'Approved' : 'Rejected'}
                                        </div>
                                    )}
                                </div>
                            ) : (
                                <div className="bg-white/5 rounded-xl border border-white/10 p-6 text-center text-white/40">
                                    <Shield className="w-10 h-10 mx-auto mb-3 opacity-40" />
                                    <p>Select a verification to review</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
