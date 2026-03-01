'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Calendar,
    Clock,
    MapPin,
    Star,
    DollarSign,
    CheckCircle,
    XCircle,
    AlertCircle,
    Play,
    MoreVertical,
    Filter,
    Loader2,
} from 'lucide-react'
import { useJobs } from '@/hooks/use-api'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/auth/api-client'

type JobStatus = 'pending' | 'confirmed' | 'in_progress' | 'completed' | 'cancelled'

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

interface ApiJob {
    id: string
    title: string
    description?: string
    services: string[]
    scheduled_date: string
    scheduled_time: string
    total_price: number
    status: string
    client_id?: string
    client_name?: string
    property_id?: string
    property_name?: string
    property_address?: string
    cleaner_id?: string
    property?: { id: string; name?: string; address?: string }
}

interface DisplayJob {
    id: string
    client: { name: string; rating: number }
    property: { name: string; address: string; sqFt: number }
    services: string[]
    date: string
    time: string
    price: number
    status: JobStatus
    isUrgent: boolean
}

export default function CleanerJobsPage() {
    const [filter, setFilter] = useState<'all' | 'pending' | 'upcoming' | 'past'>('all')
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const { data: rawJobs, isLoading: loading, error } = useJobs()
    const queryClient = useQueryClient()

    const jobs: DisplayJob[] = useMemo(() => {
        const data: ApiJob[] = Array.isArray(rawJobs) ? rawJobs : (rawJobs as any)?.jobs || []
        return data.map((job) => {
            const scheduledDate = job.scheduled_date
                ? new Date(job.scheduled_date).toLocaleDateString('en-US', {
                    month: 'short', day: 'numeric', year: 'numeric',
                })
                : 'TBD'
            const normalizedStatus = (job.status?.toLowerCase().replace(/ /g, '_') || 'pending') as JobStatus
            return {
                id: job.id,
                client: { name: job.client_name || 'Client', rating: 0 },
                property: {
                    name: job.property_name || job.property?.name || job.title || 'Cleaning Job',
                    address: job.property_address || job.property?.address || job.description || '',
                    sqFt: 0,
                },
                services: job.services || [],
                date: scheduledDate,
                time: job.scheduled_time || 'TBD',
                price: job.total_price || 0,
                status: normalizedStatus,
                isUrgent: normalizedStatus === 'pending',
            }
        })
    }, [rawJobs])

    const filteredJobs = jobs.filter((job) => {
        if (filter === 'all') return true
        if (filter === 'pending') return job.status === 'pending'
        if (filter === 'upcoming') return job.status === 'confirmed' || job.status === 'pending'
        if (filter === 'past') return job.status === 'completed' || job.status === 'cancelled'
        return true
    })

    const pendingCount = jobs.filter((j) => j.status === 'pending').length

    const actionMut = useMutation({
        mutationFn: ({ jobId, action }: { jobId: string; action: string }) =>
            apiFetch(`/api/v1/jobs/${jobId}/${action}`, { method: 'POST' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['jobs'] })
        },
    })

    const handleJobAction = (jobId: string, action: 'accept' | 'decline' | 'start' | 'complete') => {
        setActionLoading(`${jobId}-${action}`)
        actionMut.mutate(
            { jobId, action },
            { onSettled: () => setActionLoading(null) }
        )
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                <span className="ml-3 text-muted-foreground">Loading jobs...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="space-y-6">
                <div>
                    <h1 className="text-2xl font-bold">Jobs</h1>
                    <p className="text-muted-foreground mt-1">Manage your cleaning jobs and requests</p>
                </div>
                <Card className="border-red-200 dark:border-red-800">
                    <CardContent className="py-8 text-center">
                        <AlertCircle className="w-10 h-10 mx-auto text-red-500 mb-3" />
                        <p className="text-red-600 dark:text-red-400 font-medium">{(error as any)?.detail || 'Failed to load jobs'}</p>
                        <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Jobs</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your cleaning jobs and requests
                    </p>
                </div>
            </div>

            {/* Pending Requests Alert */}
            {pendingCount > 0 && (
                <Card className="border-l-4 border-l-amber-500 bg-amber-50 dark:bg-amber-500/10">
                    <CardContent className="py-4">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <AlertCircle className="w-5 h-5 text-amber-600" />
                                <div>
                                    <p className="font-medium">
                                        You have {pendingCount} pending job request{pendingCount > 1 ? 's' : ''}
                                    </p>
                                    <p className="text-sm text-muted-foreground">
                                        Respond quickly to maintain your response time rating
                                    </p>
                                </div>
                            </div>
                            <Button
                                size="sm"
                                className="bg-amber-600 hover:bg-amber-700"
                                onClick={() => setFilter('pending')}
                            >
                                View Pending
                            </Button>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Filter Tabs */}
            <div className="flex gap-2">
                {[
                    { id: 'all', label: 'All Jobs' },
                    { id: 'pending', label: 'Pending', count: pendingCount },
                    { id: 'upcoming', label: 'Upcoming' },
                    { id: 'past', label: 'Past' },
                ].map((tab) => (
                    <Button
                        key={tab.id}
                        variant={filter === tab.id ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setFilter(tab.id as any)}
                        className={filter === tab.id ? 'bg-brand-500 hover:bg-brand-600' : ''}
                    >
                        {tab.label}
                        {tab.count !== undefined && tab.count > 0 && (
                            <span className="ml-1.5 px-1.5 py-0.5 rounded-full bg-white/20 text-xs">
                                {tab.count}
                            </span>
                        )}
                    </Button>
                ))}
            </div>

            {/* Jobs List */}
            <div className="space-y-4">
                {filteredJobs.map((job) => {
                    const status = statusConfig[job.status] || statusConfig.pending
                    const StatusIcon = status.icon

                    return (
                        <Card
                            key={job.id}
                            className={`${job.isUrgent ? 'ring-2 ring-amber-500' : ''} ${job.status === 'completed' ? 'opacity-75' : ''
                                }`}
                        >
                            <CardContent className="p-6">
                                <div className="flex items-start justify-between">
                                    <div className="flex gap-4">
                                        <div
                                            className={`w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0 ${job.status === 'pending'
                                                ? 'bg-amber-100 dark:bg-amber-500/20'
                                                : 'bg-brand-100 dark:bg-brand-500/20'
                                                }`}
                                        >
                                            <Calendar
                                                className={`w-6 h-6 ${job.status === 'pending' ? 'text-amber-600' : 'text-brand-600'
                                                    }`}
                                            />
                                        </div>
                                        <div>
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold">{job.services.join(', ') || job.property.name}</h3>
                                                <span
                                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${status.color}`}
                                                >
                                                    <StatusIcon className="w-3 h-3" />
                                                    {status.label}
                                                </span>
                                                {job.isUrgent && (
                                                    <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-medium">
                                                        Urgent
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-muted-foreground text-sm mt-1">
                                                {job.client.name}
                                                {job.client.rating > 0 && (
                                                    <>
                                                        {' • '}
                                                        <span className="text-amber-500">
                                                            <Star className="w-3 h-3 inline fill-current" /> {job.client.rating}
                                                        </span>
                                                    </>
                                                )}
                                            </p>
                                            <p className="text-sm flex items-center gap-1 mt-2">
                                                <MapPin className="w-3 h-3" />
                                                {job.property.address}
                                            </p>
                                            {job.property.sqFt > 0 && (
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {job.property.sqFt.toLocaleString()} sq ft
                                                </p>
                                            )}
                                        </div>
                                    </div>

                                    <div className="text-right">
                                        <p className="text-xl font-bold text-brand-600">${job.price}</p>
                                        <p className="text-sm font-medium mt-1">{job.date}</p>
                                        <p className="text-sm text-muted-foreground flex items-center justify-end gap-1">
                                            <Clock className="w-3 h-3" />
                                            {job.time}
                                        </p>
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 mt-4 pt-4 border-t">
                                    {job.status === 'pending' && (
                                        <>
                                            <Button
                                                size="sm"
                                                className="bg-brand-500 hover:bg-brand-600"
                                                disabled={actionLoading === `${job.id}-accept`}
                                                onClick={() => handleJobAction(job.id, 'accept')}
                                            >
                                                <CheckCircle className="w-4 h-4 mr-1" />
                                                {actionLoading === `${job.id}-accept` ? 'Accepting...' : 'Accept'}
                                            </Button>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                className="text-red-600"
                                                disabled={actionLoading === `${job.id}-decline`}
                                                onClick={() => handleJobAction(job.id, 'decline')}
                                            >
                                                <XCircle className="w-4 h-4 mr-1" />
                                                {actionLoading === `${job.id}-decline` ? 'Declining...' : 'Decline'}
                                            </Button>
                                        </>
                                    )}
                                    {job.status === 'confirmed' && (
                                        <>
                                            <Button
                                                size="sm"
                                                className="bg-brand-500 hover:bg-brand-600"
                                                disabled={actionLoading === `${job.id}-start`}
                                                onClick={() => handleJobAction(job.id, 'start')}
                                            >
                                                <Play className="w-4 h-4 mr-1" />
                                                {actionLoading === `${job.id}-start` ? 'Starting...' : 'Start Job'}
                                            </Button>
                                            <Button variant="outline" size="sm">
                                                Get Directions
                                            </Button>
                                        </>
                                    )}
                                    {job.status === 'in_progress' && (
                                        <Button
                                            size="sm"
                                            className="bg-green-600 hover:bg-green-700"
                                            disabled={actionLoading === `${job.id}-complete`}
                                            onClick={() => handleJobAction(job.id, 'complete')}
                                        >
                                            <CheckCircle className="w-4 h-4 mr-1" />
                                            {actionLoading === `${job.id}-complete` ? 'Completing...' : 'Mark Complete'}
                                        </Button>
                                    )}
                                    <Button variant="outline" size="sm">
                                        Message Client
                                    </Button>
                                    <Button variant="ghost" size="icon" className="ml-auto">
                                        <MoreVertical className="w-4 h-4" />
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {filteredJobs.length === 0 && (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Calendar className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                        <p className="text-muted-foreground">No jobs found</p>
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
