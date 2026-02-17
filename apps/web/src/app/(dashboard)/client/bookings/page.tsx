'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Calendar,
    Clock,
    MapPin,
    Star,
    MoreVertical,
    CheckCircle,
    XCircle,
    AlertCircle,
    Loader2,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type BookingStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

interface ApiJob {
    id: string
    status: string
    services: string[]
    total_price: number
    scheduled_date: string
    scheduled_time?: string
    description?: string
    cleaner_name?: string
    cleaner_rating?: number
    property_name?: string
    property_address?: string
    created_at?: string
}

interface DisplayBooking {
    id: string
    cleaner: { name: string; rating: number }
    property: { name: string; address: string }
    services: string[]
    date: string
    time: string
    price: number
    status: BookingStatus
}

const statusConfig = {
    pending: {
        label: 'Pending',
        color: 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400',
        icon: AlertCircle,
    },
    confirmed: {
        label: 'Confirmed',
        color: 'bg-blue-100 text-blue-700 dark:bg-blue-500/20 dark:text-blue-400',
        icon: CheckCircle,
    },
    in_progress: {
        label: 'In Progress',
        color: 'bg-purple-100 text-purple-700 dark:bg-purple-500/20 dark:text-purple-400',
        icon: Clock,
    },
    completed: {
        label: 'Completed',
        color: 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400',
        icon: CheckCircle,
    },
    cancelled: {
        label: 'Cancelled',
        color: 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400',
        icon: XCircle,
    },
}

export default function BookingsPage() {
    const { data: session } = useSession()
    const [bookings, setBookings] = useState<DisplayBooking[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const token = (session as any)?.accessToken
        if (!token) {
            setLoading(false)
            return
        }

        async function fetchBookings() {
            try {
                setError(null)
                const res = await fetch(`${API_URL}/api/v1/jobs/`, {
                    headers: {
                        Authorization: `Bearer ${(session as any)?.accessToken}`,
                    },
                })

                if (!res.ok) {
                    throw new Error(`Failed to load bookings (${res.status})`)
                }

                const data: ApiJob[] = await res.json()

                const mapped: DisplayBooking[] = data.map((job) => {
                    const validStatuses: BookingStatus[] = ['pending', 'confirmed', 'in_progress', 'completed', 'cancelled']
                    const status: BookingStatus = validStatuses.includes(job.status as BookingStatus)
                        ? (job.status as BookingStatus)
                        : 'pending'

                    return {
                        id: job.id,
                        cleaner: {
                            name: job.cleaner_name || 'Unassigned',
                            rating: job.cleaner_rating || 0,
                        },
                        property: {
                            name: job.property_name || 'Property',
                            address: job.property_address || '',
                        },
                        services: job.services || [],
                        date: job.scheduled_date
                            ? new Date(job.scheduled_date).toLocaleDateString('en-US', {
                                weekday: 'short', month: 'short', day: 'numeric',
                            })
                            : 'TBD',
                        time: job.scheduled_time || 'TBD',
                        price: job.total_price || 0,
                        status,
                    }
                })

                setBookings(mapped)
            } catch (err) {
                console.error('Failed to fetch bookings:', err)
                setError(err instanceof Error ? err.message : 'Failed to load bookings')
            } finally {
                setLoading(false)
            }
        }

        fetchBookings()
    }, [API_URL, session])

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

    const upcomingBookings = bookings.filter(
        (b) => b.status === 'pending' || b.status === 'confirmed' || b.status === 'in_progress'
    )
    const pastBookings = bookings.filter(
        (b) => b.status === 'completed' || b.status === 'cancelled'
    )

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Bookings</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your cleaning appointments
                    </p>
                </div>
                <Link href="/cleaners">
                    <Button className="bg-brand-500 hover:bg-brand-600">
                        Book New Cleaning
                    </Button>
                </Link>
            </div>

            {/* Upcoming Bookings */}
            <div>
                <h2 className="text-lg font-semibold mb-4">Upcoming</h2>
                {upcomingBookings.length > 0 ? (
                    <div className="space-y-4">
                        {upcomingBookings.map((booking) => {
                            const status = statusConfig[booking.status]
                            const StatusIcon = status.icon
                            return (
                                <Card key={booking.id}>
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex gap-4">
                                                <div className="w-14 h-14 rounded-xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center flex-shrink-0">
                                                    <Calendar className="w-6 h-6 text-brand-600" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold">{booking.services.join(', ') || 'Cleaning'}</h3>
                                                        <span
                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                                                        >
                                                            <StatusIcon className="w-3 h-3" />
                                                            {status.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-muted-foreground text-sm mt-1">
                                                        {booking.cleaner.name} •{' '}
                                                        {booking.cleaner.rating > 0 && (
                                                            <span className="text-amber-500">
                                                                <Star className="w-3 h-3 inline fill-current" /> {booking.cleaner.rating}
                                                            </span>
                                                        )}
                                                    </p>
                                                    <p className="text-sm flex items-center gap-1 mt-2">
                                                        <MapPin className="w-3 h-3" />
                                                        {booking.property.name}{booking.property.address ? ` - ${booking.property.address}` : ''}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-semibold">${booking.price}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {booking.date}
                                                </p>
                                                <p className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {booking.time}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex gap-2 mt-4 pt-4 border-t">
                                            <Button variant="outline" size="sm">
                                                Message Cleaner
                                            </Button>
                                            {booking.status === 'pending' && (
                                                <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                                                    Cancel
                                                </Button>
                                            )}
                                            <Link href={`/client/bookings/${booking.id}`} className="ml-auto">
                                                <Button variant="ghost" size="sm">
                                                    View Details
                                                </Button>
                                            </Link>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                ) : (
                    <Card>
                        <CardContent className="py-12 text-center">
                            <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-muted-foreground">No upcoming bookings</p>
                            <Link href="/cleaners" className="mt-4 inline-block">
                                <Button className="bg-brand-500 hover:bg-brand-600">
                                    Book a Cleaning
                                </Button>
                            </Link>
                        </CardContent>
                    </Card>
                )}
            </div>

            {/* Past Bookings */}
            {pastBookings.length > 0 && (
                <div>
                    <h2 className="text-lg font-semibold mb-4">Past Bookings</h2>
                    <div className="space-y-4">
                        {pastBookings.map((booking) => {
                            const status = statusConfig[booking.status]
                            const StatusIcon = status.icon
                            return (
                                <Card key={booking.id} className="opacity-75">
                                    <CardContent className="p-6">
                                        <div className="flex items-start justify-between">
                                            <div className="flex gap-4">
                                                <div className="w-14 h-14 rounded-xl bg-slate-100 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                                                    <Calendar className="w-6 h-6 text-slate-400" />
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2">
                                                        <h3 className="font-semibold">{booking.services.join(', ') || 'Cleaning'}</h3>
                                                        <span
                                                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                                                        >
                                                            <StatusIcon className="w-3 h-3" />
                                                            {status.label}
                                                        </span>
                                                    </div>
                                                    <p className="text-muted-foreground text-sm mt-1">
                                                        {booking.cleaner.name} • {booking.property.name}
                                                    </p>
                                                    <p className="text-sm text-muted-foreground mt-1">
                                                        {booking.date} at {booking.time}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-semibold">${booking.price}</p>
                                                {booking.status === 'completed' && (
                                                    <Link href={`/client/reviews`}>
                                                        <Button variant="link" size="sm" className="p-0 h-auto text-brand-600">
                                                            Leave Review
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        })}
                    </div>
                </div>
            )}
        </div>
    )
}
