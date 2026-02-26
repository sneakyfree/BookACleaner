'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
    MapPin, TrendingUp, Zap, Clock, ArrowRight, Loader2, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface RouteStop {
    job_id: string
    address: string
    city: string
    order?: number
}

interface RouteResult {
    optimized: boolean
    date?: string
    totalJobs?: number
    route: RouteStop[]
    estimatedTravelMinutes?: number
    timeSavedMinutes?: number
    message?: string
}

interface Job {
    id: string
    title?: string
    status: string
    scheduled_date?: string
    scheduled_time?: string
    property?: { address?: string; city?: string }
}

export default function CleanerRoutesPage() {
    const { data: session } = useSession()
    const [jobs, setJobs] = useState<Job[]>([])
    const [routeResult, setRouteResult] = useState<RouteResult | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [isOptimizing, setIsOptimizing] = useState(false)

    const fetchJobs = useCallback(async () => {
        const token = (session as any)?.accessToken
        if (!token) return

        try {
            setLoading(true)
            setError('')
            const res = await fetch(`${API_URL}/api/v1/jobs/?status=confirmed`, {
                headers: { Authorization: `Bearer ${token}` },
            })
            if (!res.ok) throw new Error(`Failed to load jobs (${res.status})`)
            const data = await res.json()
            const jobsList = data.jobs || data || []
            // Filter to today's jobs
            const today = new Date().toISOString().split('T')[0]
            const todayJobs = jobsList.filter((j: Job) => {
                const sd = j.scheduled_date
                return sd && String(sd).substring(0, 10) === today
            })
            setJobs(todayJobs.length > 0 ? todayJobs : jobsList.slice(0, 10))
        } catch (err: any) {
            setError(err.message || 'Failed to load jobs')
        } finally {
            setLoading(false)
        }
    }, [session])

    useEffect(() => {
        if (session) fetchJobs()
    }, [session, fetchJobs])

    const handleOptimize = async () => {
        const token = (session as any)?.accessToken
        if (!token) return

        try {
            setIsOptimizing(true)
            setError('')
            const res = await fetch(`${API_URL}/api/v1/route/optimize`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ date: new Date().toISOString().split('T')[0] }),
            })
            if (!res.ok) throw new Error(`Route optimization failed (${res.status})`)
            const data = await res.json()
            setRouteResult(data)
        } catch (err: any) {
            setError(err.message || 'Route optimization failed')
        } finally {
            setIsOptimizing(false)
        }
    }

    const displayRoute = routeResult?.route || []

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <MapPin className="w-7 h-7 text-brand-400" />
                            My Routes & Schedule
                        </h1>
                        <p className="text-white/60 mt-1">
                            {jobs.length} jobs today
                            {routeResult?.estimatedTravelMinutes ? ` · ${routeResult.estimatedTravelMinutes} min travel` : ''}
                        </p>
                    </div>
                    <button onClick={handleOptimize} disabled={isOptimizing || jobs.length < 2}
                        className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                        <Zap className={cn('w-4 h-4', isOptimizing && 'animate-spin')} />
                        {isOptimizing ? 'Optimizing...' : 'Optimize My Route'}
                    </button>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                        <span className="ml-3 text-white/60">Loading jobs...</span>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Route / Jobs */}
                        <div className="lg:col-span-2">
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <TrendingUp className="w-5 h-5 text-brand-400" />
                                {routeResult?.optimized ? 'Optimized Route' : "Today's Jobs"}
                            </h2>

                            {routeResult?.optimized && routeResult.timeSavedMinutes ? (
                                <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg text-green-400 text-sm">
                                    🎉 Route optimized! Saving ~{routeResult.timeSavedMinutes} minutes of travel time.
                                </div>
                            ) : null}

                            <div className="space-y-1">
                                {(routeResult?.optimized ? displayRoute : jobs).map((item, idx, arr) => {
                                    const isRouteStop = 'job_id' in item
                                    const address = isRouteStop ? (item as RouteStop).address : ((item as Job).property?.address || 'Address N/A')
                                    const title = isRouteStop ? `Stop ${idx + 1}` : ((item as Job).title || 'Job')
                                    const status = !isRouteStop ? (item as Job).status : 'confirmed'
                                    const time = !isRouteStop ? (item as Job).scheduled_time : undefined

                                    return (
                                        <div key={isRouteStop ? (item as RouteStop).job_id : (item as Job).id}>
                                            <div className="bg-white/5 rounded-xl border border-white/10 p-4 flex items-center gap-4">
                                                <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-sm">
                                                    {idx + 1}
                                                </div>
                                                <div className="flex-1">
                                                    <p className="text-white font-medium">{title}</p>
                                                    <p className="text-white/50 text-sm flex items-center gap-1">
                                                        <MapPin className="w-3 h-3" /> {address}
                                                    </p>
                                                </div>
                                                <div className="text-right">
                                                    {time && <p className="text-white text-sm font-medium">{time}</p>}
                                                    <span className={cn('text-xs font-medium capitalize',
                                                        status === 'confirmed' ? 'text-green-400' : 'text-amber-400')}>
                                                        {status}
                                                    </span>
                                                </div>
                                            </div>
                                            {idx < arr.length - 1 && (
                                                <div className="flex items-center gap-2 py-1 pl-8">
                                                    <div className="w-0.5 h-4 bg-white/10 ml-3.5" />
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                                {jobs.length === 0 && !routeResult && (
                                    <div className="py-16 text-center text-white/40">
                                        <MapPin className="w-12 h-12 mx-auto mb-3 opacity-40" />
                                        <p>No confirmed jobs for today</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stats */}
                        <div>
                            <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                                <Clock className="w-5 h-5 text-amber-400" /> Route Stats
                            </h2>
                            <div className="bg-white/5 rounded-xl border border-white/10 p-4 space-y-4">
                                <div className="flex justify-between text-sm">
                                    <span className="text-white/50">Total jobs</span>
                                    <span className="text-white font-medium">{routeResult?.totalJobs || jobs.length}</span>
                                </div>
                                {routeResult?.estimatedTravelMinutes != null && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-white/50">Est. travel</span>
                                        <span className="text-white font-medium">{routeResult.estimatedTravelMinutes} min</span>
                                    </div>
                                )}
                                {routeResult?.timeSavedMinutes != null && (
                                    <div className="flex justify-between text-sm">
                                        <span className="text-white/50">Time saved</span>
                                        <span className="text-green-400 font-medium">{routeResult.timeSavedMinutes} min</span>
                                    </div>
                                )}
                                {!routeResult && (
                                    <p className="text-white/40 text-xs text-center py-2">
                                        Click &quot;Optimize My Route&quot; to calculate the most efficient route
                                    </p>
                                )}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
