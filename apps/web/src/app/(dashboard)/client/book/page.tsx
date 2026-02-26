'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { loadStripe } from '@stripe/stripe-js'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
    Home, Calendar, Clock, CheckCircle, ArrowRight, ArrowLeft,
    Loader2, Sparkles, Star, DollarSign
} from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '')

const SERVICES = [
    { id: 'standard', name: 'Standard Clean', description: 'Regular maintenance cleaning', price: 100, icon: '🧹' },
    { id: 'deep', name: 'Deep Clean', description: 'Thorough top-to-bottom cleaning', price: 180, icon: '✨' },
    { id: 'airbnb', name: 'Airbnb Turnover', description: 'Quick turnover between guests', price: 120, icon: '🏠' },
    { id: 'move-out', name: 'Move In/Out', description: 'Prepare for new residents', price: 250, icon: '📦' },
]

const ADD_ONS = [
    { id: 'carpet', name: 'Carpet Cleaning', price: 80, icon: '🔲' },
    { id: 'windows', name: 'Window Cleaning', price: 60, icon: '🪟' },
    { id: 'laundry', name: 'Laundry Service', price: 40, icon: '👕' },
    { id: 'fridge', name: 'Fridge Deep Clean', price: 35, icon: '❄️' },
    { id: 'oven', name: 'Oven Deep Clean', price: 35, icon: '🔥' },
]

interface Property {
    id: string
    name: string
    address: string
    sqft: number
    bedrooms: number
    bathrooms: number
}

interface Estimate {
    total: number
    estimates: Record<string, number>
    estimated_hours: number
}

export default function BookingWizardPage() {
    const { data: session } = useSession()
    const router = useRouter()

    const [step, setStep] = useState(1)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState('')

    // Step 1: Property
    const [properties, setProperties] = useState<Property[]>([])
    const [selectedProperty, setSelectedProperty] = useState<string>('')
    const [loadingProperties, setLoadingProperties] = useState(true)

    // Step 2: Service
    const [selectedServices, setSelectedServices] = useState<string[]>([])
    const [selectedAddOns, setSelectedAddOns] = useState<string[]>([])

    // Step 3: Schedule
    const [selectedDate, setSelectedDate] = useState('')
    const [selectedTime, setSelectedTime] = useState('')

    // Step 4: Confirm
    const [estimate, setEstimate] = useState<Estimate | null>(null)
    const [description, setDescription] = useState('')
    const [submitting, setSubmitting] = useState(false)

    // Agreement
    const [agreementText, setAgreementText] = useState('')
    const [agreementAccepted, setAgreementAccepted] = useState(false)
    const [loadingAgreement, setLoadingAgreement] = useState(false)

    // Fetch properties
    useEffect(() => {
        const fetchProperties = async () => {
            try {
                const token = (session as any)?.accessToken
                if (!token) return

                const res = await fetch(`${API_URL}/api/v1/properties`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                })

                if (res.ok) {
                    const data = await res.json()
                    setProperties(data)
                }
            } catch (err) {
                console.error('Failed to fetch properties')
            } finally {
                setLoadingProperties(false)
            }
        }

        if (session) fetchProperties()
    }, [session])

    // Fetch agreement template when reaching confirm step
    useEffect(() => {
        if (step !== 4 || agreementText) return
        setLoadingAgreement(true)
        fetch(`${API_URL}/api/v1/agreements/templates/service`)
            .then(res => res.ok ? res.json() : null)
            .then(data => { if (data?.content) setAgreementText(data.content) })
            .catch(() => { })
            .finally(() => setLoadingAgreement(false))
    }, [step, agreementText])

    // Fetch estimate when services change
    useEffect(() => {
        const fetchEstimate = async () => {
            if (!selectedProperty || selectedServices.length === 0) {
                setEstimate(null)
                return
            }

            try {
                const res = await fetch(`${API_URL}/api/v1/jobs/estimate`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        property_id: selectedProperty,
                        services: selectedServices,
                        add_ons: selectedAddOns,
                    })
                })

                if (res.ok) {
                    const data = await res.json()
                    setEstimate(data)
                }
            } catch (err) {
                console.error('Failed to fetch estimate')
            }
        }

        fetchEstimate()
    }, [selectedProperty, selectedServices, selectedAddOns])

    const toggleService = (id: string) => {
        setSelectedServices(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        )
    }

    const toggleAddOn = (id: string) => {
        setSelectedAddOns(prev =>
            prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
        )
    }

    const handleSubmit = async () => {
        if (!agreementAccepted) {
            setError('Please accept the service agreement before proceeding')
            return
        }
        setSubmitting(true)
        setError('')

        try {
            const token = (session as any)?.accessToken

            // Step 1: Create the job
            const res = await fetch(`${API_URL}/api/v1/jobs`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({
                    property_id: selectedProperty,
                    services: [...selectedServices, ...selectedAddOns],
                    scheduled_date: selectedDate,
                    scheduled_time: selectedTime,
                    description: description,
                })
            })

            if (!res.ok) {
                const data = await res.json()
                setError(data.detail || 'Failed to create booking')
                return
            }

            const job = await res.json()

            // Step 1.5: Record agreement acceptance
            await fetch(`${API_URL}/api/v1/agreements/`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    job_id: job.id,
                    agreement_type: 'service',
                }),
            }).catch(() => { /* non-blocking */ })

            // Step 2: Create Stripe Payment Intent
            const amountInCents = Math.round((estimate?.total || 100) * 100)
            const paymentRes = await fetch(`${API_URL}/api/v1/payments/create-payment-intent`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`,
                },
                body: JSON.stringify({
                    amount: amountInCents,
                    jobId: job.id,
                    customerId: (session as any)?.user?.id || '',
                    capture_method: 'automatic',
                }),
            })

            if (!paymentRes.ok) {
                // Job created but payment failed — still redirect, show warning
                router.push(`/client/bookings/${job.id}?payment=pending`)
                return
            }

            const { clientSecret } = await paymentRes.json()

            // Step 3: Confirm the payment with Stripe.js
            const stripe = await stripePromise
            if (stripe && clientSecret) {
                const { error: stripeError } = await stripe.confirmPayment({
                    clientSecret,
                    confirmParams: {
                        return_url: `${window.location.origin}/client/bookings/${job.id}?payment=success`,
                    },
                })

                if (stripeError) {
                    // Payment failed but job exists — redirect with status
                    setError(stripeError.message || 'Payment failed')
                    return
                }
            } else {
                // Stripe not loaded — redirect with pending payment
                router.push(`/client/bookings/${job.id}?payment=pending`)
            }
        } catch (err) {
            setError('Failed to connect to server')
        } finally {
            setSubmitting(false)
        }
    }

    const canProceed = () => {
        switch (step) {
            case 1: return !!selectedProperty
            case 2: return selectedServices.length > 0
            case 3: return !!selectedDate && !!selectedTime
            case 4: return agreementAccepted
            default: return false
        }
    }

    const selectedPropertyData = properties.find(p => p.id === selectedProperty)

    // Generate time slots
    const timeSlots = ['08:00', '09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00']

    // Generate dates for next 14 days
    const dates = Array.from({ length: 14 }, (_, i) => {
        const date = new Date()
        date.setDate(date.getDate() + i + 1)
        return date.toISOString().split('T')[0]
    })

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Progress Steps */}
            <div className="flex items-center justify-center gap-2 mb-8">
                {[1, 2, 3, 4].map((s) => (
                    <div key={s} className="flex items-center">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium transition-colors ${s === step ? 'bg-emerald-500 text-white' :
                            s < step ? 'bg-emerald-100 text-emerald-700' :
                                'bg-slate-100 text-slate-400'
                            }`}>
                            {s < step ? <CheckCircle className="w-5 h-5" /> : s}
                        </div>
                        {s < 4 && <div className={`w-12 h-1 mx-2 ${s < step ? 'bg-emerald-500' : 'bg-slate-200'}`} />}
                    </div>
                ))}
            </div>

            {/* Step 1: Select Property */}
            {step === 1 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Home className="w-5 h-5 text-emerald-500" />
                            Select Property
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        {loadingProperties ? (
                            <div className="text-center py-8">
                                <Loader2 className="w-8 h-8 animate-spin mx-auto text-muted-foreground" />
                            </div>
                        ) : properties.length === 0 ? (
                            <div className="text-center py-8">
                                <p className="text-muted-foreground mb-4">No properties found</p>
                                <Button onClick={() => router.push('/client/properties/add')}>
                                    Add a Property
                                </Button>
                            </div>
                        ) : (
                            <div className="grid gap-3">
                                {properties.map((prop) => (
                                    <div
                                        key={prop.id}
                                        onClick={() => setSelectedProperty(prop.id)}
                                        className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedProperty === prop.id
                                            ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div>
                                                <p className="font-medium">{prop.name || 'Property'}</p>
                                                <p className="text-sm text-muted-foreground">{prop.address}</p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {prop.bedrooms} bed • {prop.bathrooms} bath • {prop.sqft} sqft
                                                </p>
                                            </div>
                                            {selectedProperty === prop.id && (
                                                <CheckCircle className="w-6 h-6 text-emerald-500" />
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Step 2: Select Services */}
            {step === 2 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-emerald-500" />
                            Select Services
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div className="grid sm:grid-cols-2 gap-3">
                            {SERVICES.map((service) => (
                                <div
                                    key={service.id}
                                    onClick={() => toggleService(service.id)}
                                    className={`p-4 rounded-lg border-2 cursor-pointer transition-all ${selectedServices.includes(service.id)
                                        ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-500/10'
                                        : 'border-slate-200 hover:border-slate-300'
                                        }`}
                                >
                                    <div className="flex items-start justify-between">
                                        <div>
                                            <span className="text-2xl">{service.icon}</span>
                                            <p className="font-medium mt-2">{service.name}</p>
                                            <p className="text-sm text-muted-foreground">{service.description}</p>
                                            <p className="text-sm font-medium text-emerald-600 mt-1">
                                                From ${service.price}
                                            </p>
                                        </div>
                                        {selectedServices.includes(service.id) && (
                                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div>
                            <p className="text-sm font-medium mb-3">Add-ons (optional)</p>
                            <div className="flex flex-wrap gap-2">
                                {ADD_ONS.map((addon) => (
                                    <button
                                        key={addon.id}
                                        onClick={() => toggleAddOn(addon.id)}
                                        className={`px-3 py-2 rounded-lg border text-sm transition-colors ${selectedAddOns.includes(addon.id)
                                            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        {addon.icon} {addon.name} (+${addon.price})
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 3: Schedule */}
            {step === 3 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Calendar className="w-5 h-5 text-emerald-500" />
                            Select Date & Time
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        <div>
                            <p className="text-sm font-medium mb-3">Select Date</p>
                            <div className="grid grid-cols-7 gap-2">
                                {dates.map((date) => {
                                    const d = new Date(date)
                                    const dayName = d.toLocaleDateString('en-US', { weekday: 'short' })
                                    const dayNum = d.getDate()
                                    return (
                                        <button
                                            key={date}
                                            onClick={() => setSelectedDate(date)}
                                            className={`p-2 rounded-lg border text-center transition-colors ${selectedDate === date
                                                ? 'border-emerald-500 bg-emerald-500 text-white'
                                                : 'border-slate-200 hover:border-slate-300'
                                                }`}
                                        >
                                            <p className="text-xs">{dayName}</p>
                                            <p className="font-medium">{dayNum}</p>
                                        </button>
                                    )
                                })}
                            </div>
                        </div>

                        <div>
                            <p className="text-sm font-medium mb-3">Select Time</p>
                            <div className="grid grid-cols-5 gap-2">
                                {timeSlots.map((time) => (
                                    <button
                                        key={time}
                                        onClick={() => setSelectedTime(time)}
                                        className={`p-3 rounded-lg border text-center transition-colors ${selectedTime === time
                                            ? 'border-emerald-500 bg-emerald-500 text-white'
                                            : 'border-slate-200 hover:border-slate-300'
                                            }`}
                                    >
                                        {time}
                                    </button>
                                ))}
                            </div>
                        </div>
                    </CardContent>
                </Card>
            )}

            {/* Step 4: Confirm */}
            {step === 4 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <CheckCircle className="w-5 h-5 text-emerald-500" />
                            Confirm Booking
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                        {/* Summary */}
                        <div className="bg-slate-50 dark:bg-slate-800 rounded-lg p-4 space-y-3">
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Property</span>
                                <span className="font-medium">{selectedPropertyData?.name || selectedPropertyData?.address}</span>
                            </div>
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Services</span>
                                <span className="font-medium">{selectedServices.map(s =>
                                    SERVICES.find(srv => srv.id === s)?.name
                                ).join(', ')}</span>
                            </div>
                            {selectedAddOns.length > 0 && (
                                <div className="flex justify-between">
                                    <span className="text-muted-foreground">Add-ons</span>
                                    <span className="font-medium">{selectedAddOns.map(s =>
                                        ADD_ONS.find(a => a.id === s)?.name
                                    ).join(', ')}</span>
                                </div>
                            )}
                            <div className="flex justify-between">
                                <span className="text-muted-foreground">Date & Time</span>
                                <span className="font-medium">
                                    {new Date(selectedDate).toLocaleDateString('en-US', {
                                        weekday: 'long', month: 'short', day: 'numeric'
                                    })} at {selectedTime}
                                </span>
                            </div>
                            {estimate && (
                                <>
                                    <div className="flex justify-between">
                                        <span className="text-muted-foreground">Estimated Duration</span>
                                        <span className="font-medium">{estimate.estimated_hours} hours</span>
                                    </div>
                                    <div className="border-t pt-3 flex justify-between">
                                        <span className="font-medium text-lg">Estimated Total</span>
                                        <span className="font-bold text-xl text-emerald-600">${estimate.total}</span>
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Escrow Explainer */}
                        <div className="p-4 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/30">
                            <div className="flex items-start gap-3">
                                <DollarSign className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
                                <div>
                                    <p className="font-medium text-emerald-700 dark:text-emerald-400 text-sm">
                                        Secure Escrow Payment
                                    </p>
                                    <p className="text-xs text-emerald-600 dark:text-emerald-500 mt-1">
                                        Your payment is held securely until the job is confirmed as complete.
                                        You can request a refund if the service doesn&apos;t meet expectations.
                                    </p>
                                </div>
                            </div>
                        </div>

                        <div>
                            <label className="text-sm font-medium">Special Instructions (optional)</label>
                            <Input
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                placeholder="Any special notes for the cleaner..."
                                className="mt-2"
                            />
                        </div>

                        {/* Service Agreement */}
                        <div className="border-t pt-6">
                            <p className="text-sm font-medium mb-3 flex items-center gap-2">
                                📋 Service Agreement
                            </p>
                            {loadingAgreement ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <>
                                    <div className="max-h-48 overflow-y-auto rounded-lg bg-slate-50 dark:bg-slate-800 border p-4 text-xs text-muted-foreground whitespace-pre-wrap mb-3">
                                        {agreementText || 'By proceeding, you agree to BookACleaner\'s Service Agreement, Cancellation Policy, and Terms of Service.'}
                                    </div>
                                    <label className="flex items-start gap-3 cursor-pointer">
                                        <input
                                            type="checkbox"
                                            checked={agreementAccepted}
                                            onChange={(e) => setAgreementAccepted(e.target.checked)}
                                            className="mt-1 w-4 h-4 rounded border-slate-300 text-emerald-500 focus:ring-emerald-500"
                                        />
                                        <span className="text-sm">
                                            I have read and accept the <strong>Service Agreement</strong>, <strong>Cancellation Policy</strong>, and <strong>Terms of Service</strong>.
                                        </span>
                                    </label>
                                </>
                            )}
                        </div>

                        {error && (
                            <div className="p-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
                                {error}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Navigation */}
            <div className="flex justify-between">
                {step > 1 ? (
                    <Button variant="outline" onClick={() => setStep(step - 1)}>
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back
                    </Button>
                ) : <div />}

                {step < 4 ? (
                    <Button
                        onClick={() => setStep(step + 1)}
                        disabled={!canProceed()}
                    >
                        Continue
                        <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                ) : (
                    <Button
                        onClick={handleSubmit}
                        disabled={submitting}
                        className="bg-emerald-500 hover:bg-emerald-600"
                    >
                        {submitting ? (
                            <Loader2 className="w-4 h-4 animate-spin mr-2" />
                        ) : (
                            <DollarSign className="w-4 h-4 mr-2" />
                        )}
                        Confirm & Pay
                    </Button>
                )}
            </div>
        </div>
    )
}
