'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
    Star,
    CheckCircle,
    MessageSquare,
    Loader2,
    AlertCircle,
    Flag,
} from 'lucide-react'
import { toast } from 'sonner'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ApiReview {
    id: string
    job_id: string
    overall_rating: number
    cleanliness_rating?: number
    communication_rating?: number
    timeliness_rating?: number
    text?: string | null
    tags?: string[]
    photos?: string[]
    author?: { name: string; avatar?: string } | null
    response?: string | null
    responded_at?: string | null
    created_at?: string
}

export default function CleanerReviewsPage() {
    const { data: session } = useSession()
    const [reviews, setReviews] = useState<ApiReview[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [respondingTo, setRespondingTo] = useState<string | null>(null)
    const [responseText, setResponseText] = useState('')
    const [submitting, setSubmitting] = useState(false)
    const [flagging, setFlagging] = useState<string | null>(null)

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
                setReviews(data.reviews || [])
            } catch (err) {
                console.error('Failed to fetch reviews:', err)
                setError(err instanceof Error ? err.message : 'Failed to load reviews')
            } finally {
                setLoading(false)
            }
        }

        fetchReviews()
    }, [session])

    // ── Computed stats ──────────────────────────────────────────────
    const totalReviews = reviews.length
    const overallRating =
        totalReviews > 0
            ? +(reviews.reduce((s, r) => s + (r.overall_rating || 0), 0) / totalReviews).toFixed(1)
            : 0
    const breakdown: Record<number, number> = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
    reviews.forEach((r) => {
        const rating = r.overall_rating
        if (rating >= 1 && rating <= 5) breakdown[rating]++
    })
    const satisfactionRate =
        totalReviews > 0
            ? Math.round(((breakdown[4] + breakdown[5]) / totalReviews) * 100)
            : 0

    // ── Respond handler ─────────────────────────────────────────────
    const handleRespond = async (reviewId: string) => {
        if (!responseText.trim()) {
            toast.error('Please write a response')
            return
        }
        setSubmitting(true)
        try {
            const res = await fetch(`${API_URL}/api/v1/reviews/${reviewId}/respond`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${(session as any)?.accessToken}`,
                },
                body: JSON.stringify({ response: responseText }),
            })
            if (!res.ok) {
                const err = await res.json()
                throw new Error(err.detail || 'Failed to post response')
            }
            const updated = await res.json()
            setReviews((prev) =>
                prev.map((r) =>
                    r.id === reviewId
                        ? { ...r, response: updated.response || responseText, responded_at: new Date().toISOString() }
                        : r
                )
            )
            toast.success('Response posted!')
            setRespondingTo(null)
            setResponseText('')
        } catch (err) {
            toast.error(err instanceof Error ? err.message : 'Failed to post response')
        } finally {
            setSubmitting(false)
        }
    }

    // ── Loading / Error ─────────────────────────────────────────────
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
        <div className="space-y-8">
            <div>
                <h1 className="text-2xl font-bold">Reviews</h1>
                <p className="text-muted-foreground mt-1">See what clients are saying about your service</p>
            </div>

            {/* Stats Overview */}
            <div className="grid md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6 text-center">
                        <div className="flex items-center justify-center gap-1 text-3xl font-bold text-amber-500">
                            <Star className="w-8 h-8 fill-current" />
                            {overallRating || '—'}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Overall Rating</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-3xl font-bold">{totalReviews}</p>
                        <p className="text-sm text-muted-foreground mt-1">Total Reviews</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-3xl font-bold text-green-500">{satisfactionRate}%</p>
                        <p className="text-sm text-muted-foreground mt-1">Satisfaction Rate</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="space-y-1">
                            {[5, 4, 3, 2, 1].map((star) => (
                                <div key={star} className="flex items-center gap-2 text-sm">
                                    <span className="w-3">{star}</span>
                                    <Star className="w-3 h-3 fill-amber-400 text-amber-400" />
                                    <div className="flex-1 h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-amber-400"
                                            style={{
                                                width: totalReviews > 0 ? `${(breakdown[star] / totalReviews) * 100}%` : '0%',
                                            }}
                                        />
                                    </div>
                                    <span className="w-8 text-muted-foreground">{breakdown[star]}</span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Category Averages */}
            {totalReviews > 0 && (
                <div className="grid grid-cols-3 gap-4">
                    {[
                        { label: 'Cleanliness', key: 'cleanliness_rating', color: 'bg-emerald-500' },
                        { label: 'Communication', key: 'communication_rating', color: 'bg-blue-500' },
                        { label: 'Timeliness', key: 'timeliness_rating', color: 'bg-purple-500' },
                    ].map((cat) => {
                        const vals = reviews.map(r => (r as any)[cat.key]).filter((v: any) => v != null && v > 0) as number[]
                        const avg = vals.length > 0 ? +(vals.reduce((s, v) => s + v, 0) / vals.length).toFixed(1) : 0
                        return (
                            <Card key={cat.key}>
                                <CardContent className="pt-4 pb-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-sm font-medium">{cat.label}</span>
                                        <span className="text-sm font-bold">{avg}/5</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                        <div className={`h-full ${cat.color} rounded-full transition-all`} style={{ width: `${(avg / 5) * 100}%` }} />
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Empty State */}
            {totalReviews === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Star className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-lg font-medium">No reviews yet</p>
                        <p className="text-muted-foreground mt-1">
                            Complete jobs to start receiving reviews from clients.
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Reviews List */}
            <div className="space-y-4">
                {reviews.map((review) => (
                    <Card key={review.id}>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                        <span className="text-lg font-semibold">
                                            {(review.author?.name || 'A')[0]}
                                        </span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <p className="font-semibold">{review.author?.name || 'Anonymous'}</p>
                                            <div className="flex text-amber-400">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`w-4 h-4 ${i < review.overall_rating ? 'fill-current' : 'text-slate-200'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {review.created_at
                                                ? new Date(review.created_at).toLocaleDateString('en-US', {
                                                    month: 'short',
                                                    day: 'numeric',
                                                    year: 'numeric',
                                                })
                                                : ''}
                                        </p>
                                    </div>
                                </div>
                                {!review.response && (
                                    <div className="flex gap-2">
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={() => setRespondingTo(review.id)}
                                        >
                                            <MessageSquare className="w-4 h-4 mr-1" />
                                            Respond
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="text-muted-foreground hover:text-red-500"
                                            onClick={async () => {
                                                if (!confirm('Flag this review as inappropriate?')) return
                                                setFlagging(review.id)
                                                try {
                                                    const token = (session as any)?.accessToken
                                                    const res = await fetch(`${API_URL}/api/v1/reviews/${review.id}/flag`, {
                                                        method: 'POST',
                                                        headers: {
                                                            'Content-Type': 'application/json',
                                                            Authorization: `Bearer ${token}`,
                                                        },
                                                        body: JSON.stringify({ reason: 'inappropriate' }),
                                                    })
                                                    if (res.ok) toast.success('Review flagged for moderation')
                                                    else toast.error('Failed to flag review')
                                                } catch { toast.error('Failed to flag review') }
                                                setFlagging(null)
                                            }}
                                            disabled={flagging === review.id}
                                        >
                                            {flagging === review.id ? (
                                                <Loader2 className="w-4 h-4 animate-spin" />
                                            ) : (
                                                <Flag className="w-4 h-4" />
                                            )}
                                        </Button>
                                    </div>
                                )}
                            </div>

                            {review.text && <p className="mt-4 text-muted-foreground">{review.text}</p>}

                            {/* Tags */}
                            {review.tags && review.tags.length > 0 && (
                                <div className="flex flex-wrap gap-2 mt-4">
                                    {review.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-50 dark:bg-green-500/10 text-green-700 dark:text-green-400 text-xs"
                                        >
                                            <CheckCircle className="w-3 h-3" />
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            )}

                            {/* Existing Response */}
                            {review.response && (
                                <div className="mt-4 p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10 border-l-4 border-brand-500">
                                    <p className="text-sm font-medium text-brand-700 dark:text-brand-400 mb-1">
                                        Your Response
                                    </p>
                                    <p className="text-sm">{review.response}</p>
                                </div>
                            )}

                            {/* Response Form */}
                            {respondingTo === review.id && (
                                <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50">
                                    <p className="text-sm font-medium mb-2">Write your response:</p>
                                    <Textarea
                                        value={responseText}
                                        onChange={(e) => setResponseText(e.target.value.slice(0, 500))}
                                        placeholder="Thank the client and address any concerns..."
                                        rows={3}
                                        maxLength={500}
                                    />
                                    <p className={`text-xs mt-1 ${responseText.length > 450 ? 'text-amber-500' : 'text-muted-foreground'}`}>
                                        {responseText.length}/500 characters
                                    </p>
                                    <div className="flex gap-2 mt-3">
                                        <Button
                                            size="sm"
                                            className="bg-brand-500 hover:bg-brand-600"
                                            disabled={submitting}
                                            onClick={() => handleRespond(review.id)}
                                        >
                                            {submitting && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                                            Post Response
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setRespondingTo(null)
                                                setResponseText('')
                                            }}
                                        >
                                            Cancel
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                ))}
            </div>
        </div>
    )
}
