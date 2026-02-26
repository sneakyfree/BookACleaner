'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Star, Loader2, Camera, X, Eye } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const RATING_CATEGORIES = [
    { key: 'overall_rating', label: 'Overall' },
    { key: 'cleanliness_rating', label: 'Cleanliness' },
    { key: 'communication_rating', label: 'Communication' },
    { key: 'timeliness_rating', label: 'Punctuality' },
] as const

const TAG_OPTIONS = [
    'On time', 'Thorough', 'Friendly', 'Professional',
    'Attention to detail', 'Great value', 'Respectful',
]

interface ReviewFormProps {
    jobId: string
    onSuccess?: () => void
    onCancel?: () => void
}

export function ReviewForm({ jobId, onSuccess, onCancel }: ReviewFormProps) {
    const { data: session } = useSession()
    const [ratings, setRatings] = useState<Record<string, number>>({})
    const [hoveredStar, setHoveredStar] = useState<Record<string, number>>({})
    const [text, setText] = useState('')
    const [selectedTags, setSelectedTags] = useState<string[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [isPreviewing, setIsPreviewing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const handleStarClick = (category: string, value: number) => {
        setRatings(prev => ({ ...prev, [category]: value }))
    }

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        )
    }

    const canSubmit = ratings.overall_rating && ratings.overall_rating >= 1 && text.length >= 20

    const handleSubmit = async () => {
        if (!canSubmit) return

        setIsSubmitting(true)
        setError(null)

        try {
            const token = (session as any)?.accessToken
            const res = await fetch(`${API_URL}/api/v1/reviews/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify({
                    job_id: jobId,
                    overall_rating: ratings.overall_rating,
                    cleanliness_rating: ratings.cleanliness_rating || null,
                    communication_rating: ratings.communication_rating || null,
                    timeliness_rating: ratings.timeliness_rating || null,
                    text,
                    tags: selectedTags,
                    photos: [],
                }),
            })

            if (!res.ok) {
                const err = await res.json().catch(() => ({ detail: 'Failed to submit review' }))
                throw new Error(err.detail || 'Failed to submit review')
            }

            onSuccess?.()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to submit review')
        } finally {
            setIsSubmitting(false)
        }
    }

    const renderStars = (category: string) => {
        const rating = ratings[category] || 0
        const hovered = hoveredStar[category] || 0
        return (
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map(star => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => handleStarClick(category, star)}
                        onMouseEnter={() => setHoveredStar(prev => ({ ...prev, [category]: star }))}
                        onMouseLeave={() => setHoveredStar(prev => ({ ...prev, [category]: 0 }))}
                        className="p-0.5 transition-transform hover:scale-110"
                    >
                        <Star
                            className={`w-6 h-6 transition-colors ${star <= (hovered || rating)
                                    ? 'fill-amber-400 text-amber-400'
                                    : 'text-gray-300 dark:text-gray-600'
                                }`}
                        />
                    </button>
                ))}
            </div>
        )
    }

    if (isPreviewing) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Eye className="w-5 h-5" /> Preview Your Review
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="flex items-center gap-2">
                        {[1, 2, 3, 4, 5].map(star => (
                            <Star
                                key={star}
                                className={`w-5 h-5 ${star <= (ratings.overall_rating || 0)
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-gray-300'
                                    }`}
                            />
                        ))}
                        <span className="text-sm font-medium ml-1">
                            {ratings.overall_rating}/5
                        </span>
                    </div>

                    <p className="text-sm text-gray-700 dark:text-gray-300">{text}</p>

                    {selectedTags.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                            {selectedTags.map(tag => (
                                <span key={tag} className="px-2.5 py-1 bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 text-xs rounded-full font-medium">
                                    {tag}
                                </span>
                            ))}
                        </div>
                    )}

                    <div className="flex gap-2 pt-2">
                        <Button onClick={() => setIsPreviewing(false)} variant="outline">
                            Edit
                        </Button>
                        <Button onClick={handleSubmit} disabled={isSubmitting}>
                            {isSubmitting ? (
                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                            ) : 'Submit Review'}
                        </Button>
                    </div>
                </CardContent>
            </Card>
        )
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>Leave a Review</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
                {error && (
                    <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 dark:text-red-400">
                        {error}
                    </div>
                )}

                {/* Rating Categories */}
                <div className="space-y-4">
                    {RATING_CATEGORIES.map(cat => (
                        <div key={cat.key} className="flex items-center justify-between">
                            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                {cat.label}
                                {cat.key === 'overall_rating' && <span className="text-red-500 ml-0.5">*</span>}
                            </label>
                            {renderStars(cat.key)}
                        </div>
                    ))}
                </div>

                {/* Text Review */}
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        Your Review <span className="text-red-500">*</span>
                    </label>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        rows={4}
                        maxLength={1000}
                        placeholder="Share your experience (min 20 characters)..."
                        className="w-full px-3 py-2 border rounded-xl bg-background resize-none focus:ring-2 focus:ring-brand-500 focus:border-transparent"
                    />
                    <p className={`text-xs mt-1 ${text.length < 20 ? 'text-amber-500' : 'text-gray-400'}`}>
                        {text.length}/1000 characters {text.length < 20 && `(${20 - text.length} more needed)`}
                    </p>
                </div>

                {/* Tag Selection */}
                <div>
                    <label className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block">
                        Tags (optional)
                    </label>
                    <div className="flex flex-wrap gap-2">
                        {TAG_OPTIONS.map(tag => (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedTags.includes(tag)
                                        ? 'bg-brand-500 text-white shadow-sm'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                                    }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2 pt-2">
                    {onCancel && (
                        <Button variant="ghost" onClick={onCancel}>
                            Cancel
                        </Button>
                    )}
                    <Button
                        variant="outline"
                        onClick={() => setIsPreviewing(true)}
                        disabled={!canSubmit}
                    >
                        <Eye className="w-4 h-4 mr-2" /> Preview
                    </Button>
                    <Button
                        onClick={handleSubmit}
                        disabled={!canSubmit || isSubmitting}
                    >
                        {isSubmitting ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Submitting...</>
                        ) : 'Submit Review'}
                    </Button>
                </div>
            </CardContent>
        </Card>
    )
}

export default ReviewForm
