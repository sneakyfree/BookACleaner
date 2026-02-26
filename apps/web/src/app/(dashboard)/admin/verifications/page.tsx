'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
    Shield, ShieldCheck, ShieldAlert, FileText, Eye, CheckCircle2,
    XCircle, Clock, User, Loader2, AlertCircle, ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
    const [verifications, setVerifications] = useState<VerificationItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('pending')
    const [actionLoading, setActionLoading] = useState(false)

    const selected = verifications.find(v => v.id === selectedId)

    const fetchQueue = useCallback(async () => {
        const token = (session as any)?.accessToken
        if (!token) return

        try {
            setLoading(true)
            setError('')
            const res = await fetch(`${API_URL}/api/v1/admin/verifications/queue`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error(`Failed to load verification queue (${res.status})`)
            const data = await res.json()
            setVerifications(data.items || data || [])
        } catch (err: any) {
            setError(err.message || 'Failed to load verification queue')
        } finally {
            setLoading(false)
        }
    }, [session])

    useEffect(() => {
        if (session) fetchQueue()
    }, [session, fetchQueue])

    const handleApprove = async (id: string) => {
        const token = (session as any)?.accessToken
        if (!token) return

        try {
            setActionLoading(true)
            const res = await fetch(`${API_URL}/api/v1/admin/verifications/${id}/approve`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error('Failed to approve verification')
            setVerifications(prev => prev.map(v => v.id === id ? { ...v, status: 'verified' } : v))
            setSelectedId(null)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setActionLoading(false)
        }
    }

    const handleReject = async (id: string) => {
        const token = (session as any)?.accessToken
        if (!token || !rejectReason.trim()) return

        try {
            setActionLoading(true)
            const res = await fetch(`${API_URL}/api/v1/admin/verifications/${id}/reject`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ reason: rejectReason }),
            })
            if (!res.ok) throw new Error('Failed to reject verification')
            setVerifications(prev => prev.map(v => v.id === id ? { ...v, status: 'rejected' } : v))
            setRejectReason('')
            setSelectedId(null)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setActionLoading(false)
        }
    }

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
                        <p className="text-red-300 text-sm">{error}</p>
                        <button onClick={fetchQueue} className="ml-auto text-red-400 hover:text-red-300 text-sm font-medium">Retry</button>
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
                                        <div>
                                            <label className="text-white/40 text-xs uppercase tracking-wider">Type</label>
                                            <p className="text-white font-medium">{typeLabels[selected.verification_type] || selected.verification_type}</p>
                                        </div>
                                        <div>
                                            <label className="text-white/40 text-xs uppercase tracking-wider">User</label>
                                            <p className="text-white">{selected.user_name || 'User'}</p>
                                            <p className="text-white/50 text-sm">{selected.user_email || selected.user_id}</p>
                                        </div>
                                        {selected.document_url && (
                                            <div>
                                                <label className="text-white/40 text-xs uppercase tracking-wider">Document</label>
                                                <a href={selected.document_url} target="_blank" rel="noopener noreferrer"
                                                    className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1 mt-1">
                                                    <ExternalLink className="w-3.5 h-3.5" /> View Document
                                                </a>
                                            </div>
                                        )}
                                        {selected.extracted_data && Object.keys(selected.extracted_data).length > 0 && (
                                            <div>
                                                <label className="text-white/40 text-xs uppercase tracking-wider mb-2 block">Extracted Data</label>
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
