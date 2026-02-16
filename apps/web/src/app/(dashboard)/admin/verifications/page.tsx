'use client'

import { useState } from 'react'
import {
    Shield, ShieldCheck, ShieldAlert, FileText, Eye, CheckCircle2,
    XCircle, Clock, User, ChevronDown, Download, ExternalLink
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Admin Verification Review Queue
 * Review and approve/reject pending cleaner verification documents
 */

interface VerificationItem {
    id: string
    userId: string
    userName: string
    userEmail: string
    type: string
    status: string
    documentUrl: string | null
    extractedData: Record<string, string> | null
    createdAt: string
    currentTier: number
}

const mockVerifications: VerificationItem[] = [
    { id: 'v1', userId: 'u1', userName: 'Maria Garcia', userEmail: 'maria@example.com', type: 'id', status: 'pending', documentUrl: '/uploads/id-front.jpg', extractedData: { name: 'Maria Garcia', dob: '1990-05-14', state: 'TX' }, createdAt: '2026-02-08', currentTier: 2 },
    { id: 'v2', userId: 'u2', userName: 'Lisa Park', userEmail: 'lisa@example.com', type: 'business_license', status: 'pending', documentUrl: '/uploads/biz-license.pdf', extractedData: { businessName: 'Sparkle Clean LLC', licenseNo: 'BL-2025-4892' }, createdAt: '2026-02-09', currentTier: 1 },
    { id: 'v3', userId: 'u3', userName: 'James Wilson', userEmail: 'james@example.com', type: 'insurance', status: 'in_review', documentUrl: '/uploads/insurance-cert.pdf', extractedData: { provider: 'State Farm', policyNo: 'SF-99281', coverage: '$2,000,000' }, createdAt: '2026-02-07', currentTier: 3 },
    { id: 'v4', userId: 'u4', userName: 'Emily Brown', userEmail: 'emily@example.com', type: 'iicrc', status: 'pending', documentUrl: '/uploads/iicrc-cert.jpg', extractedData: { certNumber: 'IICRC-88201', specialty: 'Carpet Cleaning', expires: '2027-03-15' }, createdAt: '2026-02-10', currentTier: 2 },
    { id: 'v5', userId: 'u5', userName: 'Alex Rivera', userEmail: 'alex@example.com', type: 'background_check', status: 'pending', documentUrl: null, extractedData: { provider: 'Checkr', status: 'clear', completedAt: '2026-02-06' }, createdAt: '2026-02-06', currentTier: 1 },
]

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
    const [verifications, setVerifications] = useState(mockVerifications)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const [rejectReason, setRejectReason] = useState('')
    const [statusFilter, setStatusFilter] = useState<string>('pending')

    const filtered = verifications.filter(v => statusFilter === 'all' || v.status === statusFilter)
    const selected = verifications.find(v => v.id === selectedId)

    const handleApprove = (id: string) => {
        setVerifications(prev => prev.map(v => v.id === id ? { ...v, status: 'verified' } : v))
        setSelectedId(null)
    }

    const handleReject = (id: string) => {
        if (!rejectReason.trim()) return
        setVerifications(prev => prev.map(v => v.id === id ? { ...v, status: 'rejected' } : v))
        setRejectReason('')
        setSelectedId(null)
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
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
                            <button
                                key={s}
                                onClick={() => setStatusFilter(s)}
                                className={cn(
                                    'px-3 py-1.5 rounded-md text-sm transition-colors capitalize',
                                    statusFilter === s ? 'bg-brand-500 text-white' : 'text-white/60 hover:text-white'
                                )}
                            >
                                {s === 'in_review' ? 'In Review' : s}
                            </button>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Queue List */}
                    <div className="lg:col-span-2 space-y-3">
                        {filtered.map(v => {
                            const StatusIcon = statusConfig[v.status]?.icon || Clock
                            return (
                                <button
                                    key={v.id}
                                    onClick={() => setSelectedId(v.id)}
                                    className={cn(
                                        'w-full text-left bg-white/5 rounded-xl border p-4 transition-all hover:bg-white/[0.08]',
                                        selectedId === v.id ? 'border-brand-500/50 ring-1 ring-brand-500/20' : 'border-white/10'
                                    )}
                                >
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center">
                                                <User className="w-5 h-5 text-white/60" />
                                            </div>
                                            <div>
                                                <p className="text-white font-medium">{v.userName}</p>
                                                <p className="text-white/40 text-sm">{v.userEmail}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className={cn('text-xs font-medium capitalize flex items-center gap-1', statusConfig[v.status]?.color)}>
                                                <StatusIcon className="w-3.5 h-3.5" />
                                                {v.status.replace('_', ' ')}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="mt-3 flex items-center gap-4">
                                        <span className="text-white/60 text-sm flex items-center gap-1.5">
                                            <FileText className="w-3.5 h-3.5" />
                                            {typeLabels[v.type] || v.type}
                                        </span>
                                        <span className="text-white/40 text-sm">Tier {v.currentTier}</span>
                                        <span className="text-white/40 text-sm">{v.createdAt}</span>
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

                    {/* Detail Panel */}
                    <div className="lg:col-span-1">
                        {selected ? (
                            <div className="bg-white/5 rounded-xl border border-white/10 p-6 sticky top-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Review Details</h3>

                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="text-white/40 text-xs uppercase tracking-wider">Type</label>
                                        <p className="text-white font-medium">{typeLabels[selected.type]}</p>
                                    </div>
                                    <div>
                                        <label className="text-white/40 text-xs uppercase tracking-wider">User</label>
                                        <p className="text-white">{selected.userName}</p>
                                        <p className="text-white/50 text-sm">{selected.userEmail}</p>
                                    </div>
                                    {selected.documentUrl && (
                                        <div>
                                            <label className="text-white/40 text-xs uppercase tracking-wider">Document</label>
                                            <a href={selected.documentUrl} target="_blank" rel="noopener noreferrer"
                                                className="text-brand-400 hover:text-brand-300 text-sm flex items-center gap-1 mt-1">
                                                <ExternalLink className="w-3.5 h-3.5" /> View Document
                                            </a>
                                        </div>
                                    )}
                                    {selected.extractedData && (
                                        <div>
                                            <label className="text-white/40 text-xs uppercase tracking-wider mb-2 block">Extracted Data</label>
                                            <div className="bg-black/20 rounded-lg p-3 space-y-1.5">
                                                {Object.entries(selected.extractedData).map(([k, v]) => (
                                                    <div key={k} className="flex justify-between text-sm">
                                                        <span className="text-white/50 capitalize">{k.replace(/([A-Z])/g, ' $1')}</span>
                                                        <span className="text-white">{v}</span>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                {selected.status === 'pending' || selected.status === 'in_review' ? (
                                    <div className="space-y-3">
                                        <button
                                            onClick={() => handleApprove(selected.id)}
                                            className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle2 className="w-4 h-4" /> Approve
                                        </button>
                                        <textarea
                                            value={rejectReason}
                                            onChange={e => setRejectReason(e.target.value)}
                                            placeholder="Rejection reason (required)..."
                                            className="w-full px-3 py-2 bg-black/20 border border-white/10 rounded-lg text-white text-sm placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-red-500/50 resize-none"
                                            rows={2}
                                        />
                                        <button
                                            onClick={() => handleReject(selected.id)}
                                            disabled={!rejectReason.trim()}
                                            className="w-full px-4 py-2.5 bg-red-600/80 hover:bg-red-500 disabled:opacity-30 disabled:cursor-not-allowed text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                                        >
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
            </div>
        </div>
    )
}
