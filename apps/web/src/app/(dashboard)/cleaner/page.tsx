'use client'

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
} from 'lucide-react'
import Link from 'next/link'

export default function CleanerDashboard() {
    const { data: session } = useSession()

    // Mock data - would come from API
    const stats = {
        todayJobs: 2,
        weekEarnings: 1250,
        rating: 4.9,
        completedJobs: 156,
        pendingJobs: 3,
        responseTime: 15,
    }

    const upcomingJobs = [
        {
            id: '1',
            title: 'Standard Clean',
            property: 'Lake House',
            client: 'John D.',
            time: '9:00 AM',
            address: '123 Lake Street',
            price: 150,
        },
        {
            id: '2',
            title: 'Airbnb Turnover',
            property: 'Downtown Condo',
            client: 'Sarah M.',
            time: '2:00 PM',
            address: '456 Main Ave',
            price: 120,
        },
    ]

    return (
        <div className="space-y-8">
            {/* Welcome */}
            <div>
                <h1 className="text-2xl font-bold">
                    Good morning, {session?.user?.email?.split('@')[0]} 👋
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
                                <p className="text-2xl font-bold">{stats.rating}</p>
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
                            <CardTitle className="text-base">Performance</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Clock className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">Response Time</span>
                                </div>
                                <span className="font-medium">{stats.responseTime} min</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <CheckCircle className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">Completion Rate</span>
                                </div>
                                <span className="font-medium">98%</span>
                            </div>
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Star className="w-4 h-4 text-muted-foreground" />
                                    <span className="text-sm">Repeat Clients</span>
                                </div>
                                <span className="font-medium">42%</span>
                            </div>
                        </CardContent>
                    </Card>

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
