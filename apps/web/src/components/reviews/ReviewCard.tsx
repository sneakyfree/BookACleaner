'use client'

import { Star, MessageSquare } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export interface ReviewData {
    id: string
    overall_rating: number
    cleanliness_rating?: number
    communication_rating?: number
    timeliness_rating?: number
    text?: string
    tags?: string[]
    photos?: string[]
    response?: string
    responded_at?: string
    revealed?: boolean
    created_at: string
    author?: {
        name: string
        avatar?: string | null
    }
}

interface ReviewCardProps {
    review: ReviewData
    showResponse?: boolean
}

export function ReviewCard({ review, showResponse = true }: ReviewCardProps) {
    const timeAgo = (dateStr: string) => {
        const now = new Date()
        const date = new Date(dateStr)
        const diffMs = now.getTime() - date.getTime()
        const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
        if (diffDays === 0) return 'Today'
        if (diffDays === 1) return 'Yesterday'
        if (diffDays < 30) return `${diffDays} days ago`
        if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`
        return `${Math.floor(diffDays / 365)} years ago`
    }

    const subRatings = [
        { label: 'Cleanliness', value: review.cleanliness_rating },
        { label: 'Communication', value: review.communication_rating },
        { label: 'Punctuality', value: review.timeliness_rating },
    ].filter(r => r.value)

    return (
        <Card className="hover:shadow-md transition-shadow">
            <CardContent className="p-5">
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400 font-semibold text-sm">
                            {review.author?.avatar ? (
                                <img src={review.author.avatar} alt="" className="w-10 h-10 rounded-full object-cover" />
                            ) : (
                                review.author?.name?.charAt(0)?.toUpperCase() || '?'
                            )}
                        </div>
                        <div>
                            <p className="font-semibold text-sm">{review.author?.name || 'Anonymous'}</p>
                            <p className="text-xs text-muted-foreground">{timeAgo(review.created_at)}</p>
                        </div>
                    </div>

                    {/* Overall Stars */}
                    <div className="flex items-center gap-1">
                        {[1, 2, 3, 4, 5].map(star => (
                            <Star
                                key={star}
                                className={`w-4 h-4 ${star <= review.overall_rating
                                        ? 'fill-amber-400 text-amber-400'
                                        : 'text-gray-300 dark:text-gray-600'
                                    }`}
                            />
                        ))}
                    </div>
                </div>

                {/* Sub-ratings */}
                {subRatings.length > 0 && (
                    <div className="flex gap-4 mb-3">
                        {subRatings.map(r => (
                            <div key={r.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                                <span>{r.label}</span>
                                <div className="flex gap-0.5">
                                    {[1, 2, 3, 4, 5].map(s => (
                                        <Star
                                            key={s}
                                            className={`w-3 h-3 ${s <= (r.value || 0) ? 'fill-amber-400 text-amber-400' : 'text-gray-300'
                                                }`}
                                        />
                                    ))}
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {/* Review Text */}
                {review.text && (
                    <p className="text-sm text-gray-700 dark:text-gray-300 mb-3 leading-relaxed">
                        {review.text}
                    </p>
                )}

                {/* Tags */}
                {review.tags && review.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                        {review.tags.map(tag => (
                            <span
                                key={tag}
                                className="px-2 py-0.5 bg-brand-50 dark:bg-brand-500/10 text-brand-600 dark:text-brand-400 text-xs rounded-full"
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                {/* Response from cleaner */}
                {showResponse && review.response && (
                    <div className="mt-3 p-3 bg-gray-50 dark:bg-gray-800/50 rounded-lg border-l-2 border-brand-500">
                        <div className="flex items-center gap-1.5 mb-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-brand-500" />
                            <span className="text-xs font-medium text-brand-600 dark:text-brand-400">Response</span>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">{review.response}</p>
                    </div>
                )}
            </CardContent>
        </Card>
    )
}

export default ReviewCard
