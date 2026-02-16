'use client'

import { useState } from 'react'
import {
    Flag, Eye, Trash2, AlertTriangle, MessageSquare, Star,
    CheckCircle2, XCircle, Clock, ChevronDown
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Admin Content Moderation Page — G3
 * Review flagged reviews, messages, and feed items
 */

interface FlaggedItem {
    id: string
    contentType: string
    contentId: string
    flaggedBy: string
    reason: string
    details: string
    status: string
    content: string
    createdAt: string
}

const mockFlagged: FlaggedItem[] = [
    { id: 'fl1', contentType: 'review', contentId: 'r1', flaggedBy: 'user-123', reason: 'spam', details: 'This review is clearly fake and promotional.', status: 'pending', content: 'Best cleaner ever!! Use code DISCOUNT50 for half off at my website!', createdAt: '2026-02-10' },
    { id: 'fl2', contentType: 'message', contentId: 'm1', flaggedBy: 'user-456', reason: 'harassment', details: 'Aggressive language in messages.', status: 'pending', content: 'You are terrible at your job and I will make sure everyone knows it.', createdAt: '2026-02-09' },
    { id: 'fl3', contentType: 'review', contentId: 'r2', flaggedBy: 'user-789', reason: 'fraud', details: 'Client never booked this cleaner.', status: 'pending', content: 'Left my house worse than before. Stole my silverware.', createdAt: '2026-02-08' },
    { id: 'fl4', contentType: 'feed', contentId: 'f1', flaggedBy: 'user-321', reason: 'inappropriate', details: 'Contains offensive language.', status: 'reviewed', content: 'Check out my amazing new cleaning business! [inappropriate content removed]', createdAt: '2026-02-07' },
]

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
    const [items, setItems] = useState(mockFlagged)
    const [statusFilter, setStatusFilter] = useState<string>('pending')

    const filtered = items.filter(i => statusFilter === 'all' || i.status === statusFilter)

    const handleAction = (id: string, action: 'removed' | 'dismissed') => {
        setItems(prev => prev.map(i => i.id === id ? { ...i, status: action } : i))
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

                <div className="space-y-4">
                    {filtered.map(item => {
                        const TypeIcon = typeIcons[item.contentType] || Flag
                        return (
                            <div key={item.id} className="bg-white/5 rounded-xl border border-white/10 p-6">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-3">
                                        <TypeIcon className="w-5 h-5 text-white/50" />
                                        <span className="text-white/60 text-sm capitalize">{item.contentType}</span>
                                        <span className={cn('px-2.5 py-0.5 rounded-full text-xs font-medium capitalize', reasonColors[item.reason])}>
                                            {item.reason}
                                        </span>
                                    </div>
                                    <span className="text-white/40 text-sm">{item.createdAt}</span>
                                </div>

                                <div className="bg-black/20 rounded-lg p-4 mb-4 border-l-2 border-red-500/50">
                                    <p className="text-white/80 text-sm italic">&quot;{item.content}&quot;</p>
                                </div>

                                <p className="text-white/50 text-sm mb-4">
                                    <strong className="text-white/70">Report details:</strong> {item.details}
                                </p>

                                {item.status === 'pending' ? (
                                    <div className="flex gap-3">
                                        <button onClick={() => handleAction(item.id, 'removed')}
                                            className="px-4 py-2 bg-red-600/80 hover:bg-red-500 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                                            <Trash2 className="w-3.5 h-3.5" /> Remove Content
                                        </button>
                                        <button onClick={() => handleAction(item.id, 'dismissed')}
                                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
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
                    {filtered.length === 0 && (
                        <div className="py-16 text-center text-white/40">
                            <CheckCircle2 className="w-12 h-12 mx-auto mb-3 opacity-40" />
                            <p>No flagged content in this queue</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
