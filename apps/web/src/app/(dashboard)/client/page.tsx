'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Calendar,
    Home,
    Star,
    Plus,
    ArrowRight,
    Clock,
    MapPin,
    Loader2,
} from 'lucide-react'
import Link from 'next/link'

interface Job {
    id: string
    services: string[]
    property_id?: string
    scheduled_date: string
    scheduled_time: string
    status: string
    total_price: number
    cleaner_id?: string
}

interface Property {
    id: string
    address: string
    property_type: string
    sqft?: number
    bedrooms?: number
    bathrooms?: number
    name?: string
}

export default function ClientDashboard() {
    const { data: session } = useSession()
    const [jobs, setJobs] = useState<Job[]>([])
    const [properties, setProperties] = useState<Property[]>([])
    const [loading, setLoading] = useState(true)

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    useEffect(() => {
        const token = (session as any)?.accessToken
        if (!token) {
            setLoading(false)
            return
        }

        async function fetchData() {
            try {
                const headers = {
                    Authorization: `Bearer ${(session as any)?.accessToken}`,
                }
                const [jobsRes, propsRes] = await Promise.all([
                    fetch(`${API_URL}/api/v1/jobs/`, { headers }),
                    fetch(`${API_URL}/api/v1/properties/`, { headers }),
                ])

                if (jobsRes.ok) {
                    const jobsData = await jobsRes.json()
                    setJobs(jobsData)
                }

                if (propsRes.ok) {
                    const propsData = await propsRes.json()
                    setProperties(propsData)
                }
            } catch (error) {
                console.error('Failed to fetch dashboard data:', error)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [API_URL, session])

    // Calculate stats from real data
    const pendingJobs = jobs.filter(j => j.status === 'PENDING' || j.status === 'ACCEPTED')
    const completedJobs = jobs.filter(j => j.status === 'COMPLETED')

    const stats = {
        upcomingBookings: pendingJobs.length,
        properties: properties.length,
        completedJobs: completedJobs.length,
        rating: 4.8,  // Would come from reviews API
    }

    // Format jobs for display
    const upcomingBookings = pendingJobs.slice(0, 5).map(job => ({
        id: job.id,
        title: job.services.join(', '),
        property: properties.find(p => p.id === job.property_id)?.address || 'Property',
        cleaner: 'Assigned Cleaner',
        cleanerRating: 4.8,
        date: job.scheduled_date,
        time: job.scheduled_time,
        status: job.status.toLowerCase(),
    }))


    return (
        <div className="space-y-8">
            {/* Welcome */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">
                        {(() => {
                            const h = new Date().getHours()
                            return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
                        })()}, {session?.user?.email?.split('@')[0]} 👋
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your properties and bookings.
                    </p>
                </div>
                <Link href="/book">
                    <Button className="bg-brand-500 hover:bg-brand-600">
                        <Plus className="w-4 h-4 mr-2" />
                        Book a Cleaning
                    </Button>
                </Link>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-brand-100 dark:bg-brand-500/20 rounded-xl">
                                <Calendar className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.upcomingBookings}</p>
                                <p className="text-sm text-muted-foreground">Upcoming</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
                                <Home className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.properties}</p>
                                <p className="text-sm text-muted-foreground">Properties</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-xl">
                                <Calendar className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.completedJobs}</p>
                                <p className="text-sm text-muted-foreground">Completed</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
                                <Star className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.rating}</p>
                                <p className="text-sm text-muted-foreground">Your Rating</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Upcoming Bookings */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Upcoming Bookings</CardTitle>
                            <Link href="/client/bookings">
                                <Button variant="ghost" size="sm">
                                    View all <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {upcomingBookings.map((booking) => (
                                    <div
                                        key={booking.id}
                                        className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                                    >
                                        <div className="p-3 bg-brand-100 dark:bg-brand-500/20 rounded-lg">
                                            <Home className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <p className="font-medium">{booking.title}</p>
                                            <p className="text-sm text-muted-foreground">{booking.property}</p>
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-sm">{booking.cleaner}</span>
                                                <span className="flex items-center text-amber-500 text-sm">
                                                    <Star className="w-3 h-3 mr-0.5 fill-current" />
                                                    {booking.cleanerRating}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="font-medium">{booking.date}</p>
                                            <p className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                                                <Clock className="w-3 h-3" />
                                                {booking.time}
                                            </p>
                                            <span
                                                className={`inline-block mt-1 text-xs px-2 py-0.5 rounded-full ${booking.status === 'confirmed'
                                                    ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                                                    : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                                    }`}
                                            >
                                                {booking.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Properties */}
                <div>
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle className="text-base">Your Properties</CardTitle>
                            <Link href="/client/properties/new">
                                <Button variant="ghost" size="sm">
                                    <Plus className="w-4 h-4" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            {properties.map((property) => (
                                <Link key={property.id} href={`/client/properties/${property.id}`}>
                                    <div className="p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800/50 transition">
                                        <p className="font-medium">{property.name || property.address}</p>
                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                            <MapPin className="w-3 h-3" />
                                            {property.address}
                                        </p>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            {property.sqft || 0} sq ft • {property.bedrooms || 0} bed
                                        </p>
                                    </div>
                                </Link>
                            ))}
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
