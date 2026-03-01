'use client'

import { useState, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import {
    MapPin, TrendingUp, Zap, Clock, ArrowRight, Loader2, AlertCircle, Navigation
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery, useMutation } from '@tanstack/react-query'
import { apiFetch } from '@/lib/auth/api-client'

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
    const [routeResult, setRouteResult] = useState<RouteResult | null>(null)
    const [error, setError] = useState('')

    const { data: rawJobs, isLoading: loading } = useQuery({
        queryKey: ['route-jobs'],
        queryFn: () => apiFetch('/api/v1/jobs/?status=confirmed'),
    })

    const jobs: Job[] = useMemo(() => {
        const jobsList = (rawJobs as any)?.jobs || rawJobs || []
        const list = Array.isArray(jobsList) ? jobsList : []
        const today = new Date().toISOString().split('T')[0]
        const todayJobs = list.filter((j: Job) => {
            const sd = j.scheduled_date
            return sd && String(sd).substring(0, 10) === today
        })
        return todayJobs.length > 0 ? todayJobs : list.slice(0, 10)
    }, [rawJobs])

    const optimizeMut = useMutation({
        mutationFn: () => apiFetch('/api/v1/route/optimize', {
            method: 'POST',
            body: JSON.stringify({ date: new Date().toISOString().split('T')[0] }),
        }),
        onSuccess: (data: any) => setRouteResult(data),
        onError: (err: any) => setError(err?.detail || 'Route optimization failed'),
    })

    const handleOptimize = () => {
        setError('')
        optimizeMut.mutate()
    }
    const isOptimizing = optimizeMut.isPending

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
                                                <div className="text-right flex flex-col items-end gap-1">
                                                    {time && <p className="text-white text-sm font-medium">{time}</p>}
                                                    <span className={cn('text-xs font-medium capitalize',
                                                        status === 'confirmed' ? 'text-green-400' : 'text-amber-400')}>
                                                        {status}
                                                    </span>
                                                    <a
                                                        href={`https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        onClick={e => e.stopPropagation()}
                                                        className="text-brand-400 hover:text-brand-300 text-xs flex items-center gap-1 mt-0.5"
                                                    >
                                                        <Navigation className="w-3 h-3" /> Directions
                                                    </a>
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
                                    <>
                                        <div className="flex justify-between text-sm">
                                            <span className="text-white/50">Time saved</span>
                                            <span className="text-green-400 font-medium">{routeResult.timeSavedMinutes} min</span>
                                        </div>
                                        <div className="pt-2 border-t border-white/5">
                                            <div className="flex justify-between text-xs mb-2">
                                                <span className="text-white/40">Efficiency gain</span>
                                                <span className="text-green-400 font-semibold">
                                                    {routeResult.estimatedTravelMinutes
                                                        ? `${Math.round((routeResult.timeSavedMinutes / (routeResult.estimatedTravelMinutes + routeResult.timeSavedMinutes)) * 100)}%`
                                                        : '—'}
                                                </span>
                                            </div>
                                            <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                                <div
                                                    className="h-full bg-gradient-to-r from-green-500 to-emerald-400 rounded-full transition-all duration-1000"
                                                    style={{
                                                        width: routeResult.estimatedTravelMinutes
                                                            ? `${Math.round((routeResult.timeSavedMinutes / (routeResult.estimatedTravelMinutes + routeResult.timeSavedMinutes)) * 100)}%`
                                                            : '0%'
                                                    }}
                                                />
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 gap-2 pt-2">
                                            <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-2 text-center">
                                                <p className="text-green-400 font-bold text-sm">{(routeResult.timeSavedMinutes * 0.5).toFixed(1)} mi</p>
                                                <p className="text-green-400/60 text-[10px]">distance saved</p>
                                            </div>
                                            <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-2 text-center">
                                                <p className="text-blue-400 font-bold text-sm">${(routeResult.timeSavedMinutes * 0.12).toFixed(2)}</p>
                                                <p className="text-blue-400/60 text-[10px]">fuel saved</p>
                                            </div>
                                        </div>
                                    </>
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
