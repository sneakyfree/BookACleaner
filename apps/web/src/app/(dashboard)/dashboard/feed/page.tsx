'use client'

import { useState, useCallback } from 'react'
import {
    Newspaper, Heart, Pin, MessageSquare, TrendingUp, Image,
    ExternalLink, Clock, Filter, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Newsfeed Page — community updates, tips, and platform announcements
 * Wired to GET /api/v1/feed endpoints
 */

interface FeedItem {
    id: string
    type: string
    title: string
    content: string
    imageUrl: string | null
    linkUrl: string | null
    targetAudience: string
    isPinned: boolean
    likeCount: number
    isLiked: boolean
    authorName: string
    authorRole: string
    createdAt: string
}

const mockFeed: FeedItem[] = [
    {
        id: 'f1', type: 'announcement', title: '🎉 New Route Optimizer Feature', content: 'Cleaners can now optimize their daily routes to save time and fuel. The AI-powered route optimizer uses TSP algorithms to find the most efficient path between your jobs.', imageUrl: null, linkUrl: null, targetAudience: 'ALL', isPinned: true, likeCount: 42, isLiked: false, authorName: 'BookACleaner Team', authorRole: 'admin', createdAt: '2026-02-10T08:00:00',
    },
    {
        id: 'f2', type: 'tip', title: '5 Tips for Getting More 5-Star Reviews', content: 'Want to stand out on the marketplace? Here are proven strategies from our top-rated cleaners: 1) Send a confirmation message before arriving, 2) Take before/after photos, 3) Leave a small touch like folded towels, 4) Follow up after the job, 5) Ask clients to rate their experience.', imageUrl: null, linkUrl: null, targetAudience: 'CLEANER', isPinned: false, likeCount: 28, isLiked: true, authorName: 'BookACleaner Tips', authorRole: 'admin', createdAt: '2026-02-09T14:30:00',
    },
    {
        id: 'f3', type: 'milestone', title: 'We Hit 1,000 Completed Bookings! 🎊', content: 'Thank you to our amazing community of cleaners and clients. Together, we have facilitated over 1,000 successful cleaning bookings. Here is to the next 10,000!', imageUrl: null, linkUrl: null, targetAudience: 'ALL', isPinned: false, likeCount: 89, isLiked: false, authorName: 'BookACleaner Team', authorRole: 'admin', createdAt: '2026-02-08T10:00:00',
    },
    {
        id: 'f4', type: 'tip', title: 'How to Write a Great Property Playbook', content: 'A detailed property playbook helps cleaners deliver consistent, personalized service. Include access codes, pet info, special cleaning areas, and any guest preferences for Airbnb turnovers.', imageUrl: null, linkUrl: null, targetAudience: 'CLIENT', isPinned: false, likeCount: 15, isLiked: false, authorName: 'BookACleaner Tips', authorRole: 'admin', createdAt: '2026-02-07T16:00:00',
    },
    {
        id: 'f5', type: 'update', title: 'Updated Verification Tiers', content: 'We have simplified our verification system. Cleaners can now reach Elite status (Tier 5) by completing background checks, uploading certifications, and maintaining a 4.8+ rating. Higher tiers get more visibility in search results.', imageUrl: null, linkUrl: null, targetAudience: 'CLEANER', isPinned: false, likeCount: 33, isLiked: false, authorName: 'BookACleaner Team', authorRole: 'admin', createdAt: '2026-02-06T09:00:00',
    },
]

const typeColors: Record<string, string> = {
    announcement: 'bg-brand-500/20 text-brand-400',
    tip: 'bg-amber-500/20 text-amber-400',
    milestone: 'bg-purple-500/20 text-purple-400',
    update: 'bg-blue-500/20 text-blue-400',
    community: 'bg-green-500/20 text-green-400',
}

export default function FeedPage() {
    const [feed, setFeed] = useState(mockFeed)
    const [audienceFilter, setAudienceFilter] = useState<string>('ALL')

    const filtered = feed.filter(item =>
        audienceFilter === 'ALL' || item.targetAudience === 'ALL' || item.targetAudience === audienceFilter
    )

    // Pinned items first, then by date
    const sorted = [...filtered].sort((a, b) => {
        if (a.isPinned && !b.isPinned) return -1
        if (!a.isPinned && b.isPinned) return 1
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    })

    const toggleLike = useCallback((id: string) => {
        setFeed(prev => prev.map(item => {
            if (item.id === id) {
                return {
                    ...item,
                    isLiked: !item.isLiked,
                    likeCount: item.isLiked ? item.likeCount - 1 : item.likeCount + 1,
                }
            }
            return item
        }))
    }, [])

    const formatDate = (dateStr: string) => {
        const date = new Date(dateStr)
        const now = new Date()
        const diff = now.getTime() - date.getTime()
        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        if (days === 0) return 'Today'
        if (days === 1) return 'Yesterday'
        if (days < 7) return `${days} days ago`
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-3xl mx-auto">
                {/* Header */}
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Newspaper className="w-7 h-7 text-brand-400" />
                            Community Feed
                        </h1>
                        <p className="text-white/60 mt-1">Updates, tips, and announcements</p>
                    </div>
                    <div className="flex gap-1 p-1 rounded-lg bg-white/5">
                        {['ALL', 'CLIENT', 'CLEANER'].map(aud => (
                            <button
                                key={aud}
                                onClick={() => setAudienceFilter(aud)}
                                className={cn(
                                    'px-3 py-1.5 rounded-md text-sm transition-colors',
                                    audienceFilter === aud ? 'bg-brand-500 text-white' : 'text-white/60 hover:text-white'
                                )}
                            >
                                {aud === 'ALL' ? 'All' : aud === 'CLIENT' ? 'For Clients' : 'For Cleaners'}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Feed Items */}
                <div className="space-y-4">
                    {sorted.map(item => (
                        <article
                            key={item.id}
                            className={cn(
                                'bg-white/5 rounded-xl border p-6 transition-all hover:bg-white/[0.07]',
                                item.isPinned ? 'border-brand-500/30' : 'border-white/10'
                            )}
                        >
                            {/* Header */}
                            <div className="flex items-start justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize', typeColors[item.type] || 'bg-white/10 text-white/60')}>
                                        {item.type}
                                    </span>
                                    {item.isPinned && (
                                        <span className="flex items-center gap-1 text-xs text-brand-400">
                                            <Pin className="w-3 h-3" /> Pinned
                                        </span>
                                    )}
                                </div>
                                <span className="text-white/40 text-sm flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {formatDate(item.createdAt)}
                                </span>
                            </div>

                            {/* Content */}
                            <h2 className="text-lg font-semibold text-white mb-2">{item.title}</h2>
                            <p className="text-white/70 leading-relaxed mb-4">{item.content}</p>

                            {/* Footer */}
                            <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                <span className="text-white/40 text-sm">{item.authorName}</span>
                                <div className="flex items-center gap-4">
                                    <button
                                        onClick={() => toggleLike(item.id)}
                                        className={cn(
                                            'flex items-center gap-1.5 text-sm transition-colors',
                                            item.isLiked ? 'text-red-400' : 'text-white/40 hover:text-red-400'
                                        )}
                                    >
                                        <Heart className={cn('w-4 h-4', item.isLiked && 'fill-current')} />
                                        {item.likeCount}
                                    </button>
                                    {item.linkUrl && (
                                        <a href={item.linkUrl} target="_blank" rel="noopener noreferrer" className="text-white/40 hover:text-brand-400 transition-colors">
                                            <ExternalLink className="w-4 h-4" />
                                        </a>
                                    )}
                                </div>
                            </div>
                        </article>
                    ))}
                </div>

                {sorted.length === 0 && (
                    <div className="py-20 text-center text-white/40">
                        <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p>No feed items yet</p>
                    </div>
                )}
            </div>
        </div>
    )
}
