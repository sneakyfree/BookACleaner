'use client'

import { useState, useEffect, useRef } from 'react'
import {
    Newspaper, Heart, Pin, Clock, ExternalLink, Sparkles, Loader2, AlertCircle, Share2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useFeed, useLikeFeedItem } from '@/hooks/use-api'
import { apiFetch } from '@/lib/auth/api-client'

interface FeedItem {
    id: string
    type: string
    title: string
    content: string
    image_url?: string | null
    cta_text?: string | null
    cta_url?: string | null
    target_roles?: string[]
    priority?: number
    likes?: number
    views?: number
    created_at?: string
}

const typeColors: Record<string, string> = {
    announcement: 'bg-brand-500/20 text-brand-400',
    tip: 'bg-amber-500/20 text-amber-400',
    milestone: 'bg-purple-500/20 text-purple-400',
    update: 'bg-blue-500/20 text-blue-400',
    community: 'bg-green-500/20 text-green-400',
    promo: 'bg-pink-500/20 text-pink-400',
    feature: 'bg-cyan-500/20 text-cyan-400',
}

export default function FeedPage() {
    const [audienceFilter, setAudienceFilter] = useState<string>('all')
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set())
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())

    const { data: rawData, isLoading: loading, error, refetch } = useFeed()
    const likeMut = useLikeFeedItem()

    const feed: FeedItem[] = rawData?.items || rawData || []

    // Track view (with dedup)
    const viewedRef = useRef<Set<string>>(new Set())
    useEffect(() => {
        feed.forEach(item => {
            if (viewedRef.current.has(item.id)) return
            viewedRef.current.add(item.id)
            apiFetch(`/api/v1/feed/${item.id}/view`, {
                method: 'POST',
            }).catch(() => { })
        })
    }, [feed])

    const toggleLike = (id: string) => {
        setLikedIds(prev => new Set(prev).add(id))
        likeMut.mutate(id)
    }

    const formatDate = (dateStr?: string) => {
        if (!dateStr) return ''
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
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Newspaper className="w-7 h-7 text-brand-400" />
                            Community Feed
                        </h1>
                        <p className="text-white/60 mt-1">Updates, tips, and announcements</p>
                    </div>
                    <div className="flex gap-1 p-1 rounded-lg bg-white/5">
                        {['all', 'client', 'cleaner'].map(aud => (
                            <button key={aud} onClick={() => setAudienceFilter(aud)}
                                className={cn('px-3 py-1.5 rounded-md text-sm transition-colors',
                                    audienceFilter === aud ? 'bg-brand-500 text-white' : 'text-white/60 hover:text-white')}>
                                {aud === 'all' ? 'All' : aud === 'client' ? 'For Clients' : 'For Cleaners'}
                            </button>
                        ))}
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-red-300 text-sm">{(error as any)?.detail || 'Failed to load feed'}</p>
                        <button onClick={() => refetch()} className="ml-auto text-red-400 hover:text-red-300 text-sm font-medium">Retry</button>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                        <span className="ml-3 text-white/60">Loading feed...</span>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {feed.map(item => (
                            <article key={item.id}
                                className="bg-white/5 rounded-xl border border-white/10 p-6 transition-all hover:bg-white/[0.07]">
                                <div className="flex items-start justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                        <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize', typeColors[item.type] || 'bg-white/10 text-white/60')}>
                                            {item.type}
                                        </span>
                                        {(item.priority || 0) >= 80 && (
                                            <Pin className="w-3.5 h-3.5 text-amber-400" />
                                        )}
                                    </div>
                                    <span className="text-white/40 text-sm flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(item.created_at)}
                                    </span>
                                </div>

                                {item.image_url && expandedIds.has(item.id) && (
                                    <div className="mb-4 rounded-lg overflow-hidden border border-white/10">
                                        <img src={item.image_url} alt={item.title} className="w-full h-48 object-cover" />
                                    </div>
                                )}

                                <h2 className="text-lg font-semibold text-white mb-2">{item.title}</h2>
                                <p className={`text-white/70 leading-relaxed mb-2 ${!expandedIds.has(item.id) && item.content.length > 200 ? 'line-clamp-3' : ''}`}>{item.content}</p>
                                {item.content.length > 200 && (
                                    <button onClick={() => setExpandedIds(prev => {
                                        const next = new Set(prev)
                                        next.has(item.id) ? next.delete(item.id) : next.add(item.id)
                                        return next
                                    })} className="text-brand-400 text-sm font-medium mb-4 hover:text-brand-300">
                                        {expandedIds.has(item.id) ? 'Show less' : 'Read more'}
                                    </button>
                                )}

                                {/* Expanded detail: audience + priority */}
                                {expandedIds.has(item.id) && (
                                    <div className="flex items-center gap-2 mb-4 flex-wrap">
                                        {item.target_roles && item.target_roles.length > 0 && item.target_roles.map(role => (
                                            <span key={role} className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/10 text-white/50 capitalize">
                                                {role}s
                                            </span>
                                        ))}
                                        {(item.priority || 0) > 0 && (
                                            <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-500/20 text-amber-400">
                                                Priority {item.priority}
                                            </span>
                                        )}
                                    </div>
                                )}

                                {item.cta_text && item.cta_url && (
                                    <a href={item.cta_url}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500/20 text-brand-400 rounded-lg text-sm font-medium hover:bg-brand-500/30 transition-colors mb-4">
                                        {item.cta_text} <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                )}

                                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                    <span className="text-white/40 text-sm">{item.views || 0} views</span>
                                    <div className="flex items-center gap-3">
                                        <button onClick={() => {
                                            if (navigator.share) {
                                                navigator.share({ title: item.title, text: item.content.slice(0, 100) }).catch(() => { })
                                            } else {
                                                navigator.clipboard.writeText(`${item.title}\n${item.content.slice(0, 200)}`)
                                            }
                                        }} className="text-white/40 hover:text-brand-400 transition-colors">
                                            <Share2 className="w-4 h-4" />
                                        </button>
                                        <button onClick={() => toggleLike(item.id)}
                                            className={cn('flex items-center gap-1.5 text-sm transition-colors',
                                                likedIds.has(item.id) ? 'text-red-400' : 'text-white/40 hover:text-red-400')}>
                                            <Heart className={cn('w-4 h-4', likedIds.has(item.id) && 'fill-current')} />
                                            {item.likes || 0}
                                        </button>
                                    </div>
                                </div>
                            </article>
                        ))}
                    </div>
                )}

                {!loading && feed.length === 0 && (
                    <div className="py-20 text-center text-white/40">
                        <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p>No feed items yet</p>
                    </div>
                )}
            </div>
        </div>
    )
}
