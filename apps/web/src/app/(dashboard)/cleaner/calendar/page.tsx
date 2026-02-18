'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    ChevronLeft,
    ChevronRight,
    Plus,
    Calendar as CalendarIcon,
    Clock,
    MapPin,
    DollarSign,
    Briefcase,
    Loader2,
    AlertCircle,
} from 'lucide-react'
import { addDays, format, startOfWeek, endOfWeek, eachDayOfInterval, isSameDay, isToday } from 'date-fns'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Job {
    id: string
    title: string
    client: string
    property: string
    address: string
    time: string
    duration: number
    price: number
    status: 'confirmed' | 'pending'
}

export default function CleanerCalendarPage() {
    const { data: session } = useSession()
    const [currentDate, setCurrentDate] = useState(new Date())
    const [view, setView] = useState<'week' | 'month'>('week')
    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [jobs, setJobs] = useState<Job[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    // Get week range
    const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })
    const weekEnd = endOfWeek(currentDate, { weekStartsOn: 0 })
    const weekDays = eachDayOfInterval({ start: weekStart, end: weekEnd })

    // Fetch jobs from API
    useEffect(() => {
        const fetchJobs = async () => {
            const token = (session as any)?.accessToken
            if (!token) return

            try {
                setLoading(true)
                const res = await fetch(`${API_URL}/api/v1/jobs/`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (!res.ok) throw new Error('Failed to load jobs')
                const data = await res.json()

                const mapped: Job[] = (Array.isArray(data) ? data : []).map((j: any) => ({
                    id: j.id,
                    title: j.title || j.services?.join(', ') || 'Cleaning',
                    client: j.client_name || j.client?.full_name || 'Client',
                    property: j.property_name || j.property?.name || 'Property',
                    address: j.address || j.property?.address || '',
                    time: j.scheduled_time || '09:00',
                    duration: j.estimated_hours || 2,
                    price: j.total_price || 0,
                    status: j.status === 'confirmed' ? 'confirmed' : 'pending',
                }))
                setJobs(mapped)
            } catch (err: any) {
                setError(err.message || 'Failed to load calendar')
            } finally {
                setLoading(false)
            }
        }
        if (session) fetchJobs()
    }, [session])

    // Group jobs by date
    const jobsByDate: Record<string, Job[]> = {}
    jobs.forEach((job: any) => {
        const dateKey = job.scheduled_date
            ? format(new Date(job.scheduled_date), 'yyyy-MM-dd')
            : format(new Date(), 'yyyy-MM-dd')
        if (!jobsByDate[dateKey]) jobsByDate[dateKey] = []
        jobsByDate[dateKey].push(job)
    })

    const hours = Array.from({ length: 12 }, (_, i) => i + 8) // 8 AM to 7 PM

    function navigateWeek(direction: 'prev' | 'next') {
        setCurrentDate((prev) => addDays(prev, direction === 'next' ? 7 : -7))
    }

    const selectedDateJobs = selectedDate
        ? jobsByDate[format(selectedDate, 'yyyy-MM-dd')] || []
        : []

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Calendar</h1>
                    <p className="text-muted-foreground mt-1">
                        Manage your schedule and availability
                    </p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" onClick={() => setCurrentDate(new Date())}>
                        Today
                    </Button>
                    <Button className="bg-brand-500 hover:bg-brand-600">
                        <Plus className="w-4 h-4 mr-2" />
                        Block Time
                    </Button>
                </div>
            </div>

            {/* Calendar Navigation */}
            <Card>
                <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                            <Button variant="ghost" size="icon" onClick={() => navigateWeek('prev')}>
                                <ChevronLeft className="w-5 h-5" />
                            </Button>
                            <h2 className="text-lg font-semibold">
                                {format(weekStart, 'MMM d')} - {format(weekEnd, 'MMM d, yyyy')}
                            </h2>
                            <Button variant="ghost" size="icon" onClick={() => navigateWeek('next')}>
                                <ChevronRight className="w-5 h-5" />
                            </Button>
                        </div>
                        <div className="flex gap-1">
                            <Button
                                variant={view === 'week' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setView('week')}
                                className={view === 'week' ? 'bg-brand-500' : ''}
                            >
                                Week
                            </Button>
                            <Button
                                variant={view === 'month' ? 'default' : 'ghost'}
                                size="sm"
                                onClick={() => setView('month')}
                                className={view === 'month' ? 'bg-brand-500' : ''}
                            >
                                Month
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent className="p-0">
                    {/* Week View */}
                    <div className="grid grid-cols-7 border-b">
                        {weekDays.map((day) => {
                            const dateKey = format(day, 'yyyy-MM-dd')
                            const dayJobs = jobsByDate[dateKey] || []
                            const isSelected = selectedDate && isSameDay(day, selectedDate)

                            return (
                                <button
                                    key={dateKey}
                                    onClick={() => setSelectedDate(day)}
                                    className={`p-4 border-r last:border-r-0 text-center transition hover:bg-slate-50 dark:hover:bg-slate-800 ${isSelected ? 'bg-brand-50 dark:bg-brand-500/10' : ''
                                        } ${isToday(day) ? 'bg-brand-50/50' : ''}`}
                                >
                                    <p className="text-xs text-muted-foreground uppercase">
                                        {format(day, 'EEE')}
                                    </p>
                                    <p
                                        className={`text-xl font-semibold mt-1 ${isToday(day) ? 'text-brand-600' : ''
                                            }`}
                                    >
                                        {format(day, 'd')}
                                    </p>
                                    {dayJobs.length > 0 && (
                                        <div className="mt-2 space-y-1">
                                            {dayJobs.slice(0, 2).map((job) => (
                                                <div
                                                    key={job.id}
                                                    className={`text-xs px-2 py-1 rounded ${job.status === 'confirmed'
                                                        ? 'bg-brand-100 text-brand-700 dark:bg-brand-500/20 dark:text-brand-400'
                                                        : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                                        }`}
                                                >
                                                    {job.time.slice(0, 5)} {job.title}
                                                </div>
                                            ))}
                                            {dayJobs.length > 2 && (
                                                <p className="text-xs text-muted-foreground">
                                                    +{dayJobs.length - 2} more
                                                </p>
                                            )}
                                        </div>
                                    )}
                                </button>
                            )
                        })}
                    </div>

                    {/* Time Grid */}
                    <div className="grid grid-cols-8 text-sm">
                        {/* Time Labels */}
                        <div className="border-r">
                            {hours.map((hour) => (
                                <div
                                    key={hour}
                                    className="h-16 border-b px-2 py-1 text-xs text-muted-foreground"
                                >
                                    {hour > 12 ? hour - 12 : hour}:00 {hour >= 12 ? 'PM' : 'AM'}
                                </div>
                            ))}
                        </div>

                        {/* Day Columns */}
                        {weekDays.map((day) => {
                            const dateKey = format(day, 'yyyy-MM-dd')
                            const dayJobs = jobsByDate[dateKey] || []

                            return (
                                <div key={dateKey} className="relative border-r last:border-r-0">
                                    {hours.map((hour) => (
                                        <div key={hour} className="h-16 border-b" />
                                    ))}

                                    {/* Job Blocks */}
                                    {dayJobs.map((job) => {
                                        const startHour = parseInt(job.time.split(':')[0])
                                        const topOffset = (startHour - 8) * 64 // 64px = h-16
                                        const height = job.duration * 64

                                        return (
                                            <div
                                                key={job.id}
                                                className={`absolute left-1 right-1 rounded-lg p-2 text-xs ${job.status === 'confirmed'
                                                    ? 'bg-brand-500 text-white'
                                                    : 'bg-amber-400 text-amber-900'
                                                    }`}
                                                style={{ top: `${topOffset}px`, height: `${height - 4}px` }}
                                            >
                                                <p className="font-medium truncate">{job.title}</p>
                                                <p className="opacity-80 truncate">{job.property}</p>
                                                <p className="mt-1">${job.price}</p>
                                            </div>
                                        )
                                    })}
                                </div>
                            )
                        })}
                    </div>
                </CardContent>
            </Card>

            {/* Selected Day Details */}
            {selectedDate && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg">
                            {format(selectedDate, 'EEEE, MMMM d, yyyy')}
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        {selectedDateJobs.length > 0 ? (
                            <div className="space-y-4">
                                {selectedDateJobs.map((job) => (
                                    <div
                                        key={job.id}
                                        className="flex items-center gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                                    >
                                        <div
                                            className={`p-3 rounded-lg ${job.status === 'confirmed'
                                                ? 'bg-brand-100 dark:bg-brand-500/20'
                                                : 'bg-amber-100 dark:bg-amber-500/20'
                                                }`}
                                        >
                                            <Briefcase
                                                className={`w-5 h-5 ${job.status === 'confirmed' ? 'text-brand-600' : 'text-amber-600'
                                                    }`}
                                            />
                                        </div>
                                        <div className="flex-1">
                                            <p className="font-semibold">{job.title}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {job.client} • {job.property}
                                            </p>
                                            <div className="flex items-center gap-4 mt-2 text-sm text-muted-foreground">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {job.time} ({job.duration}h)
                                                </span>
                                                <span className="flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {job.address}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-bold text-brand-600">${job.price}</p>
                                            <span
                                                className={`text-xs px-2 py-0.5 rounded-full ${job.status === 'confirmed'
                                                    ? 'bg-green-100 text-green-700'
                                                    : 'bg-amber-100 text-amber-700'
                                                    }`}
                                            >
                                                {job.status}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="text-center py-8 text-muted-foreground">
                                <CalendarIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                                <p>No jobs scheduled for this day</p>
                                <Button variant="outline" className="mt-4">
                                    <Plus className="w-4 h-4 mr-2" />
                                    Add Availability
                                </Button>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}
        </div>
    )
}
