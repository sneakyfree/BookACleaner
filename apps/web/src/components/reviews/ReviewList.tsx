'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Loader2, Star, ArrowUpDown, Filter } from 'lucide-react'
import { ReviewCard, ReviewData } from './ReviewCard'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type SortOption = 'newest' | 'highest' | 'lowest'

interface ReviewListProps {
    cleanerId?: string
    jobId?: string
}

export function ReviewList({ cleanerId, jobId }: ReviewListProps) {
    const [reviews, setReviews] = useState<ReviewData[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [page, setPage] = useState(1)
    const [total, setTotal] = useState(0)
    const [sortBy, setSortBy] = useState<SortOption>('newest')
    const [filterRating, setFilterRating] = useState<number | null>(null)

    const limit = 10

    useEffect(() => {
        fetchReviews()
    }, [page, cleanerId, jobId])

    const fetchReviews = async () => {
        try {
            setLoading(true)
            const params = new URLSearchParams({ page: String(page), limit: String(limit) })
            if (cleanerId) params.set('cleaner_id', cleanerId)
            if (jobId) params.set('job_id', jobId)

            const res = await fetch(`${API_URL}/api/v1/reviews/?${params}`)
            if (!res.ok) throw new Error(`Failed to load reviews (${res.status})`)
            const data = await res.json()
            setReviews(data.reviews || [])
            setTotal(data.total || 0)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to load reviews')
        } finally {
            setLoading(false)
        }
    }

    // Client-side sort + filter
    const sortedReviews = [...reviews]
        .filter(r => !filterRating || r.overall_rating === filterRating)
        .sort((a, b) => {
            if (sortBy === 'highest') return b.overall_rating - a.overall_rating
            if (sortBy === 'lowest') return a.overall_rating - b.overall_rating
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        })

    const totalPages = Math.ceil(total / limit)
    const avgRating = reviews.length > 0
        ? (reviews.reduce((sum, r) => sum + r.overall_rating, 0) / reviews.length).toFixed(1)
        : '0.0'

    if (loading && page === 1) {
        return (
            <div className="flex items-center justify-center py-12">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        )
    }

    return (
        <div className="space-y-4">
            {/* Summary Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1">
                        <Star className="w-5 h-5 fill-amber-400 text-amber-400" />
                        <span className="text-xl font-bold">{avgRating}</span>
                    </div>
                    <span className="text-sm text-muted-foreground">
                        {total} review{total !== 1 ? 's' : ''}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Sort */}
                    <select
                        value={sortBy}
                        onChange={(e) => setSortBy(e.target.value as SortOption)}
                        className="text-xs border rounded-lg px-2 py-1.5 bg-background"
                    >
                        <option value="newest">Most Recent</option>
                        <option value="highest">Highest Rating</option>
                        <option value="lowest">Lowest Rating</option>
                    </select>

                    {/* Star Filter */}
                    <div className="flex gap-1">
                        {[5, 4, 3, 2, 1].map(star => (
                            <button
                                key={star}
                                onClick={() => setFilterRating(filterRating === star ? null : star)}
                                className={`flex items-center gap-0.5 px-2 py-1 rounded text-xs transition-all ${filterRating === star
                                        ? 'bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-300'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-gray-200'
                                    }`}
                            >
                                {star}<Star className="w-3 h-3 fill-current" />
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            {/* Error */}
            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600">
                    {error}
                    <Button size="sm" variant="ghost" onClick={fetchReviews} className="ml-2">
                        Retry
                    </Button>
                </div>
            )}

            {/* Review Cards */}
            {sortedReviews.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                    <Star className="w-10 h-10 mx-auto mb-3 opacity-30" />
                    <p className="font-medium">No reviews yet</p>
                    <p className="text-sm mt-1">Reviews will appear here after completed jobs.</p>
                </div>
            ) : (
                <div className="space-y-3">
                    {sortedReviews.map(review => (
                        <ReviewCard key={review.id} review={review} />
                    ))}
                </div>
            )}

            {/* Pagination */}
            {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage(p => p - 1)}
                    >
                        Previous
                    </Button>
                    <span className="text-sm text-muted-foreground">
                        Page {page} of {totalPages}
                    </span>
                    <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage(p => p + 1)}
                    >
                        Next
                    </Button>
                </div>
            )}
        </div>
    )
}

export default ReviewList
