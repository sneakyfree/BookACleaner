'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import AdSlot from '@/components/ads/AdSlot'
import {
    Star,
    Shield,
    MapPin,
    Clock,
    CheckCircle,
    Calendar,
    MessageSquare,
    ChevronRight,
    Award,
    TrendingUp,
    ThumbsUp,
    ArrowLeft,
    Loader2,
    AlertCircle,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

const tierColors: Record<number, string> = {
    1: 'bg-gray-500',
    2: 'bg-blue-500',
    3: 'bg-green-500',
    4: 'bg-amber-500',
    5: 'bg-purple-500',
}

const tierNames: Record<number, string> = {
    1: 'Starter',
    2: 'Verified',
    3: 'Professional',
    4: 'Certified',
    5: 'Elite',
}

interface CleanerProfile {
    id: string
    businessName: string
    name?: string
    bio?: string
    profilePhoto?: string | null
    verificationTier: number
    overallRating: number
    totalReviews: number
    completedJobs: number
    hourlyRate?: number
    services: string[]
    serviceAreas: string[]
    onTimeRate: number
    repeatClientRate: number
}

interface ReviewItem {
    id: string
    overall_rating: number
    text?: string
    created_at?: string
    author?: { name: string; avatar?: string } | null
}

export default function CleanerProfilePage() {
    const params = useParams()
    const cleanerId = params.cleanerId as string

    const [cleaner, setCleaner] = useState<CleanerProfile | null>(null)
    const [reviews, setReviews] = useState<ReviewItem[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        async function fetchProfile() {
            try {
                setError(null)

                // Fetch cleaner profile
                const profileRes = await fetch(`${API_URL}/api/v1/cleaners/${cleanerId}`)
                if (!profileRes.ok) throw new Error(`Cleaner not found (${profileRes.status})`)
                const profileData = await profileRes.json()
                setCleaner(profileData)

                // Fetch reviews
                const reviewsRes = await fetch(`${API_URL}/api/v1/cleaners/${cleanerId}/reviews?limit=5`)
                if (reviewsRes.ok) {
                    const reviewsData = await reviewsRes.json()
                    setReviews(reviewsData.reviews || [])
                }
            } catch (err) {
                console.error('Failed to fetch cleaner:', err)
                setError(err instanceof Error ? err.message : 'Failed to load cleaner profile')
            } finally {
                setLoading(false)
            }
        }

        if (cleanerId) fetchProfile()
    }, [cleanerId])

    if (loading) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        )
    }

    if (error || !cleaner) {
        return (
            <div className="min-h-screen bg-slate-50 dark:bg-slate-900 flex items-center justify-center">
                <Card className="max-w-md w-full">
                    <CardContent className="py-12 text-center">
                        <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                        <p className="text-lg font-medium text-red-600">{error || 'Cleaner not found'}</p>
                        <Link href="/cleaners">
                            <Button className="mt-4">
                                <ArrowLeft className="w-4 h-4 mr-2" />
                                Back to search
                            </Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        )
    }

    const displayName = cleaner.businessName || cleaner.name || 'Cleaner'
    const tier = cleaner.verificationTier || 1
    const startingPrice = cleaner.hourlyRate || 100

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 py-6">
                <div className="container mx-auto px-4">
                    <Link href="/cleaners" className="inline-flex items-center text-white/80 hover:text-white mb-4">
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to search
                    </Link>
                </div>
            </div>

            <div className="container mx-auto px-4 -mt-8">
                <div className="grid lg:grid-cols-3 gap-8">
                    {/* Main Content */}
                    <div className="lg:col-span-2 space-y-6">
                        {/* Profile Card */}
                        <Card>
                            <CardContent className="p-6">
                                <div className="flex flex-col md:flex-row gap-6">
                                    <div className="w-32 h-32 rounded-2xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0 overflow-hidden">
                                        {cleaner.profilePhoto ? (
                                            <img src={cleaner.profilePhoto} alt={displayName} className="w-full h-full object-cover" />
                                        ) : (
                                            <span className="text-4xl font-bold text-brand-600">
                                                {displayName[0]}
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex-1">
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-3">
                                                    <h1 className="text-2xl font-bold">{displayName}</h1>
                                                    <span className={`px-3 py-1 rounded-full text-sm font-medium text-white ${tierColors[tier] || tierColors[1]}`}>
                                                        {tierNames[tier] || tierNames[1]}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-4 mt-2">
                                                    <span className="flex items-center text-amber-500">
                                                        <Star className="w-5 h-5 fill-current mr-1" />
                                                        <span className="font-semibold">{cleaner.overallRating || '—'}</span>
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {cleaner.totalReviews} review{cleaner.totalReviews !== 1 ? 's' : ''}
                                                    </span>
                                                    <span className="text-muted-foreground">
                                                        {cleaner.completedJobs} jobs
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        {cleaner.bio && <p className="mt-4 text-muted-foreground">{cleaner.bio}</p>}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Stats */}
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Star className="w-6 h-6 mx-auto text-amber-500 mb-2" />
                                    <p className="text-2xl font-bold">{cleaner.overallRating || '—'}</p>
                                    <p className="text-xs text-muted-foreground">Rating</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <TrendingUp className="w-6 h-6 mx-auto text-green-500 mb-2" />
                                    <p className="text-2xl font-bold">{cleaner.onTimeRate}%</p>
                                    <p className="text-xs text-muted-foreground">On-Time Rate</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <ThumbsUp className="w-6 h-6 mx-auto text-amber-500 mb-2" />
                                    <p className="text-2xl font-bold">{cleaner.repeatClientRate}%</p>
                                    <p className="text-xs text-muted-foreground">Repeat Clients</p>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardContent className="p-4 text-center">
                                    <Calendar className="w-6 h-6 mx-auto text-purple-500 mb-2" />
                                    <p className="text-2xl font-bold">{cleaner.completedJobs}</p>
                                    <p className="text-xs text-muted-foreground">Jobs Done</p>
                                </CardContent>
                            </Card>
                        </div>

                        {/* Services */}
                        {cleaner.services.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle>Services Offered</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="flex flex-wrap gap-2">
                                        {cleaner.services.map((service) => (
                                            <span
                                                key={service}
                                                className="px-3 py-2 rounded-lg bg-slate-50 dark:bg-slate-800/50 border text-sm font-medium"
                                            >
                                                {service}
                                            </span>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Reviews */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between">
                                <CardTitle>Reviews ({cleaner.totalReviews})</CardTitle>
                            </CardHeader>
                            <CardContent>
                                {reviews.length === 0 ? (
                                    <p className="text-muted-foreground text-center py-6">No reviews yet</p>
                                ) : (
                                    <div className="space-y-6">
                                        {reviews.map((review) => (
                                            <div key={review.id} className="border-b pb-6 last:border-0 last:pb-0">
                                                <div className="flex items-center justify-between mb-2">
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-10 h-10 rounded-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                                                            {(review.author?.name || 'A')[0]}
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{review.author?.name || 'Anonymous'}</p>
                                                            <p className="text-xs text-muted-foreground">
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
                                                    <div className="flex items-center text-amber-500">
                                                        {[...Array(5)].map((_, i) => (
                                                            <Star
                                                                key={i}
                                                                className={`w-4 h-4 ${i < review.overall_rating ? 'fill-current' : 'text-slate-200'}`}
                                                            />
                                                        ))}
                                                    </div>
                                                </div>
                                                {review.text && <p className="text-muted-foreground">{review.text}</p>}
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </CardContent>
                        </Card>
                    </div>

                    {/* Sidebar */}
                    <div className="space-y-6">
                        {/* Booking Card */}
                        <Card className="sticky top-4">
                            <CardContent className="p-6">
                                <div className="text-center mb-6">
                                    <p className="text-3xl font-bold">${startingPrice}</p>
                                    <p className="text-muted-foreground">
                                        {cleaner.hourlyRate ? 'per hour' : 'starting price'}
                                    </p>
                                </div>

                                <Link href={`/book/${cleaner.id}`}>
                                    <Button className="w-full bg-brand-500 hover:bg-brand-600 h-12 text-lg mb-4">
                                        <Calendar className="w-5 h-5 mr-2" />
                                        Book Now
                                    </Button>
                                </Link>

                                <Button variant="outline" className="w-full h-12">
                                    <MessageSquare className="w-5 h-5 mr-2" />
                                    Message
                                </Button>
                            </CardContent>
                        </Card>

                        {/* Verification */}
                        <Card>
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Shield className="w-5 h-5 text-brand-500" />
                                    Verification
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <span className="text-sm">Verification Tier</span>
                                    <span className={`px-2 py-0.5 rounded-full text-xs text-white ${tierColors[tier]}`}>
                                        {tierNames[tier]}
                                    </span>
                                </div>
                                {tier >= 2 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Identity Verified</span>
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    </div>
                                )}
                                {tier >= 3 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Background Check</span>
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    </div>
                                )}
                                {tier >= 4 && (
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm">Licensed & Insured</span>
                                        <CheckCircle className="w-5 h-5 text-green-500" />
                                    </div>
                                )}
                            </CardContent>
                        </Card>

                        {/* Service Areas */}
                        {cleaner.serviceAreas.length > 0 && (
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-base flex items-center gap-2">
                                        <MapPin className="w-5 h-5 text-brand-500" />
                                        Service Areas
                                    </CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {cleaner.serviceAreas.map((area) => (
                                            <div key={area} className="flex items-center gap-2 text-sm">
                                                <CheckCircle className="w-4 h-4 text-brand-500" />
                                                {area}
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        )}

                        {/* Ad Slot */}
                        <AdSlot format="rectangle" demo />
                    </div>
                </div>
            </div>
        </div>
    )
}
