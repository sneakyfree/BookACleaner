'use client'

import { useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Calendar,
    DollarSign,
    Star,
    TrendingUp,
    Clock,
    CheckCircle,
    ArrowRight,
    Briefcase,
    Loader2,
    AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useJobs } from '@/hooks/use-api'

interface ApiJob {
    id: string
    status: string
    services: string[]
    total_price: number
    scheduled_date: string
    scheduled_time?: string
    property_name?: string
    property_address?: string
    client_name?: string
    created_at?: string
}

interface DashboardStats {
    todayJobs: number
    weekEarnings: number
    rating: number
    completedJobs: number
    pendingJobs: number
}

interface UpcomingJob {
    id: string
    title: string
    property: string
    client: string
    time: string
    address: string
    price: number
}

export default function CleanerDashboard() {
    const { data: session } = useSession()
    const { data: rawJobs, isLoading: loading, error } = useJobs()

    const { stats, upcomingJobs } = useMemo(() => {
        const jobs: ApiJob[] = Array.isArray(rawJobs) ? rawJobs : (rawJobs as any)?.jobs || []
        const today = new Date().toISOString().split('T')[0]
        const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

        const todayJobs = jobs.filter(j => j.scheduled_date?.startsWith(today)).length
        const completedJobs = jobs.filter(j => j.status === 'completed').length
        const pendingJobs = jobs.filter(j => j.status === 'pending').length

        const weekEarnings = jobs
            .filter(j => j.status === 'completed' && j.scheduled_date >= weekAgo)
            .reduce((sum, j) => sum + (j.total_price || 0), 0)

        const upcoming: UpcomingJob[] = jobs
            .filter(j =>
                j.scheduled_date >= today &&
                (j.status === 'confirmed' || j.status === 'pending' || j.status === 'in_progress')
            )
            .sort((a, b) => (a.scheduled_date + (a.scheduled_time || '')).localeCompare(b.scheduled_date + (b.scheduled_time || '')))
            .slice(0, 5)
            .map(j => ({
                id: j.id,
                title: j.services?.join(', ') || 'Cleaning',
                property: j.property_name || 'Property',
                client: j.client_name || 'Client',
                time: j.scheduled_time || 'TBD',
                address: j.property_address || '',
                price: j.total_price || 0,
            }))

        return {
            stats: { todayJobs, weekEarnings, rating: 0, completedJobs, pendingJobs } as DashboardStats,
            upcomingJobs: upcoming,
        }
    }, [rawJobs])

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
                    <p className="text-lg font-medium text-red-600">{(error as any)?.detail || 'Failed to load dashboard'}</p>
                    <Button className="mt-4" onClick={() => window.location.reload()}>
                        Try Again
                    </Button>
                </CardContent>
            </Card>
        )
    }

    return (
        <div className="space-y-8">
            {/* Welcome */}
            <div>
                <h1 className="text-2xl font-bold">
                    {(() => {
                        const h = new Date().getHours()
                        return h < 12 ? 'Good morning' : h < 17 ? 'Good afternoon' : 'Good evening'
                    })()}, {session?.user?.email?.split('@')[0]} 👋
                </h1>
                <p className="text-muted-foreground mt-1">
                    Here&apos;s what&apos;s happening with your business today.
                </p>
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
                                <p className="text-2xl font-bold">{stats.todayJobs}</p>
                                <p className="text-sm text-muted-foreground">Jobs Today</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-xl">
                                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">${stats.weekEarnings}</p>
                                <p className="text-sm text-muted-foreground">This Week</p>
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
                                <p className="text-2xl font-bold">{stats.rating > 0 ? stats.rating : '—'}</p>
                                <p className="text-sm text-muted-foreground">Rating</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-purple-100 dark:bg-purple-500/20 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-purple-600 dark:text-purple-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">{stats.completedJobs}</p>
                                <p className="text-sm text-muted-foreground">Total Jobs</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content Grid */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Today's Jobs */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Today&apos;s Jobs</CardTitle>
                            <Link href="/cleaner/jobs">
                                <Button variant="ghost" size="sm">
                                    View all <ArrowRight className="w-4 h-4 ml-1" />
                                </Button>
                            </Link>
                        </CardHeader>
                        <CardContent>
                            {upcomingJobs.length > 0 ? (
                                <div className="space-y-4">
                                    {upcomingJobs.map((job) => (
                                        <div
                                            key={job.id}
                                            className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                                        >
                                            <div className="p-3 bg-brand-100 dark:bg-brand-500/20 rounded-lg">
                                                <Briefcase className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="font-medium">{job.title}</p>
                                                <p className="text-sm text-muted-foreground">
                                                    {job.property} • {job.client}
                                                </p>
                                                <p className="text-sm text-muted-foreground">{job.address}</p>
                                            </div>
                                            <div className="text-right">
                                                <p className="font-semibold">${job.price}</p>
                                                <p className="text-sm text-muted-foreground">{job.time}</p>
                                            </div>
                                            <Button size="sm">Start</Button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-8 text-muted-foreground">
                                    <Calendar className="w-12 h-12 mx-auto mb-4 opacity-50" />
                                    <p>No jobs scheduled for today</p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* Quick Stats */}
                <div className="space-y-6">
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Pending Actions</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                            <Link href="/cleaner/jobs?status=pending" className="block">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-amber-50 dark:bg-amber-500/10 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition">
                                    <span className="text-sm">Pending job requests</span>
                                    <span className="font-semibold text-amber-600">{stats.pendingJobs}</span>
                                </div>
                            </Link>
                            <Link href="/cleaner/verification" className="block">
                                <div className="flex items-center justify-between p-3 rounded-lg bg-blue-50 dark:bg-blue-500/10 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition">
                                    <span className="text-sm">Complete verification</span>
                                    <ArrowRight className="w-4 h-4 text-blue-600" />
                                </div>
                            </Link>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
