'use client'

import { useState } from 'react'
import {
    CheckSquare, Clock, Brain, ChevronRight, CheckCircle2,
    XCircle, AlertCircle, Zap
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Admin HITL Approval Queue — G7
 * Human-in-the-loop review for AI-generated decisions
 */

interface HITLItem {
    id: string
    type: string
    description: string
    aiRecommendation: string
    confidence: number
    context: Record<string, string>
    status: string
    createdAt: string
}

const mockHITL: HITLItem[] = [
    { id: 'h1', type: 'verification_override', description: 'AI flagged cleaner background check as potentially inconsistent', aiRecommendation: 'Reject — name mismatch between ID and application', confidence: 0.72, context: { cleaner: 'John Doe', appliedName: 'John D Smith', idName: 'Jonathan Doe Smith' }, status: 'pending', createdAt: '2026-02-10' },
    { id: 'h2', type: 'pricing_anomaly', description: 'Cleaner hourly rate 3x below market average', aiRecommendation: 'Flag for review — possible error or predatory pricing', confidence: 0.88, context: { cleaner: 'Quick Clean Co', rate: '$15/hr', marketAvg: '$45/hr' }, status: 'pending', createdAt: '2026-02-09' },
    { id: 'h3', type: 'review_sentiment', description: 'AI detected potentially defamatory review content', aiRecommendation: 'Remove — contains unsubstantiated criminal accusations', confidence: 0.91, context: { reviewer: 'client-8891', content: 'This cleaner stole from me...', target: 'cleaner-2201' }, status: 'pending', createdAt: '2026-02-08' },
    { id: 'h4', type: 'schedule_conflict', description: 'Double-booking detected for cleaner', aiRecommendation: 'Auto-cancel later booking, notify both clients', confidence: 0.95, context: { cleaner: 'Maria G', job1: 'Job #1234 at 10am', job2: 'Job #1235 at 10:30am' }, status: 'approved', createdAt: '2026-02-07' },
]

const typeColors: Record<string, string> = {
    verification_override: 'bg-amber-500/20 text-amber-400',
    pricing_anomaly: 'bg-blue-500/20 text-blue-400',
    review_sentiment: 'bg-red-500/20 text-red-400',
    schedule_conflict: 'bg-purple-500/20 text-purple-400',
}

export default function AdminApprovalsPage() {
    const [items, setItems] = useState(mockHITL)
    const [selectedId, setSelectedId] = useState<string | null>(null)
    const selected = items.find(i => i.id === selectedId)

    const handleDecision = (id: string, decision: 'approved' | 'rejected' | 'overridden') => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, status: decision } : i))
        setSelectedId(null)
    }

    const pendingCount = items.filter(i => i.status === 'pending').length

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
                                        <div className="flex items-center gap-1">
                                            <Zap className="w-3 h-3 text-brand-400" />
                                            <span className="text-white/50 text-xs">{Math.round(item.confidence * 100)}% confident</span>
                                        </div>
                                        {item.status !== 'pending' && (
                                            <span className={cn('text-xs font-medium capitalize',
                                                item.status === 'approved' ? 'text-green-400' : item.status === 'rejected' ? 'text-red-400' : 'text-amber-400')}>
                                                {item.status}
                                            </span>
                                        )}
                                    </div>
                                </div>
                                <p className="text-white font-medium text-sm">{item.description}</p>
                                <p className="text-white/40 text-xs mt-1">{item.createdAt}</p>
                            </button>
                        ))}
                    </div>

                    <div className="lg:col-span-2">
                        {selected ? (
                            <div className="bg-white/5 rounded-xl border border-white/10 p-6 sticky top-6">
                                <h3 className="text-lg font-semibold text-white mb-4">Review Decision</h3>

                                <div className="space-y-4 mb-6">
                                    <div>
                                        <label className="text-white/40 text-xs uppercase tracking-wider">AI Recommendation</label>
                                        <div className="mt-1 bg-brand-500/10 border border-brand-500/20 rounded-lg p-3">
                                            <p className="text-brand-300 text-sm">{selected.aiRecommendation}</p>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-white/40 text-xs uppercase tracking-wider">Confidence</label>
                                        <div className="mt-1 flex items-center gap-2">
                                            <div className="flex-1 h-2 bg-white/10 rounded-full overflow-hidden">
                                                <div className="h-full bg-brand-500 rounded-full" style={{ width: `${selected.confidence * 100}%` }} />
                                            </div>
                                            <span className="text-white text-sm font-medium">{Math.round(selected.confidence * 100)}%</span>
                                        </div>
                                    </div>
                                    <div>
                                        <label className="text-white/40 text-xs uppercase tracking-wider mb-2 block">Context</label>
                                        <div className="bg-black/20 rounded-lg p-3 space-y-1.5">
                                            {Object.entries(selected.context).map(([k, v]) => (
                                                <div key={k} className="flex justify-between text-sm">
                                                    <span className="text-white/50 capitalize">{k}</span>
                                                    <span className="text-white text-right max-w-[180px] truncate">{v}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {selected.status === 'pending' && (
                                    <div className="space-y-2">
                                        <button onClick={() => handleDecision(selected.id, 'approved')}
                                            className="w-full px-4 py-2.5 bg-green-600 hover:bg-green-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                                            <CheckCircle2 className="w-4 h-4" /> Approve AI Decision
                                        </button>
                                        <button onClick={() => handleDecision(selected.id, 'rejected')}
                                            className="w-full px-4 py-2.5 bg-red-600/80 hover:bg-red-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                                            <XCircle className="w-4 h-4" /> Reject
                                        </button>
                                        <button onClick={() => handleDecision(selected.id, 'overridden')}
                                            className="w-full px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white rounded-lg font-medium transition-colors flex items-center justify-center gap-2">
                                            <AlertCircle className="w-4 h-4" /> Override
                                        </button>
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
            </div>
        </div>
    )
}
