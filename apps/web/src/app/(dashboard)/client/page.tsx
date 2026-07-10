'use client'

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
  AlertCircle,
} from 'lucide-react'
import Link from 'next/link'
import { useJobs, useProperties } from '@/hooks/use-api'

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

  const { data: jobsData, isLoading: jobsLoading, error: jobsError } = useJobs()
  const { data: propsData, isLoading: propsLoading, error: propsError } = useProperties()

  const jobs: Job[] = Array.isArray(jobsData) ? jobsData : (jobsData as any)?.jobs || []
  const properties: Property[] = Array.isArray(propsData)
    ? propsData
    : (propsData as any)?.properties || []
  const loading = jobsLoading || propsLoading
  const loadError = jobsError || propsError

  // Calculate stats from real data. Backend statuses are lowercase:
  // pending, confirmed, in_progress, completed.
  const pendingJobs = jobs.filter((j) => ['pending', 'confirmed', 'in_progress'].includes(j.status))
  const completedJobs = jobs.filter((j) => j.status === 'completed')

  const stats = {
    upcomingBookings: pendingJobs.length,
    properties: properties.length,
    completedJobs: completedJobs.length,
    rating: null as number | null, // no client rating until reviews API exists
  }

  // Format jobs for display
  const upcomingBookings = pendingJobs.slice(0, 5).map((job) => ({
    id: job.id,
    title: job.services.join(', '),
    property: properties.find((p) => p.id === job.property_id)?.address || 'Property',
    cleaner: 'Assigned Cleaner',
    cleanerRating: null as number | null,
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
            })()}
            , {session?.user?.email?.split('@')[0]} 👋
          </h1>
          <p className="text-muted-foreground mt-1">Manage your properties and bookings.</p>
        </div>
        <Link href="/client/book">
          <Button className="bg-brand-500 hover:bg-brand-600">
            <Plus className="mr-2 h-4 w-4" />
            Book a Cleaning
          </Button>
        </Link>
      </div>

      {/* Error banner */}
      {loadError && (
        <div className="flex items-center gap-3 rounded-xl border border-red-200 bg-red-50 p-4 dark:border-red-800 dark:bg-red-500/10">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-500" />
          <p className="text-sm text-red-600 dark:text-red-400">
            We couldn&apos;t load your dashboard data. Please refresh the page.
          </p>
        </div>
      )}

      {/* Stats Grid */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="bg-brand-100 dark:bg-brand-500/20 rounded-xl p-3">
                <Calendar className="text-brand-600 dark:text-brand-400 h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.upcomingBookings}</p>
                <p className="text-muted-foreground text-sm">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-500/20">
                <Home className="h-6 w-6 text-blue-600 dark:text-blue-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.properties}</p>
                <p className="text-muted-foreground text-sm">Properties</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-green-100 p-3 dark:bg-green-500/20">
                <Calendar className="h-6 w-6 text-green-600 dark:text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completedJobs}</p>
                <p className="text-muted-foreground text-sm">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-amber-100 p-3 dark:bg-amber-500/20">
                <Star className="h-6 w-6 text-amber-600 dark:text-amber-400" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.rating ?? '—'}</p>
                <p className="text-muted-foreground text-sm">Your Rating</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Main Content */}
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Upcoming Bookings */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Upcoming Bookings</CardTitle>
              <Link href="/client/bookings">
                <Button variant="ghost" size="sm">
                  View all <ArrowRight className="ml-1 h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {upcomingBookings.map((booking) => (
                  <div
                    key={booking.id}
                    className="flex items-center gap-4 rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50"
                  >
                    <div className="bg-brand-100 dark:bg-brand-500/20 rounded-lg p-3">
                      <Home className="text-brand-600 dark:text-brand-400 h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium">{booking.title}</p>
                      <p className="text-muted-foreground text-sm">{booking.property}</p>
                      <div className="mt-1 flex items-center gap-2">
                        <span className="text-sm">{booking.cleaner}</span>
                        <span className="flex items-center text-sm text-amber-500">
                          <Star className="mr-0.5 h-3 w-3 fill-current" />
                          {booking.cleanerRating}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium">{booking.date}</p>
                      <p className="text-muted-foreground flex items-center justify-end gap-1 text-sm">
                        <Clock className="h-3 w-3" />
                        {booking.time}
                      </p>
                      <span
                        className={`mt-1 inline-block rounded-full px-2 py-0.5 text-xs ${
                          booking.status === 'confirmed'
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
                  <Plus className="h-4 w-4" />
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="space-y-3">
              {properties.map((property) => (
                <Link key={property.id} href={`/client/properties/${property.id}`}>
                  <div className="rounded-lg p-3 transition hover:bg-slate-50 dark:hover:bg-slate-800/50">
                    <p className="font-medium">{property.name || property.address}</p>
                    <p className="text-muted-foreground flex items-center gap-1 text-sm">
                      <MapPin className="h-3 w-3" />
                      {property.address}
                    </p>
                    <p className="text-muted-foreground mt-1 text-xs">
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
