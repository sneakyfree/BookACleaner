'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { CleanerBadges } from '@/components/common/CleanerBadges'
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
  userId?: string
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

export default function CleanerProfileClient() {
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
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="text-brand-600 h-8 w-8 animate-spin" />
      </div>
    )
  }

  if (error || !cleaner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Card className="w-full max-w-md">
          <CardContent className="py-12 text-center">
            <AlertCircle className="mx-auto mb-4 h-12 w-12 text-red-500" />
            <p className="text-lg font-medium text-red-600">{error || 'Cleaner not found'}</p>
            <Link href="/cleaners">
              <Button className="mt-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
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
          <Link
            href="/cleaners"
            className="mb-4 inline-flex items-center text-white/80 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to search
          </Link>
        </div>
      </div>

      <div className="container mx-auto -mt-8 px-4">
        <div className="grid gap-8 lg:grid-cols-3">
          {/* Main Content */}
          <div className="space-y-6 lg:col-span-2">
            {/* Profile Card */}
            <Card>
              <CardContent className="p-6">
                <div className="flex flex-col gap-6 md:flex-row">
                  <div className="bg-brand-100 dark:bg-brand-500/20 flex h-32 w-32 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl">
                    {cleaner.profilePhoto ? (
                      <img
                        src={cleaner.profilePhoto}
                        alt={displayName}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="text-brand-600 text-4xl font-bold">{displayName[0]}</span>
                    )}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-3">
                          <h1 className="text-2xl font-bold">{displayName}</h1>
                          <span
                            className={`rounded-full px-3 py-1 text-sm font-medium text-white ${tierColors[tier] || tierColors[1]}`}
                          >
                            {tierNames[tier] || tierNames[1]}
                          </span>
                        </div>
                        {/* Earned badges: a trust signal for prospective
                            clients, so this must render for logged-out
                            visitors too (the endpoint is public). */}
                        <CleanerBadges userId={cleaner.userId} size="md" className="mt-3" />
                        <div className="mt-2 flex items-center gap-4">
                          <span className="flex items-center text-amber-500">
                            <Star className="mr-1 h-5 w-5 fill-current" />
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

                    {cleaner.bio && <p className="text-muted-foreground mt-4">{cleaner.bio}</p>}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
              <Card>
                <CardContent className="p-4 text-center">
                  <Star className="mx-auto mb-2 h-6 w-6 text-amber-500" />
                  <p className="text-2xl font-bold">{cleaner.overallRating || '—'}</p>
                  <p className="text-muted-foreground text-xs">Rating</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <TrendingUp className="mx-auto mb-2 h-6 w-6 text-green-500" />
                  <p className="text-2xl font-bold">{cleaner.onTimeRate}%</p>
                  <p className="text-muted-foreground text-xs">On-Time Rate</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <ThumbsUp className="mx-auto mb-2 h-6 w-6 text-amber-500" />
                  <p className="text-2xl font-bold">{cleaner.repeatClientRate}%</p>
                  <p className="text-muted-foreground text-xs">Repeat Clients</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Calendar className="mx-auto mb-2 h-6 w-6 text-purple-500" />
                  <p className="text-2xl font-bold">{cleaner.completedJobs}</p>
                  <p className="text-muted-foreground text-xs">Jobs Done</p>
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
                        className="rounded-lg border bg-slate-50 px-3 py-2 text-sm font-medium dark:bg-slate-800/50"
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
                  <p className="text-muted-foreground py-6 text-center">No reviews yet</p>
                ) : (
                  <div className="space-y-6">
                    {reviews.map((review) => (
                      <div key={review.id} className="border-b pb-6 last:border-0 last:pb-0">
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-200 dark:bg-slate-700">
                              {(review.author?.name || 'A')[0]}
                            </div>
                            <div>
                              <p className="font-medium">{review.author?.name || 'Anonymous'}</p>
                              <p className="text-muted-foreground text-xs">
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
                                className={`h-4 w-4 ${i < review.overall_rating ? 'fill-current' : 'text-slate-200'}`}
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
                <div className="mb-6 text-center">
                  <p className="text-3xl font-bold">${startingPrice}</p>
                  <p className="text-muted-foreground">
                    {cleaner.hourlyRate ? 'per hour' : 'starting price'}
                  </p>
                </div>

                <Link href={`/book/${cleaner.id}`}>
                  <Button className="bg-brand-500 hover:bg-brand-600 mb-4 h-12 w-full text-lg">
                    <Calendar className="mr-2 h-5 w-5" />
                    Book Now
                  </Button>
                </Link>

                <Button variant="outline" className="h-12 w-full">
                  <MessageSquare className="mr-2 h-5 w-5" />
                  Message
                </Button>
              </CardContent>
            </Card>

            {/* Verification */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Shield className="text-brand-500 h-5 w-5" />
                  Verification
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm">Verification Tier</span>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs text-white ${tierColors[tier]}`}
                  >
                    {tierNames[tier]}
                  </span>
                </div>
                {tier >= 2 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Identity Verified</span>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                )}
                {tier >= 3 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Background Check</span>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                )}
                {tier >= 4 && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm">Licensed & Insured</span>
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Service Areas */}
            {cleaner.serviceAreas.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-base">
                    <MapPin className="text-brand-500 h-5 w-5" />
                    Service Areas
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {cleaner.serviceAreas.map((area) => (
                      <div key={area} className="flex items-center gap-2 text-sm">
                        <CheckCircle className="text-brand-500 h-4 w-4" />
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
