'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Search, MapPin, Filter, DollarSign, Clock,
    ChevronRight, Star, Briefcase, SlidersHorizontal
} from 'lucide-react'
import Link from 'next/link'

interface MarketplaceJob {
    id: string
    title: string
    services: string[]
    total_price: number
    address?: string
    city?: string
    scheduled_date?: string
    description?: string
    bid_count?: number
    property?: { bedrooms?: number; bathrooms?: number }
}

export default function MarketplacePage() {
    const [jobs, setJobs] = useState<MarketplaceJob[]>([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [minPrice, setMinPrice] = useState('')
    const [maxPrice, setMaxPrice] = useState('')
    const [showFilters, setShowFilters] = useState(false)

    useEffect(() => {
        fetchJobs()
    }, [])

    const fetchJobs = async () => {
        try {
            const token = localStorage.getItem('token')
            const res = await fetch('/api/v1/bids/marketplace', {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setJobs(data.jobs || [])
            }
        } catch {
            // Use mock data for demo
            setJobs([
                { id: '1', title: 'Deep Clean - 3BR House', services: ['deep_clean'], total_price: 250, city: 'Austin, TX', scheduled_date: '2026-02-15', bid_count: 3 },
                { id: '2', title: 'Airbnb Turnover - Downtown Condo', services: ['turnover'], total_price: 120, city: 'Austin, TX', scheduled_date: '2026-02-16', bid_count: 1 },
                { id: '3', title: 'Office Cleaning - Weekly', services: ['standard', 'office'], total_price: 180, city: 'Dallas, TX', scheduled_date: '2026-02-17', bid_count: 5 },
                { id: '4', title: 'Move-Out Clean - 2BR Apartment', services: ['move_out'], total_price: 350, city: 'Houston, TX', scheduled_date: '2026-02-18', bid_count: 0 },
                { id: '5', title: 'Post-Construction Cleanup', services: ['post_construction'], total_price: 500, city: 'San Antonio, TX', scheduled_date: '2026-02-19', bid_count: 2 },
            ])
        } finally {
            setLoading(false)
        }
    }

    const filteredJobs = jobs.filter(job => {
        if (search && !job.title.toLowerCase().includes(search.toLowerCase()) &&
            !job.city?.toLowerCase().includes(search.toLowerCase())) return false
        if (minPrice && job.total_price < parseFloat(minPrice)) return false
        if (maxPrice && job.total_price > parseFloat(maxPrice)) return false
        return true
    })

    const getServiceBadgeColor = (service: string) => {
        const colors: Record<string, string> = {
            deep_clean: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-300',
            turnover: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-300',
            standard: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-300',
            move_out: 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-300',
            post_construction: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-300',
            office: 'bg-teal-100 text-teal-700 dark:bg-teal-500/20 dark:text-teal-300',
        }
        return colors[service] || 'bg-gray-100 text-gray-700 dark:bg-gray-500/20 dark:text-gray-300'
    }

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Marketplace</h1>
                    <p className="text-muted-foreground mt-1">Browse open jobs and submit bids</p>
                </div>
                <Link href="/cleaner/bids">
                    <Button variant="outline">My Bids</Button>
                </Link>
            </div>

            {/* Search & Filters */}
            <Card>
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <input
                                type="text"
                                placeholder="Search jobs by title, city..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2.5 border rounded-xl bg-background focus:ring-2 focus:ring-brand-500 outline-none transition"
                            />
                        </div>
                        <Button
                            variant="outline"
                            onClick={() => setShowFilters(!showFilters)}
                            className="gap-2"
                        >
                            <SlidersHorizontal className="w-4 h-4" />
                            Filters
                        </Button>
                    </div>

                    {showFilters && (
                        <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-4 gap-4">
                            <div>
                                <label className="text-sm font-medium mb-1 block">Min Price</label>
                                <input
                                    type="number"
                                    placeholder="$0"
                                    value={minPrice}
                                    onChange={(e) => setMinPrice(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-medium mb-1 block">Max Price</label>
                                <input
                                    type="number"
                                    placeholder="$1000"
                                    value={maxPrice}
                                    onChange={(e) => setMaxPrice(e.target.value)}
                                    className="w-full px-3 py-2 border rounded-lg bg-background text-sm"
                                />
                            </div>
                        </div>
                    )}
                </CardContent>
            </Card>

            {/* Results Count */}
            <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{filteredJobs.length} jobs available</span>
                <span>Sorted by newest first</span>
            </div>

            {/* Job Listings */}
            {loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map(i => (
                        <div key={i} className="h-32 bg-muted animate-pulse rounded-xl" />
                    ))}
                </div>
            ) : filteredJobs.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-lg font-medium">No jobs found</p>
                        <p className="text-muted-foreground mt-1">Try adjusting your filters</p>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredJobs.map((job) => (
                        <Card key={job.id} className="hover:shadow-md transition-shadow cursor-pointer group">
                            <CardContent className="p-5">
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h3 className="font-semibold text-lg group-hover:text-brand-600 transition-colors">
                                                {job.title}
                                            </h3>
                                        </div>
                                        <div className="flex flex-wrap gap-2 mb-3">
                                            {job.services.map(s => (
                                                <span key={s} className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${getServiceBadgeColor(s)}`}>
                                                    {s.replace(/_/g, ' ')}
                                                </span>
                                            ))}
                                        </div>
                                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                                            {job.city && (
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3.5 h-3.5" /> {job.city}
                                                </span>
                                            )}
                                            {job.scheduled_date && (
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3.5 h-3.5" /> {new Date(job.scheduled_date).toLocaleDateString()}
                                                </span>
                                            )}
                                            <span className="flex items-center gap-1">
                                                <Star className="w-3.5 h-3.5" /> {job.bid_count || 0} bids
                                            </span>
                                        </div>
                                    </div>
                                    <div className="text-right flex flex-col items-end gap-2">
                                        <p className="text-xl font-bold text-brand-600">${job.total_price}</p>
                                        <Link href={`/cleaner/marketplace/${job.id}`}>
                                            <Button size="sm" className="gap-1">
                                                Bid Now <ChevronRight className="w-4 h-4" />
                                            </Button>
                                        </Link>
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
