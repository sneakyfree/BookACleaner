'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  ArrowRight,
  Calendar,
  CheckCircle,
  Clock,
  Home,
  Loader2,
  MapPin,
  Star,
  CreditCard,
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

type BookingStep = 'property' | 'services' | 'datetime' | 'review' | 'payment'

const steps: { id: BookingStep; label: string }[] = [
  { id: 'property', label: 'Property' },
  { id: 'services', label: 'Services' },
  { id: 'datetime', label: 'Date & Time' },
  { id: 'review', label: 'Review' },
  { id: 'payment', label: 'Payment' },
]

interface CleanerData {
  id: string
  businessName: string
  overallRating: number
  services: { id: string; name: string; price: number; description: string }[]
}

interface PropertyData {
  id: string
  name: string
  address: string
  sqFt: number
}

export default function BookCleanerPage() {
  const params = useParams()
  const router = useRouter()
  const { data: session } = useSession()
  const cleanerId = params.cleanerId as string

  const [step, setStep] = useState<BookingStep>('property')
  const [isLoading, setIsLoading] = useState(false)
  const [loadingData, setLoadingData] = useState(true)
  const [booking, setBooking] = useState({
    propertyId: '',
    services: [] as string[],
    date: '',
    time: '',
    instructions: '',
  })

  const [cleaner, setCleaner] = useState<CleanerData | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [properties, setProperties] = useState<PropertyData[]>([])
  const [availableSlots, setAvailableSlots] = useState<string[]>([
    '9:00 AM',
    '10:00 AM',
    '11:00 AM',
    '1:00 PM',
    '2:00 PM',
    '3:00 PM',
  ])

  // Fetch cleaner profile + user properties + availability
  useEffect(() => {
    async function fetchData() {
      try {
        const token = (session as any)?.accessToken

        // Fetch cleaner profile
        const cleanerRes = await fetch(`${API_URL}/api/v1/cleaners/${cleanerId}`)
        if (!cleanerRes.ok) {
          setLoadError(
            cleanerRes.status === 404
              ? 'This cleaner could not be found.'
              : 'We could not load this cleaner right now. Please try again.'
          )
          return
        }
        {
          const cd = await cleanerRes.json()
          setCleaner({
            id: cd.id,
            businessName: cd.business_name || cd.name || 'Cleaner',
            overallRating: cd.overall_rating || cd.rating || 0,
            services: cd.services?.map((s: any) => ({
              id: s.id || s.name?.toLowerCase().replace(/\s+/g, '_'),
              name: s.name || s,
              price: s.price || 100,
              description: s.description || '',
            })) || [
              {
                id: 'standard',
                name: 'Standard Clean',
                price: 100,
                description: 'Regular cleaning',
              },
              { id: 'deep', name: 'Deep Clean', price: 180, description: 'Thorough deep cleaning' },
            ],
          })
        }

        // Fetch user properties
        if (token) {
          const propsRes = await fetch(`${API_URL}/api/v1/properties/`, {
            headers: { Authorization: `Bearer ${token}` },
          })
          if (propsRes.ok) {
            const pd = await propsRes.json()
            const items = pd.properties || pd.items || pd || []
            setProperties(
              items.map((p: any) => ({
                id: p.id,
                name: p.name || p.address,
                address: `${p.address}${p.city ? `, ${p.city}` : ''}${p.state ? `, ${p.state}` : ''}`,
                sqFt: p.square_feet || 0,
              }))
            )
          }
        }

        // Fetch availability
        try {
          const availRes = await fetch(`${API_URL}/api/v1/cleaners/${cleanerId}/availability`)
          if (availRes.ok) {
            const ad = await availRes.json()
            if (ad.slots && ad.slots.length > 0) setAvailableSlots(ad.slots)
          }
        } catch {
          /* use default slots */
        }
      } catch (err) {
        console.error('Failed to load booking data:', err)
        setLoadError('We could not load this cleaner right now. Please try again.')
      } finally {
        setLoadingData(false)
      }
    }
    fetchData()
  }, [cleanerId, session])

  // Calculate total
  const selectedServices = (cleaner?.services || []).filter((s) => booking.services.includes(s.id))
  const total = selectedServices.reduce((sum, s) => sum + s.price, 0)

  if (loadError) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-slate-50 px-4 text-center dark:bg-slate-900">
        <p className="text-lg font-medium">{loadError}</p>
        <a href="/cleaners" className="text-brand-600 hover:underline">
          Browse other cleaners
        </a>
      </div>
    )
  }

  if (loadingData || !cleaner) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <Loader2 className="text-brand-500 h-8 w-8 animate-spin" />
        <span className="text-muted-foreground ml-3">Loading booking...</span>
      </div>
    )
  }

  const currentStepIndex = steps.findIndex((s) => s.id === step)

  function nextStep() {
    if (currentStepIndex < steps.length - 1) {
      setStep(steps[currentStepIndex + 1].id)
    }
  }

  function prevStep() {
    if (currentStepIndex > 0) {
      setStep(steps[currentStepIndex - 1].id)
    }
  }

  async function handleSubmit() {
    setIsLoading(true)
    try {
      const token = (session as any)?.accessToken
      const headers: Record<string, string> = { 'Content-Type': 'application/json' }
      if (token) headers.Authorization = `Bearer ${token}`
      const response = await fetch(`${API_URL}/api/v1/jobs`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          cleaner_id: cleanerId,
          property_id: booking.propertyId,
          services: booking.services,
          scheduled_date: booking.date,
          scheduled_time: booking.time,
          description: booking.instructions,
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to create booking')
      }

      const job = await response.json()
      router.push('/client/bookings?success=true')
    } catch (error) {
      console.error('Booking error:', error)
      alert('Failed to create booking. Please try again.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-700 py-6">
        <div className="container mx-auto px-4">
          <Link
            href={`/cleaners/${cleanerId}`}
            className="mb-4 inline-flex items-center text-white/80 hover:text-white"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to profile
          </Link>
          <h1 className="text-2xl font-bold text-white">Book {cleaner.businessName}</h1>
        </div>
      </div>

      <div className="container mx-auto max-w-4xl px-4 py-8">
        {/* Progress Steps */}
        <div className="mb-8 flex items-center justify-between">
          {steps.map((s, i) => (
            <div key={s.id} className="flex items-center">
              <div
                className={`flex h-10 w-10 items-center justify-center rounded-full font-semibold ${
                  i <= currentStepIndex
                    ? 'bg-brand-500 text-white'
                    : 'text-muted-foreground bg-slate-200 dark:bg-slate-700'
                }`}
              >
                {i < currentStepIndex ? <CheckCircle className="h-5 w-5" /> : i + 1}
              </div>
              <span
                className={`ml-2 hidden md:block ${
                  i <= currentStepIndex ? 'font-medium' : 'text-muted-foreground'
                }`}
              >
                {s.label}
              </span>
              {i < steps.length - 1 && (
                <div
                  className={`mx-2 h-1 w-8 rounded md:w-16 ${
                    i < currentStepIndex ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'
                  }`}
                />
              )}
            </div>
          ))}
        </div>

        {/* Step Content */}
        <Card>
          <CardContent className="p-6">
            {/* Step 1: Select Property */}
            {step === 'property' && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-2 text-xl font-semibold">Select Property</h2>
                  <p className="text-muted-foreground">Choose which property you want cleaned</p>
                </div>

                <div className="space-y-3">
                  {properties.map((property) => (
                    <button
                      key={property.id}
                      onClick={() => setBooking({ ...booking, propertyId: property.id })}
                      className={`flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition ${
                        booking.propertyId === property.id
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <div className="bg-brand-100 dark:bg-brand-500/20 rounded-lg p-3">
                        <Home className="text-brand-600 h-6 w-6" />
                      </div>
                      <div className="flex-1">
                        <p className="font-semibold">{property.name}</p>
                        <p className="text-muted-foreground flex items-center gap-1 text-sm">
                          <MapPin className="h-3 w-3" />
                          {property.address}
                        </p>
                        <p className="text-muted-foreground mt-1 text-xs">
                          {property.sqFt.toLocaleString()} sq ft
                        </p>
                      </div>
                      {booking.propertyId === property.id && (
                        <CheckCircle className="text-brand-500 h-6 w-6" />
                      )}
                    </button>
                  ))}
                </div>

                <Link href="/client/properties/new" className="block">
                  <Button variant="outline" className="w-full">
                    + Add New Property
                  </Button>
                </Link>
              </div>
            )}

            {/* Step 2: Select Services */}
            {step === 'services' && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-2 text-xl font-semibold">Select Services</h2>
                  <p className="text-muted-foreground">Choose the cleaning services you need</p>
                </div>

                <div className="space-y-3">
                  {cleaner.services.map((service) => (
                    <button
                      key={service.id}
                      onClick={() => {
                        const services = booking.services.includes(service.id)
                          ? booking.services.filter((s) => s !== service.id)
                          : [...booking.services, service.id]
                        setBooking({ ...booking, services })
                      }}
                      className={`flex w-full items-center justify-between rounded-xl border-2 p-4 text-left transition ${
                        booking.services.includes(service.id)
                          ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                          : 'border-slate-200 hover:border-slate-300 dark:border-slate-700'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <div
                          className={`flex h-6 w-6 items-center justify-center rounded border-2 ${
                            booking.services.includes(service.id)
                              ? 'border-brand-500 bg-brand-500'
                              : 'border-slate-300'
                          }`}
                        >
                          {booking.services.includes(service.id) && (
                            <CheckCircle className="h-4 w-4 text-white" />
                          )}
                        </div>
                        <div>
                          <p className="font-semibold">{service.name}</p>
                          <p className="text-muted-foreground text-sm">{service.description}</p>
                        </div>
                      </div>
                      <p className="text-lg font-semibold">${service.price}</p>
                    </button>
                  ))}
                </div>

                {booking.services.length > 0 && (
                  <div className="bg-brand-50 dark:bg-brand-500/10 rounded-xl p-4">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">Selected Services Total</span>
                      <span className="text-brand-600 text-2xl font-bold">${total}</span>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Step 3: Date & Time */}
            {step === 'datetime' && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-2 text-xl font-semibold">Select Date & Time</h2>
                  <p className="text-muted-foreground">Choose when you want your cleaning</p>
                </div>

                <div className="grid gap-6 md:grid-cols-2">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Date</label>
                    <Input
                      type="date"
                      value={booking.date}
                      onChange={(e) => setBooking({ ...booking, date: e.target.value })}
                      min={new Date().toISOString().split('T')[0]}
                    />
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">Available Times</label>
                    <div className="grid grid-cols-3 gap-2">
                      {availableSlots.map((slot) => (
                        <button
                          key={slot}
                          onClick={() => setBooking({ ...booking, time: slot })}
                          className={`rounded-lg p-2 text-sm font-medium transition ${
                            booking.time === slot
                              ? 'bg-brand-500 text-white'
                              : 'bg-slate-100 hover:bg-slate-200 dark:bg-slate-800'
                          }`}
                        >
                          {slot}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Special Instructions (optional)</label>
                  <Textarea
                    value={booking.instructions}
                    onChange={(e) => setBooking({ ...booking, instructions: e.target.value })}
                    placeholder="Any special requests, access codes, or notes..."
                    rows={3}
                  />
                </div>
              </div>
            )}

            {/* Step 4: Review */}
            {step === 'review' && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-2 text-xl font-semibold">Review Your Booking</h2>
                  <p className="text-muted-foreground">Please confirm your booking details</p>
                </div>

                <div className="space-y-4">
                  <div className="flex justify-between border-b py-3">
                    <span className="text-muted-foreground">Cleaner</span>
                    <div className="text-right">
                      <p className="font-medium">{cleaner.businessName}</p>
                      <p className="flex items-center justify-end gap-1 text-sm text-amber-500">
                        <Star className="h-3 w-3 fill-current" />
                        {cleaner.overallRating}
                      </p>
                    </div>
                  </div>

                  <div className="flex justify-between border-b py-3">
                    <span className="text-muted-foreground">Property</span>
                    <span className="font-medium">
                      {properties.find((p) => p.id === booking.propertyId)?.name}
                    </span>
                  </div>

                  <div className="flex justify-between border-b py-3">
                    <span className="text-muted-foreground">Services</span>
                    <span className="text-right font-medium">
                      {selectedServices.map((s) => s.name).join(', ')}
                    </span>
                  </div>

                  <div className="flex justify-between border-b py-3">
                    <span className="text-muted-foreground">Date & Time</span>
                    <span className="font-medium">
                      {booking.date} at {booking.time}
                    </span>
                  </div>

                  {booking.instructions && (
                    <div className="border-b py-3">
                      <span className="text-muted-foreground mb-1 block">Instructions</span>
                      <p className="text-sm">{booking.instructions}</p>
                    </div>
                  )}

                  <div className="flex justify-between py-3 text-lg font-bold">
                    <span>Total</span>
                    <span className="text-brand-600">${total}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Step 5: Payment */}
            {step === 'payment' && (
              <div className="space-y-6">
                <div>
                  <h2 className="mb-2 text-xl font-semibold">Payment</h2>
                  <p className="text-muted-foreground">
                    Review your total and confirm your booking
                  </p>
                </div>

                <div className="border-brand-200 bg-brand-50 dark:bg-brand-500/10 rounded-xl border p-4">
                  <div className="flex items-start gap-3">
                    <CreditCard className="text-brand-600 mt-0.5 h-5 w-5" />
                    <div>
                      <p className="text-brand-700 dark:text-brand-400 font-medium">
                        Secure Payment
                      </p>
                      <p className="text-brand-600/80 text-sm">
                        You&apos;ll complete secure payment after your booking is confirmed. No
                        charge is made now.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex justify-between py-3 text-xl font-bold">
                  <span>Total</span>
                  <span className="text-brand-600">${total}</span>
                </div>
              </div>
            )}

            {/* Navigation */}
            <div className="mt-8 flex justify-between border-t pt-6">
              <Button variant="outline" onClick={prevStep} disabled={currentStepIndex === 0}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
              </Button>

              {step === 'payment' ? (
                <Button
                  onClick={handleSubmit}
                  disabled={isLoading}
                  className="bg-brand-500 hover:bg-brand-600"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Confirm Booking
                    </>
                  )}
                </Button>
              ) : (
                <Button
                  onClick={nextStep}
                  disabled={
                    (step === 'property' && !booking.propertyId) ||
                    (step === 'services' && booking.services.length === 0) ||
                    (step === 'datetime' && (!booking.date || !booking.time))
                  }
                  className="bg-brand-500 hover:bg-brand-600"
                >
                  Continue
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
