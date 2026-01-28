'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
    Star,
    ThumbsUp,
    ThumbsDown,
    CheckCircle,
    AlertCircle,
    MessageSquare,
} from 'lucide-react'

export default function CleanerReviewsPage() {
    const stats = {
        overallRating: 4.9,
        totalReviews: 156,
        satisfactionRate: 98,
        breakdown: {
            5: 142,
            4: 10,
            3: 3,
            2: 1,
            1: 0,
        },
    }

    const reviews = [
        {
            id: '1',
            client: 'John D.',
            rating: 5,
            date: '2 weeks ago',
            property: 'Lake House',
            service: 'Deep Clean',
            text: 'Maria did an amazing job! The house was spotless and she was very professional. Will definitely book again.',
            tags: ['On Time', 'Thorough', 'Professional'],
            responded: false,
        },
        {
            id: '2',
            client: 'Sarah M.',
            rating: 5,
            date: '1 month ago',
            property: 'Downtown Condo',
            service: 'Airbnb Turnover',
            text: 'Excellent service. Always on time and very thorough. Been using Maria for my Airbnb turnovers for 6 months now.',
            tags: ['Quick', 'Reliable', 'Great Communication'],
            responded: true,
            response: 'Thank you so much Sarah! It\'s always a pleasure working with you.',
        },
        {
            id: '3',
            client: 'Mike R.',
            rating: 4,
            date: '2 months ago',
            property: 'Beach Cottage',
            service: 'Standard Clean',
            text: 'Good cleaning overall. A couple small spots were missed but overall very happy with the service.',
            tags: ['Good Value'],
            responded: false,
        },
    ]

    const [respondingTo, setRespondingTo] = useState<string | null>(null)
    const [response, setResponse] = useState('')

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
                            {stats.overallRating}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">Overall Rating</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-3xl font-bold">{stats.totalReviews}</p>
                        <p className="text-sm text-muted-foreground mt-1">Total Reviews</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6 text-center">
                        <p className="text-3xl font-bold text-green-500">{stats.satisfactionRate}%</p>
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
                                                width: `${(stats.breakdown[star as keyof typeof stats.breakdown] / stats.totalReviews) * 100}%`,
                                            }}
                                        />
                                    </div>
                                    <span className="w-8 text-muted-foreground">
                                        {stats.breakdown[star as keyof typeof stats.breakdown]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Reviews List */}
            <div className="space-y-4">
                {reviews.map((review) => (
                    <Card key={review.id}>
                        <CardContent className="p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex gap-4">
                                    <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                        <span className="text-lg font-semibold">{review.client[0]}</span>
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-3">
                                            <p className="font-semibold">{review.client}</p>
                                            <div className="flex text-amber-400">
                                                {[...Array(5)].map((_, i) => (
                                                    <Star
                                                        key={i}
                                                        className={`w-4 h-4 ${i < review.rating ? 'fill-current' : 'text-slate-200'}`}
                                                    />
                                                ))}
                                            </div>
                                        </div>
                                        <p className="text-sm text-muted-foreground">
                                            {review.service} at {review.property} • {review.date}
                                        </p>
                                    </div>
                                </div>
                                {!review.responded && (
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={() => setRespondingTo(review.id)}
                                    >
                                        <MessageSquare className="w-4 h-4 mr-1" />
                                        Respond
                                    </Button>
                                )}
                            </div>

                            <p className="mt-4 text-muted-foreground">{review.text}</p>

                            {/* Tags */}
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

                            {/* Owner Response */}
                            {review.responded && review.response && (
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
                                        value={response}
                                        onChange={(e) => setResponse(e.target.value)}
                                        placeholder="Thank the client and address any concerns..."
                                        rows={3}
                                    />
                                    <div className="flex gap-2 mt-3">
                                        <Button
                                            size="sm"
                                            className="bg-brand-500 hover:bg-brand-600"
                                            onClick={() => {
                                                // Would save response
                                                setRespondingTo(null)
                                                setResponse('')
                                            }}
                                        >
                                            Post Response
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => {
                                                setRespondingTo(null)
                                                setResponse('')
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
