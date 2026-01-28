'use client'

import { useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
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
    Sparkles,
    Star,
    CreditCard,
} from 'lucide-react'

type BookingStep = 'property' | 'services' | 'datetime' | 'review' | 'payment'

const steps: { id: BookingStep; label: string }[] = [
    { id: 'property', label: 'Property' },
    { id: 'services', label: 'Services' },
    { id: 'datetime', label: 'Date & Time' },
    { id: 'review', label: 'Review' },
    { id: 'payment', label: 'Payment' },
]

export default function BookCleanerPage() {
    const params = useParams()
    const router = useRouter()
    const cleanerId = params.cleanerId as string

    const [step, setStep] = useState<BookingStep>('property')
    const [isLoading, setIsLoading] = useState(false)
    const [booking, setBooking] = useState({
        propertyId: '',
        services: [] as string[],
        date: '',
        time: '',
        instructions: '',
    })

    // Mock cleaner
    const cleaner = {
        id: cleanerId,
        businessName: "Maria's Cleaning Service",
        overallRating: 4.9,
        services: [
            { id: 'standard', name: 'Standard Clean', price: 100, description: 'Regular cleaning' },
            { id: 'deep', name: 'Deep Clean', price: 180, description: 'Thorough cleaning' },
            { id: 'airbnb', name: 'Airbnb Turnover', price: 120, description: 'Guest changeover' },
            { id: 'moveout', name: 'Move In/Out', price: 250, description: 'Empty property cleaning' },
        ],
    }

    // Mock properties
    const properties = [
        { id: '1', name: 'Lake House', address: '123 Lake Street, Austin, TX', sqFt: 2200 },
        { id: '2', name: 'Downtown Condo', address: '456 Main Ave, Austin, TX', sqFt: 1100 },
    ]

    // Mock availability
    const availableSlots = ['9:00 AM', '10:00 AM', '11:00 AM', '1:00 PM', '2:00 PM', '3:00 PM']

    // Calculate total
    const selectedServices = cleaner.services.filter((s) => booking.services.includes(s.id))
    const total = selectedServices.reduce((sum, s) => sum + s.price, 0)

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
            // Call the backend API to create the job
            const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/api/v1/jobs`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    cleanerId: cleanerId,
                    propertyId: booking.propertyId,
                    services: booking.services,
                    scheduledDate: booking.date,
                    scheduledTime: booking.time,
                    description: booking.instructions,
                    jobType: 'DIRECT',
                    totalPrice: total,
                }),
            })

            if (!response.ok) {
                throw new Error('Failed to create booking')
            }

            const job = await response.json()
            console.log('Job created:', job)
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
                        className="inline-flex items-center text-white/80 hover:text-white mb-4"
                    >
                        <ArrowLeft className="w-4 h-4 mr-2" />
                        Back to profile
                    </Link>
                    <h1 className="text-2xl font-bold text-white">Book {cleaner.businessName}</h1>
                </div>
            </div>

            <div className="container mx-auto px-4 py-8 max-w-4xl">
                {/* Progress Steps */}
                <div className="flex items-center justify-between mb-8">
                    {steps.map((s, i) => (
                        <div key={s.id} className="flex items-center">
                            <div
                                className={`flex items-center justify-center w-10 h-10 rounded-full font-semibold ${i <= currentStepIndex
                                    ? 'bg-brand-500 text-white'
                                    : 'bg-slate-200 dark:bg-slate-700 text-muted-foreground'
                                    }`}
                            >
                                {i < currentStepIndex ? <CheckCircle className="w-5 h-5" /> : i + 1}
                            </div>
                            <span
                                className={`ml-2 hidden md:block ${i <= currentStepIndex ? 'font-medium' : 'text-muted-foreground'
                                    }`}
                            >
                                {s.label}
                            </span>
                            {i < steps.length - 1 && (
                                <div
                                    className={`w-8 md:w-16 h-1 mx-2 rounded ${i < currentStepIndex ? 'bg-brand-500' : 'bg-slate-200 dark:bg-slate-700'
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
                                    <h2 className="text-xl font-semibold mb-2">Select Property</h2>
                                    <p className="text-muted-foreground">
                                        Choose which property you want cleaned
                                    </p>
                                </div>

                                <div className="space-y-3">
                                    {properties.map((property) => (
                                        <button
                                            key={property.id}
                                            onClick={() => setBooking({ ...booking, propertyId: property.id })}
                                            className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition text-left ${booking.propertyId === property.id
                                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="p-3 bg-brand-100 dark:bg-brand-500/20 rounded-lg">
                                                <Home className="w-6 h-6 text-brand-600" />
                                            </div>
                                            <div className="flex-1">
                                                <p className="font-semibold">{property.name}</p>
                                                <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                    <MapPin className="w-3 h-3" />
                                                    {property.address}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {property.sqFt.toLocaleString()} sq ft
                                                </p>
                                            </div>
                                            {booking.propertyId === property.id && (
                                                <CheckCircle className="w-6 h-6 text-brand-500" />
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
                                    <h2 className="text-xl font-semibold mb-2">Select Services</h2>
                                    <p className="text-muted-foreground">
                                        Choose the cleaning services you need
                                    </p>
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
                                            className={`w-full flex items-center justify-between p-4 rounded-xl border-2 transition text-left ${booking.services.includes(service.id)
                                                ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10'
                                                : 'border-slate-200 dark:border-slate-700 hover:border-slate-300'
                                                }`}
                                        >
                                            <div className="flex items-center gap-4">
                                                <div
                                                    className={`w-6 h-6 rounded border-2 flex items-center justify-center ${booking.services.includes(service.id)
                                                        ? 'border-brand-500 bg-brand-500'
                                                        : 'border-slate-300'
                                                        }`}
                                                >
                                                    {booking.services.includes(service.id) && (
                                                        <CheckCircle className="w-4 h-4 text-white" />
                                                    )}
                                                </div>
                                                <div>
                                                    <p className="font-semibold">{service.name}</p>
                                                    <p className="text-sm text-muted-foreground">{service.description}</p>
                                                </div>
                                            </div>
                                            <p className="text-lg font-semibold">${service.price}</p>
                                        </button>
                                    ))}
                                </div>

                                {booking.services.length > 0 && (
                                    <div className="p-4 rounded-xl bg-brand-50 dark:bg-brand-500/10">
                                        <div className="flex items-center justify-between">
                                            <span className="font-medium">Selected Services Total</span>
                                            <span className="text-2xl font-bold text-brand-600">${total}</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Step 3: Date & Time */}
                        {step === 'datetime' && (
                            <div className="space-y-6">
                                <div>
                                    <h2 className="text-xl font-semibold mb-2">Select Date & Time</h2>
                                    <p className="text-muted-foreground">
                                        Choose when you want your cleaning
                                    </p>
                                </div>

                                <div className="grid md:grid-cols-2 gap-6">
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
                                                    className={`p-2 rounded-lg text-sm font-medium transition ${booking.time === slot
                                                        ? 'bg-brand-500 text-white'
                                                        : 'bg-slate-100 dark:bg-slate-800 hover:bg-slate-200'
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
                                    <h2 className="text-xl font-semibold mb-2">Review Your Booking</h2>
                                    <p className="text-muted-foreground">
                                        Please confirm your booking details
                                    </p>
                                </div>

                                <div className="space-y-4">
                                    <div className="flex justify-between py-3 border-b">
                                        <span className="text-muted-foreground">Cleaner</span>
                                        <div className="text-right">
                                            <p className="font-medium">{cleaner.businessName}</p>
                                            <p className="text-sm text-amber-500 flex items-center justify-end gap-1">
                                                <Star className="w-3 h-3 fill-current" />
                                                {cleaner.overallRating}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex justify-between py-3 border-b">
                                        <span className="text-muted-foreground">Property</span>
                                        <span className="font-medium">
                                            {properties.find((p) => p.id === booking.propertyId)?.name}
                                        </span>
                                    </div>

                                    <div className="flex justify-between py-3 border-b">
                                        <span className="text-muted-foreground">Services</span>
                                        <span className="font-medium text-right">
                                            {selectedServices.map((s) => s.name).join(', ')}
                                        </span>
                                    </div>

                                    <div className="flex justify-between py-3 border-b">
                                        <span className="text-muted-foreground">Date & Time</span>
                                        <span className="font-medium">
                                            {booking.date} at {booking.time}
                                        </span>
                                    </div>

                                    {booking.instructions && (
                                        <div className="py-3 border-b">
                                            <span className="text-muted-foreground block mb-1">Instructions</span>
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
                                    <h2 className="text-xl font-semibold mb-2">Payment</h2>
                                    <p className="text-muted-foreground">
                                        Enter your payment details to complete the booking
                                    </p>
                                </div>

                                <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-800">
                                    <div className="flex items-center gap-3 mb-4">
                                        <CreditCard className="w-6 h-6" />
                                        <span className="font-medium">Credit or Debit Card</span>
                                    </div>

                                    <div className="space-y-4">
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Card Number</label>
                                            <Input placeholder="1234 5678 9012 3456" />
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">Expiry</label>
                                                <Input placeholder="MM/YY" />
                                            </div>
                                            <div className="space-y-2">
                                                <label className="text-sm font-medium">CVC</label>
                                                <Input placeholder="123" />
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="p-4 rounded-xl border border-brand-200 bg-brand-50 dark:bg-brand-500/10">
                                    <div className="flex items-start gap-3">
                                        <Sparkles className="w-5 h-5 text-brand-600 mt-0.5" />
                                        <div>
                                            <p className="font-medium text-brand-700 dark:text-brand-400">
                                                Secure Payment
                                            </p>
                                            <p className="text-sm text-brand-600/80">
                                                Your payment is held securely until the job is completed. You can request a
                                                refund if not satisfied.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-between py-3 text-xl font-bold">
                                    <span>Total to Pay</span>
                                    <span className="text-brand-600">${total}</span>
                                </div>
                            </div>
                        )}

                        {/* Navigation */}
                        <div className="flex justify-between mt-8 pt-6 border-t">
                            <Button
                                variant="outline"
                                onClick={prevStep}
                                disabled={currentStepIndex === 0}
                            >
                                <ArrowLeft className="w-4 h-4 mr-2" />
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
                                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                            Processing...
                                        </>
                                    ) : (
                                        <>
                                            <CheckCircle className="w-4 h-4 mr-2" />
                                            Confirm & Pay ${total}
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
                                    <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                            )}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    )
}
