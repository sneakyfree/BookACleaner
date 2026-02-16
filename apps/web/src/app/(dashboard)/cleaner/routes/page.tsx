'use client'

import { useState } from 'react'
import {
    Calendar, Clock, MapPin, TrendingUp, Zap, ArrowRight
} from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Cleaner Schedule Gaps & Route Optimization — G4 + G5
 * Shows free-slot suggestions and optimized route for the day
 */

interface GapSlot {
    id: string
    date: string
    startTime: string
    endTime: string
    nearbyJobs: number
    suggestedAction: string
}

interface RouteStop {
    id: string
    order: number
    jobTitle: string
    address: string
    time: string
    estimatedDrive: string
    status: string
}

const mockGaps: GapSlot[] = [
    { id: 'g1', date: '2026-02-12', startTime: '11:00', endTime: '13:00', nearbyJobs: 3, suggestedAction: 'Fill with nearby Standard Clean ($120)' },
    { id: 'g2', date: '2026-02-13', startTime: '14:00', endTime: '17:00', nearbyJobs: 5, suggestedAction: 'Accept Deep Clean request ($280)' },
    { id: 'g3', date: '2026-02-14', startTime: '09:00', endTime: '11:00', nearbyJobs: 2, suggestedAction: 'Available for Airbnb turnover ($160)' },
]

const mockRoute: RouteStop[] = [
    { id: 'r1', order: 1, jobTitle: 'Standard Clean — Johnson Residence', address: '123 Oak Lane, Austin TX', time: '8:00 AM', estimatedDrive: '—', status: 'confirmed' },
    { id: 'r2', order: 2, jobTitle: 'Deep Clean — Rivera Apartment', address: '456 Elm St, Austin TX', time: '10:30 AM', estimatedDrive: '12 min', status: 'confirmed' },
    { id: 'r3', order: 3, jobTitle: 'Airbnb Turnover — Park Condo', address: '789 Congress Ave, Austin TX', time: '1:00 PM', estimatedDrive: '8 min', status: 'confirmed' },
    { id: 'r4', order: 4, jobTitle: 'Move-Out Clean — Chen House', address: '321 Lamar Blvd, Austin TX', time: '3:30 PM', estimatedDrive: '15 min', status: 'pending' },
]

export default function CleanerRoutesPage() {
    const [isOptimizing, setIsOptimizing] = useState(false)
    const [route, setRoute] = useState(mockRoute)

    const handleOptimize = () => {
        setIsOptimizing(true)
        setTimeout(() => {
            // Simulate reorder
            setRoute(prev => [...prev].sort((a, b) => a.order - b.order))
            setIsOptimizing(false)
        }, 1500)
    }

    const totalDriveTime = '35 min'
    const totalJobs = route.length

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <MapPin className="w-7 h-7 text-brand-400" />
                            My Routes & Schedule
                        </h1>
                        <p className="text-white/60 mt-1">{totalJobs} jobs today &middot; {totalDriveTime} total drive time</p>
                    </div>
                    <button onClick={handleOptimize} disabled={isOptimizing}
                        className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-50 text-white rounded-lg font-medium transition-colors flex items-center gap-2">
                        <Zap className={cn('w-4 h-4', isOptimizing && 'animate-spin')} />
                        {isOptimizing ? 'Optimizing...' : 'Optimize My Route'}
                    </button>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Route */}
                    <div className="lg:col-span-2">
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <TrendingUp className="w-5 h-5 text-brand-400" /> Today&apos;s Route
                        </h2>
                        <div className="space-y-1">
                            {route.map((stop, idx) => (
                                <div key={stop.id}>
                                    <div className="bg-white/5 rounded-xl border border-white/10 p-4 flex items-center gap-4">
                                        <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold text-sm">
                                            {stop.order}
                                        </div>
                                        <div className="flex-1">
                                            <p className="text-white font-medium">{stop.jobTitle}</p>
                                            <p className="text-white/50 text-sm flex items-center gap-1">
                                                <MapPin className="w-3 h-3" /> {stop.address}
                                            </p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-white text-sm font-medium">{stop.time}</p>
                                            <span className={cn('text-xs font-medium capitalize',
                                                stop.status === 'confirmed' ? 'text-green-400' : 'text-amber-400')}>
                                                {stop.status}
                                            </span>
                                        </div>
                                    </div>
                                    {idx < route.length - 1 && (
                                        <div className="flex items-center gap-2 py-1 pl-8">
                                            <div className="w-0.5 h-4 bg-white/10 ml-3.5" />
                                            <span className="text-white/30 text-xs">{route[idx + 1].estimatedDrive} drive</span>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Schedule Gaps */}
                    <div>
                        <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                            <Clock className="w-5 h-5 text-amber-400" /> Schedule Gaps
                        </h2>
                        <div className="space-y-3">
                            {mockGaps.map(gap => (
                                <div key={gap.id} className="bg-white/5 rounded-xl border border-amber-500/20 p-4">
                                    <div className="flex items-center justify-between mb-2">
                                        <span className="text-white/60 text-sm">{gap.date}</span>
                                        <span className="text-amber-400 text-xs font-medium">{gap.nearbyJobs} nearby jobs</span>
                                    </div>
                                    <p className="text-white font-medium text-sm">{gap.startTime} — {gap.endTime}</p>
                                    <p className="text-white/50 text-xs mt-1">{gap.suggestedAction}</p>
                                    <button className="mt-2 text-brand-400 hover:text-brand-300 text-xs font-medium flex items-center gap-1">
                                        View Jobs <ArrowRight className="w-3 h-3" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
