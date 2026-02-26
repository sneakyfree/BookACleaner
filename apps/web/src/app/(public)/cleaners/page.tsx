'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import AdSlot from '@/components/ads/AdSlot'
import {
    Search,
    MapPin,
    Star,
    Shield,
    Filter,
    ChevronDown,
    CheckCircle,
    Calendar,
    Loader2,
    AlertCircle,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface CleanerResult {
    id: string
    businessName: string
    bio?: string
    profilePhoto?: string | null
    verificationTier: number
    overallRating: number
    totalReviews: number
    completedJobs: number
    hourlyRate?: number
    services: string[]
    serviceAreas: string[]
    responseTimeMinutes?: number
}

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

export default function SearchCleanersPage() {
    const searchParams = useSearchParams()
    const initialLocation = searchParams.get('location') || ''
    const initialService = searchParams.get('service') || ''

    const [location, setLocation] = useState(initialLocation)
    const [service, setService] = useState(initialService)
    const [showFilters, setShowFilters] = useState(false)
    const [filters, setFilters] = useState({
        minRating: 0,
        minTier: 1,
        priceMax: 500,
    })

    const [cleaners, setCleaners] = useState<CleanerResult[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const fetchCleaners = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const params = new URLSearchParams()
            if (location) params.set('location', location)
            if (service) params.set('service', service)
            if (filters.minRating > 0) params.set('minRating', String(filters.minRating))
            if (filters.minTier > 1) params.set('minTier', String(filters.minTier))

            const res = await fetch(`${API_URL}/api/v1/cleaners/?${params.toString()}`)
            if (!res.ok) throw new Error(`Failed to load cleaners (${res.status})`)

            const data = await res.json()
            setCleaners(data.cleaners || [])
        } catch (err) {
            console.error('Failed to fetch cleaners:', err)
            setError(err instanceof Error ? err.message : 'Failed to load cleaners')
        } finally {
            setLoading(false)
        }
    }, [location, service, filters.minRating, filters.minTier])

    // Initial fetch and re-fetch when filters change
    useEffect(() => {
        fetchCleaners()
    }, [fetchCleaners])

    // Client-side filter for instant responsiveness between fetches
    const filteredCleaners = cleaners.filter((cleaner) => {
        if (filters.minRating && cleaner.overallRating < filters.minRating) return false
        if (filters.minTier && cleaner.verificationTier < filters.minTier) return false
        return true
    })

    return (
        <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
            {/* Search Header */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-700 py-8">
                <div className="container mx-auto px-4">
                    <h1 className="text-2xl font-bold text-white mb-6">Find Cleaning Professionals</h1>

                    <div className="flex flex-col md:flex-row gap-4">
                        <div className="flex-1 relative">
                            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                value={location}
                                onChange={(e) => setLocation(e.target.value)}
                                placeholder="Enter your location or ZIP code"
                                className="pl-10 bg-white border-0 h-12"
                            />
                        </div>
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                            <Input
                                value={service}
                                onChange={(e) => setService(e.target.value)}
                                placeholder="What service do you need?"
                                className="pl-10 bg-white border-0 h-12"
                            />
                        </div>
                        <Button onClick={fetchCleaners} className="h-12 px-8 bg-brand-500 hover:bg-brand-600">
                            <Search className="w-4 h-4 mr-2" />
                            Search
                        </Button>
                    </div>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8">
                <div className="flex flex-col lg:flex-row gap-8">
                    {/* Filters Sidebar */}
                    <div className="lg:w-64 flex-shrink-0">
                        <Card>
                            <CardContent className="p-4">
                                <div className="flex items-center justify-between mb-4">
                                    <h2 className="font-semibold">Filters</h2>
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => setShowFilters(!showFilters)}
                                        className="lg:hidden"
                                    >
                                        <Filter className="w-4 h-4" />
                                    </Button>
                                </div>

                                <div className={`space-y-6 ${showFilters ? 'block' : 'hidden lg:block'}`}>
                                    {/* Rating Filter */}
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Minimum Rating</label>
                                        <div className="flex gap-2">
                                            {[0, 4, 4.5, 4.8].map((rating) => (
                                                <button
                                                    key={rating}
                                                    onClick={() => setFilters({ ...filters, minRating: rating })}
                                                    className={`px-3 py-2 rounded-full text-sm min-h-[36px] touch-manipulation ${filters.minRating === rating
                                                        ? 'bg-brand-500 text-white'
                                                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'
                                                        }`}
                                                >
                                                    {rating === 0 ? 'Any' : `${rating}+`}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Verification Tier */}
                                    <div>
                                        <label className="text-sm font-medium mb-2 block">Verification Level</label>
                                        <div className="space-y-2">
                                            {[1, 2, 3, 4, 5].map((tier) => (
                                                <button
                                                    key={tier}
                                                    onClick={() => setFilters({ ...filters, minTier: tier })}
                                                    className={`w-full flex items-center gap-2 px-3 py-3 rounded-lg text-sm min-h-[44px] touch-manipulation ${filters.minTier === tier
                                                        ? 'bg-brand-50 dark:bg-brand-500/10 text-brand-600'
                                                        : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                                        }`}
                                                >
                                                    <div className={`w-3 h-3 rounded-full ${tierColors[tier] || 'bg-gray-500'}`} />
                                                    {tierNames[tier] || 'Unknown'}+
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <Button
                                        variant="outline"
                                        className="w-full"
                                        onClick={() => setFilters({ minRating: 0, minTier: 1, priceMax: 500 })}
                                    >
                                        Clear Filters
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Results */}
                    <div className="flex-1">
                        {loading ? (
                            <div className="flex items-center justify-center py-20">
                                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
                            </div>
                        ) : error ? (
                            <Card>
                                <CardContent className="py-12 text-center">
                                    <AlertCircle className="w-12 h-12 mx-auto text-red-500 mb-4" />
                                    <p className="text-lg font-medium text-red-600">{error}</p>
                                    <Button className="mt-4" onClick={fetchCleaners}>
                                        Try Again
                                    </Button>
                                </CardContent>
                            </Card>
                        ) : (
                            <>
                                <div className="flex items-center justify-between mb-6">
                                    <p className="text-muted-foreground">
                                        <strong>{filteredCleaners.length}</strong> cleaners available
                                    </p>
                                    <Button variant="ghost" size="sm">
                                        Sort by: Recommended <ChevronDown className="w-4 h-4 ml-1" />
                                    </Button>
                                </div>

                                {filteredCleaners.length === 0 ? (
                                    <Card>
                                        <CardContent className="py-12 text-center">
                                            <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                                            <p className="text-lg font-medium">No cleaners found</p>
                                            <p className="text-muted-foreground mt-1">
                                                Try adjusting your search or filters
                                            </p>
                                        </CardContent>
                                    </Card>
                                ) : (
                                    <div className="space-y-4">
                                        {filteredCleaners.map((cleaner) => (
                                            <Link key={cleaner.id} href={`/cleaners/${cleaner.id}`}>
                                                <Card className="hover:shadow-lg transition-shadow cursor-pointer">
                                                    <CardContent className="p-4 sm:p-6">
                                                        <div className="flex flex-col sm:flex-row gap-4 sm:gap-6">
                                                            {/* Profile Photo */}
                                                            <div className="w-16 h-16 sm:w-24 sm:h-24 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                                                                <span className="text-xl sm:text-3xl font-bold text-brand-600">
                                                                    {cleaner.businessName?.[0] || '?'}
                                                                </span>
                                                            </div>

                                                            {/* Info */}
                                                            <div className="flex-1 min-w-0">
                                                                <div className="flex items-start justify-between">
                                                                    <div>
                                                                        <div className="flex items-center gap-2">
                                                                            <h3 className="text-lg font-semibold">{cleaner.businessName}</h3>
                                                                            <span
                                                                                className={`px-2 py-0.5 rounded-full text-xs font-medium text-white ${tierColors[cleaner.verificationTier] || 'bg-gray-500'
                                                                                    }`}
                                                                            >
                                                                                {tierNames[cleaner.verificationTier] || 'Starter'}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-3 mt-1 text-sm">
                                                                            <span className="flex items-center text-amber-500">
                                                                                <Star className="w-4 h-4 fill-current mr-1" />
                                                                                {cleaner.overallRating}
                                                                            </span>
                                                                            <span className="text-muted-foreground">
                                                                                ({cleaner.totalReviews} reviews)
                                                                            </span>
                                                                            <span className="text-muted-foreground">
                                                                                • {cleaner.completedJobs} jobs
                                                                            </span>
                                                                        </div>
                                                                    </div>
                                                                    {cleaner.hourlyRate && (
                                                                        <div className="text-right">
                                                                            <p className="text-lg font-semibold">
                                                                                ${cleaner.hourlyRate}+
                                                                            </p>
                                                                            <p className="text-xs text-muted-foreground">per hour</p>
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {cleaner.bio && (
                                                                    <p className="text-muted-foreground text-sm mt-2 line-clamp-2">
                                                                        {cleaner.bio}
                                                                    </p>
                                                                )}

                                                                {/* Services */}
                                                                {cleaner.services.length > 0 && (
                                                                    <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                                                                        {cleaner.services.slice(0, 3).map((svc, i) => (
                                                                            <span key={svc}>
                                                                                {svc}
                                                                                {i < Math.min(cleaner.services.length, 3) - 1 && ' •'}
                                                                            </span>
                                                                        ))}
                                                                        {cleaner.services.length > 3 && (
                                                                            <span>+{cleaner.services.length - 3} more</span>
                                                                        )}
                                                                    </div>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </CardContent>
                                                </Card>
                                            </Link>
                                        ))}
                                    </div>
                                )}

                                    {/* Ad after results */}
                                {cleaners.length > 2 && (
                                    <AdSlot format="horizontal" className="my-4" demo />
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}

