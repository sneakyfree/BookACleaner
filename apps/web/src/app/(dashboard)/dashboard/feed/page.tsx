'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
    Newspaper, Heart, Pin, Clock, ExternalLink, Sparkles, Loader2, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
    const { data: session } = useSession()
    const [feed, setFeed] = useState<FeedItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [audienceFilter, setAudienceFilter] = useState<string>('all')
    const [likedIds, setLikedIds] = useState<Set<string>>(new Set())

    const fetchFeed = useCallback(async () => {
        try {
            setLoading(true)
            setError('')
            const params = new URLSearchParams()
            if (audienceFilter !== 'all') params.set('role', audienceFilter)

            const res = await fetch(`${API_URL}/api/v1/feed?${params}`)
            if (!res.ok) throw new Error(`Failed to load feed (${res.status})`)
            const data = await res.json()
            setFeed(data.items || [])
        } catch (err: any) {
            setError(err.message || 'Failed to load feed')
        } finally {
            setLoading(false)
        }
    }, [audienceFilter])

    useEffect(() => {
        fetchFeed()
    }, [fetchFeed])

    // Track view
    useEffect(() => {
        feed.forEach(item => {
            fetch(`${API_URL}/api/v1/feed/${item.id}/view`, { method: 'POST' }).catch(() => { })
        })
    }, [feed])

    const toggleLike = async (id: string) => {
        const token = (session as any)?.accessToken
        if (!token) return

        try {
            const res = await fetch(`${API_URL}/api/v1/feed/${id}/like`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) return
            const data = await res.json()
            setLikedIds(prev => new Set(prev).add(id))
            setFeed(prev => prev.map(item => item.id === id ? { ...item, likes: data.likes } : item))
        } catch { /* ignore like errors */ }
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
                        <p className="text-red-300 text-sm">{error}</p>
                        <button onClick={fetchFeed} className="ml-auto text-red-400 hover:text-red-300 text-sm font-medium">Retry</button>
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
                                    <span className={cn('px-2.5 py-1 rounded-full text-xs font-medium capitalize', typeColors[item.type] || 'bg-white/10 text-white/60')}>
                                        {item.type}
                                    </span>
                                    <span className="text-white/40 text-sm flex items-center gap-1">
                                        <Clock className="w-3 h-3" />
                                        {formatDate(item.created_at)}
                                    </span>
                                </div>

                                <h2 className="text-lg font-semibold text-white mb-2">{item.title}</h2>
                                <p className="text-white/70 leading-relaxed mb-4">{item.content}</p>

                                {item.cta_text && item.cta_url && (
                                    <a href={item.cta_url}
                                        className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-500/20 text-brand-400 rounded-lg text-sm font-medium hover:bg-brand-500/30 transition-colors mb-4">
                                        {item.cta_text} <ExternalLink className="w-3.5 h-3.5" />
                                    </a>
                                )}

                                <div className="flex items-center justify-between pt-3 border-t border-white/5">
                                    <span className="text-white/40 text-sm">{item.views || 0} views</span>
                                    <button onClick={() => toggleLike(item.id)}
                                        className={cn('flex items-center gap-1.5 text-sm transition-colors',
                                            likedIds.has(item.id) ? 'text-red-400' : 'text-white/40 hover:text-red-400')}>
                                        <Heart className={cn('w-4 h-4', likedIds.has(item.id) && 'fill-current')} />
                                        {item.likes || 0}
                                    </button>
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
