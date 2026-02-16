'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Star,
    Search,
    Filter,
    ThumbsUp,
    CheckCircle,
    Eye,
    Loader2,
} from 'lucide-react'
import { toast } from 'sonner'

export default function ClientReviewsPage() {
    const [filter, setFilter] = useState<'all' | 'pending' | 'submitted'>('all')
    const [revealedReviews, setRevealedReviews] = useState<Record<string, any>>({})
    const [revealingId, setRevealingId] = useState<string | null>(null)

    const handleRevealReview = async (reviewId: string) => {
        setRevealingId(reviewId)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/v1/reviews/${reviewId}/reveal`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                const data = await res.json()
                setRevealedReviews(prev => ({ ...prev, [reviewId]: data }))
                toast.success('Review revealed! You can now see the cleaner\'s review.')
            } else {
                const err = await res.json()
                toast.error(err.detail || 'Unable to reveal review')
            }
        } catch {
            toast.error('Failed to reveal review')
        } finally {
            setRevealingId(null)
        }
    }

    // Mock reviews that client has given
    const reviews = [
        {
            id: '1',
            cleaner: "Maria's Cleaning",
            cleanerRating: 4.9,
            service: 'Deep Clean',
            property: 'Lake House',
            date: 'Jan 20, 2026',
            rating: 5,
            text: 'Maria did an amazing job! The house was spotless and she was very professional.',
            status: 'submitted',
        },
        {
            id: '2',
            cleaner: 'Sparkle Pro',
            cleanerRating: 4.8,
            service: 'Airbnb Turnover',
            property: 'Downtown Condo',
            date: 'Jan 15, 2026',
            rating: null,
            text: null,
            status: 'pending',
        },
        {
            id: '3',
            cleaner: "Maria's Cleaning",
            cleanerRating: 4.9,
            service: 'Standard Clean',
            property: 'Lake House',
            date: 'Jan 10, 2026',
            rating: 5,
            text: 'Another great job as always!',
            status: 'submitted',
        },
    ]

    const filteredReviews = reviews.filter((r) => {
        if (filter === 'all') return true
        return r.status === filter
    })

    const pendingCount = reviews.filter((r) => r.status === 'pending').length

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Reviews</h1>
                    <p className="text-muted-foreground mt-1">
                        Your cleaning service reviews
                    </p>
                </div>
            </div>

            {/* Pending Reviews Alert */}
            {pendingCount > 0 && (
                <Card className="border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-500/10">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <Star className="w-5 h-5 text-amber-600" />
                                <div>
                                    <p className="font-medium">
                                        You have {pendingCount} pending review{pendingCount > 1 ? 's' : ''}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Help cleaners by leaving feedback
                                    </p>
                                </div>
                            </div>
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700" onClick={() => setFilter('pending')}>
                                Leave Reviews
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {[
                    { id: 'all', label: 'All Reviews' },
                    { id: 'pending', label: 'Pending', count: pendingCount },
                    { id: 'submitted', label: 'Submitted' },
                ].map((tab) => (
                    <Button
                        key={tab.id}
                        variant={filter === tab.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter(tab.id as any)}
                        className={filter === tab.id ? 'bg-brand-500 hover:bg-brand-600' : ''}
                    >
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                                {tab.count}
                            </span>
                        )}
                    </Button>
                ))}
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
                {filteredReviews.map((review) => (
                    <Card key={review.id}>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                                        <span className="text-lg font-semibold text-brand-600">
                                            {review.cleaner[0]}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <p className="font-semibold">{review.cleaner}</p>
                                            <span className="text-amber-500 flex items-center text-sm">
                                                <Star className="w-3 h-3 fill-current mr-0.5" />
                                                {review.cleanerRating}
                                            </span>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {review.service} at {review.property} • {review.date}
                                        </p>

                                        {review.status === 'submitted' && review.rating !== null ? (
                                            <div className="mt-3">
                                                <div className="flex items-center gap-1 mb-2">
                                                    {[...Array(5)].map((_, i) => (
                                                        <Star
                                                            key={i}
                                                            className={`w-4 h-4 ${i < review.rating! ? 'fill-amber-400 text-amber-400' : 'text-slate-200'
                                                                }`}
                                                        />
                                                    ))}
                                                </div>
                                                <p className="text-muted-foreground">{review.text}</p>
                                            </div>
                                        ) : (
                                            <div className="mt-3 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                                <p className="text-sm text-muted-foreground mb-3">
                                                    How was your experience with {review.cleaner}?
                                                </p>
                                                <div className="flex gap-1 mb-3">
                                                    {[1, 2, 3, 4, 5].map((star) => (
                                                        <button key={star} className="p-1 hover:scale-110 transition">
                                                            <Star className="w-6 h-6 text-slate-300 hover:fill-amber-400 hover:text-amber-400" />
                                                        </button>
                                                    ))}
                                                </div>
                                                <Button size="sm" className="bg-brand-500 hover:bg-brand-600">
                                                    Write Review
                                                </Button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-2">
                                    {review.status === 'submitted' && (
                                        <span className="flex items-center gap-1 text-xs text-green-600 bg-green-50 dark:bg-green-500/10 px-2 py-1 rounded-full">
                                            <CheckCircle className="w-3 h-3" />
                                            Submitted
                                        </span>
                                    )}
                                    {review.status === 'submitted' && !revealedReviews[review.id] && (
                                        <Button
                                            size="sm"
                                            variant="outline"
                                            onClick={() => handleRevealReview(review.id)}
                                            disabled={revealingId === review.id}
                                            className="text-xs"
                                        >
                                            {revealingId === review.id ? (
                                                <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                                            ) : (
                                                <Eye className="w-3 h-3 mr-1" />
                                            )}
                                            Reveal Review
                                        </Button>
                                    )}
                                    {revealedReviews[review.id] && (
                                        <div className="text-xs bg-blue-50 dark:bg-blue-500/10 border border-blue-200 dark:border-blue-500/30 rounded-lg p-3 max-w-[200px]">
                                            <p className="font-medium text-blue-700 dark:text-blue-400 mb-1">Cleaner&apos;s Review</p>
                                            <div className="flex gap-0.5 mb-1">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`w-3 h-3 ${i < (revealedReviews[review.id].rating || 0) ? 'fill-amber-400 text-amber-400' : 'text-slate-200'}`}
                                                    />
                                                ))}
                                            </div>
                                            <p className="text-muted-foreground">{revealedReviews[review.id].text || 'No comment'}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
