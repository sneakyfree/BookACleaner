'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Star,
    CheckCircle,
    Eye,
    Loader2,
    AlertCircle,
} from 'lucide-react'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ApiReview {
    id: string
    job_id: string
    overall_rating: number | null
    cleanliness_rating?: number
    communication_rating?: number
    timeliness_rating?: number
    text?: string | null
    tags?: string[]
    photos?: string[]
    author?: {
        name: string
        avatar?: string
    }
    cleaner_id?: string
    cleaner_name?: string
    service_type?: string
    property_name?: string
    status?: string
    created_at?: string
}

interface DisplayReview {
    id: string
    cleaner: string
    service: string
    property: string
    date: string
    rating: number | null
    text: string | null
    status: 'submitted' | 'pending'
}

export default function ClientReviewsPage() {
    const { data: session } = useSession()
    const [reviews, setReviews] = useState<DisplayReview[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [filter, setFilter] = useState<'all' | 'pending' | 'submitted'>('all')
    const [revealedReviews, setRevealedReviews] = useState<Record<string, any>>({})
    const [revealingId, setRevealingId] = useState<string | null>(null)

    useEffect(() => {
        const token = (session as any)?.accessToken
        if (!token) {
            setLoading(false)
            return
        }

        async function fetchReviews() {
            try {
                setError(null)
                const res = await fetch(`${API_URL}/api/v1/reviews/`, {
                    headers: {
                        Authorization: `Bearer ${(session as any)?.accessToken}`,
                    },
                })

                if (!res.ok) throw new Error(`Failed to load reviews (${res.status})`)

                const data = await res.json()
                const apiReviews: ApiReview[] = data.reviews || []

                const mapped: DisplayReview[] = apiReviews.map((r) => ({
                    id: r.id,
                    cleaner: r.cleaner_name || r.author?.name || 'Cleaner',
                    service: r.service_type || 'Cleaning',
                    property: r.property_name || 'Property',
                    date: r.created_at
                        ? new Date(r.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : '',
                    rating: r.overall_rating,
                    text: r.text || null,
                    status: r.overall_rating ? 'submitted' : 'pending',
                }))

                setReviews(mapped)
            } catch (err) {
                console.error('Failed to fetch reviews:', err)
                setError(err instanceof Error ? err.message : 'Failed to load reviews')
            } finally {
                setLoading(false)
            }
        }

        fetchReviews()
    }, [session])

    const handleRevealReview = async (reviewId: string) => {
        setRevealingId(reviewId)
        try {
            const res = await fetch(`${API_URL}/api/v1/reviews/${reviewId}/reveal`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${(session as any)?.accessToken}` },
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

    const filteredReviews = reviews.filter((r) => {
        if (filter === 'all') return true
        return r.status === filter
    })

    const pendingCount = reviews.filter((r) => r.status === 'pending').length

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        )
    }

    if (error) {
        return (
            <Card>
                <CardContent className="py-12 text-center">
                    <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                    <p className="text-lg font-medium text-red-600">{error}</p>
                    <Button className="mt-4" onClick={() => window.location.reload()}>
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        )
    }

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
            {filteredReviews.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No reviews found</p>
                    </CardContent>
                </Card>
            ) : (
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
                                            <p className="font-semibold">{review.cleaner}</p>
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
                                                    {review.text && (
                                                        <p className="text-muted-foreground">{review.text}</p>
                                                    )}
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
            )}
        </div>
    )
}
