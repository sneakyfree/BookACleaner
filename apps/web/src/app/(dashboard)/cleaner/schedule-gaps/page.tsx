'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Clock,
    MapPin,
    Loader2,
    AlertCircle,
    Zap,
    TrendingUp,
    ArrowRight,
} from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface ScheduleGap {
    start: string
    end: string
    duration_min: number
    nearby_jobs: Array<{
        id: string
        title: string
        price: number
        address: string
        distance_miles?: number
    }>
}

export default function ScheduleGapsPage() {
    const { data: session } = useSession()
    const [gaps, setGaps] = useState<ScheduleGap[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [selectedDate, setSelectedDate] = useState(
        new Date().toISOString().split('T')[0]
    )

    useEffect(() => {
        const token = (session as any)?.accessToken
        if (!token) {
            setLoading(false)
            return
        }
        fetchGaps(token)
    }, [session, selectedDate])

    const fetchGaps = async (token: string) => {
        try {
            setLoading(true)
            setError(null)
            const res = await fetch(
                `${API_URL}/api/v1/route/gaps?date=${selectedDate}`,
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            )
            if (!res.ok) throw new Error(`Failed to fetch gaps (${res.status})`)
            const data = await res.json()
            setGaps(data.gaps || data || [])
        } catch (err) {
            console.error('Failed to fetch schedule gaps:', err)
            setError(
                err instanceof Error ? err.message : 'Failed to load schedule gaps'
            )
        } finally {
            setLoading(false)
        }
    }

    const formatTime = (iso: string) => {
        try {
            return new Date(iso).toLocaleTimeString('en-US', {
                hour: 'numeric',
                minute: '2-digit',
            })
        } catch {
            return iso
        }
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6 max-w-4xl mx-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Schedule Gaps</h1>
                    <p className="text-muted-foreground mt-1">
                        Find idle time in your schedule and discover nearby jobs to fill it
                    </p>
                </div>
                <input
                    type="date"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    className="px-3 py-2 border rounded-xl bg-background text-sm focus:ring-2 focus:ring-brand-500 outline-none"
                />
            </div>

            {error && (
                <Card className="border-red-200 dark:border-red-500/30">
                    <CardContent className="py-6 text-center">
                        <AlertCircle className="w-8 h-8 mx-auto mb-2 text-red-500" />
                        <p className="text-sm text-red-600">{error}</p>
                        <Button
                            variant="outline"
                            size="sm"
                            className="mt-3"
                            onClick={() => {
                                const token = (session as any)?.accessToken
                                if (token) fetchGaps(token)
                            }}
                        >
                            Retry
                        </Button>
                    </CardContent>
                </Card>
            )}

            {!error && gaps.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-brand-100 dark:bg-brand-500/20 flex items-center justify-center">
                            <TrendingUp className="w-7 h-7 text-brand-600" />
                        </div>
                        <h3 className="text-lg font-semibold mb-1">
                            No Gaps Today!
                        </h3>
                        <p className="text-sm text-muted-foreground">
                            Your schedule is fully booked for{' '}
                            {new Date(selectedDate).toLocaleDateString('en-US', {
                                weekday: 'long',
                                month: 'long',
                                day: 'numeric',
                            })}
                        </p>
                    </CardContent>
                </Card>
            )}

            {gaps.map((gap, i) => (
                <Card key={i} className="overflow-hidden">
                    <div className="flex items-stretch">
                        {/* Time indicator */}
                        <div className="w-2 bg-amber-400 dark:bg-amber-500" />
                        <div className="flex-1 p-5">
                            <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 bg-amber-100 dark:bg-amber-500/20 rounded-lg">
                                        <Clock className="w-5 h-5 text-amber-600" />
                                    </div>
                                    <div>
                                        <p className="font-semibold">
                                            {formatTime(gap.start)} — {formatTime(gap.end)}
                                        </p>
                                        <p className="text-xs text-muted-foreground">
                                            {gap.duration_min} min idle window
                                        </p>
                                    </div>
                                </div>
                                <span className="px-3 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400">
                                    {gap.duration_min} min gap
                                </span>
                            </div>

                            {gap.nearby_jobs && gap.nearby_jobs.length > 0 ? (
                                <div className="space-y-2 mt-4">
                                    <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                                        Nearby jobs that fit:
                                    </p>
                                    {gap.nearby_jobs.slice(0, 3).map((job) => (
                                        <Link
                                            key={job.id}
                                            href={`/cleaner/marketplace`}
                                            className="flex items-center justify-between p-3 rounded-xl bg-muted/50 hover:bg-muted transition group"
                                        >
                                            <div className="flex items-center gap-3">
                                                <Zap className="w-4 h-4 text-brand-500" />
                                                <div>
                                                    <p className="text-sm font-medium">
                                                        {job.title}
                                                    </p>
                                                    <p className="text-xs text-muted-foreground flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" />
                                                        {job.address}
                                                        {job.distance_miles && (
                                                            <span>
                                                                · {job.distance_miles.toFixed(1)} mi
                                                            </span>
                                                        )}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="font-semibold text-brand-600">
                                                    ${job.price}
                                                </span>
                                                <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition" />
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-sm text-muted-foreground mt-2">
                                    No nearby jobs available for this window. Check the{' '}
                                    <Link
                                        href="/cleaner/marketplace"
                                        className="text-brand-600 hover:underline"
                                    >
                                        marketplace
                                    </Link>{' '}
                                    for open jobs.
                                </p>
                            )}
                        </div>
                    </div>
                </Card>
            ))}
        </div>
    )
}
