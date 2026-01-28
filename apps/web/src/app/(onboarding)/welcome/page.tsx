'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, ArrowLeft, Check, Building2, Briefcase, MapPin, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Onboarding Wizard for New Users
 * Guided first-run experience for clients and cleaners
 */

type UserType = 'client' | 'cleaner' | null
type OnboardingStep = 'welcome' | 'user-type' | 'profile' | 'preferences' | 'complete'

interface OnboardingData {
    userType: UserType
    name: string
    phone: string
    location: string
    // Client fields
    propertyType?: string
    cleaningFrequency?: string
    // Cleaner fields
    experience?: string
    serviceArea?: string
    services?: string[]
}

export default function OnboardingWizard() {
    const router = useRouter()
    const [step, setStep] = useState<OnboardingStep>('welcome')
    const [data, setData] = useState<OnboardingData>({
        userType: null,
        name: '',
        phone: '',
        location: '',
    })
    const [isSubmitting, setIsSubmitting] = useState(false)

    const steps: OnboardingStep[] = ['welcome', 'user-type', 'profile', 'preferences', 'complete']
    const currentIndex = steps.indexOf(step)
    const progress = ((currentIndex + 1) / steps.length) * 100

    const canProceed = () => {
        switch (step) {
            case 'welcome':
                return true
            case 'user-type':
                return data.userType !== null
            case 'profile':
                return data.name.length > 2 && data.location.length > 2
            case 'preferences':
                return true
            default:
                return false
        }
    }

    const handleNext = async () => {
        if (step === 'preferences') {
            setIsSubmitting(true)
            // Simulate API call
            await new Promise((resolve) => setTimeout(resolve, 1500))
            setIsSubmitting(false)
            setStep('complete')
        } else {
            const nextIndex = currentIndex + 1
            if (nextIndex < steps.length) {
                setStep(steps[nextIndex])
            }
        }
    }

    const handleBack = () => {
        const prevIndex = currentIndex - 1
        if (prevIndex >= 0) {
            setStep(steps[prevIndex])
        }
    }

    const handleComplete = () => {
        // Mark onboarding complete
        localStorage.setItem('onboarding-complete', 'true')
        router.push(data.userType === 'client' ? '/client' : '/cleaner')
    }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col">
            {/* Progress bar */}
            <div className="h-1 bg-white/10">
                <div
                    className="h-full bg-brand-500 transition-all duration-500"
                    style={{ width: `${progress}%` }}
                />
            </div>

            {/* Content */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="max-w-lg w-full">
                    {/* Welcome Step */}
                    {step === 'welcome' && (
                        <div className="text-center animate-fade-in">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-brand-500/20 flex items-center justify-center">
                                <Sparkles className="w-10 h-10 text-brand-400" />
                            </div>
                            <h1 className="text-3xl font-bold text-white mb-4">
                                Welcome to BookACleaner
                            </h1>
                            <p className="text-white/60 mb-8 max-w-md mx-auto">
                                The AI-powered platform connecting clients with verified, trusted
                                cleaning professionals. Let&apos;s get you set up in just a few steps.
                            </p>
                            <Button onClick={handleNext} size="lg" className="gap-2">
                                Get Started <ArrowRight className="w-5 h-5" />
                            </Button>
                        </div>
                    )}

                    {/* User Type Step */}
                    {step === 'user-type' && (
                        <div className="animate-fade-in">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                How will you use BookACleaner?
                            </h2>
                            <p className="text-white/60 mb-8">
                                Select the option that best describes you.
                            </p>

                            <div className="grid gap-4 mb-8">
                                <button
                                    onClick={() => setData({ ...data, userType: 'client' })}
                                    className={cn(
                                        'p-6 rounded-xl border text-left transition-all',
                                        data.userType === 'client'
                                            ? 'border-brand-500 bg-brand-500/10'
                                            : 'border-white/10 hover:border-white/20 bg-white/5'
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                                            <Building2 className="w-6 h-6 text-blue-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-white font-semibold mb-1">
                                                I need cleaning services
                                            </h3>
                                            <p className="text-white/50 text-sm">
                                                Book cleaners for your home, office, or rental properties.
                                            </p>
                                        </div>
                                        {data.userType === 'client' && (
                                            <Check className="w-5 h-5 text-brand-400" />
                                        )}
                                    </div>
                                </button>

                                <button
                                    onClick={() => setData({ ...data, userType: 'cleaner' })}
                                    className={cn(
                                        'p-6 rounded-xl border text-left transition-all',
                                        data.userType === 'cleaner'
                                            ? 'border-brand-500 bg-brand-500/10'
                                            : 'border-white/10 hover:border-white/20 bg-white/5'
                                    )}
                                >
                                    <div className="flex items-start gap-4">
                                        <div className="w-12 h-12 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0">
                                            <Briefcase className="w-6 h-6 text-green-400" />
                                        </div>
                                        <div className="flex-1">
                                            <h3 className="text-white font-semibold mb-1">
                                                I offer cleaning services
                                            </h3>
                                            <p className="text-white/50 text-sm">
                                                Find clients, manage bookings, and grow your business.
                                            </p>
                                        </div>
                                        {data.userType === 'cleaner' && (
                                            <Check className="w-5 h-5 text-brand-400" />
                                        )}
                                    </div>
                                </button>
                            </div>
                        </div>
                    )}

                    {/* Profile Step */}
                    {step === 'profile' && (
                        <div className="animate-fade-in">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                Tell us about yourself
                            </h2>
                            <p className="text-white/60 mb-8">
                                This helps us personalize your experience.
                            </p>

                            <div className="space-y-4">
                                <div>
                                    <label className="block text-white/80 text-sm mb-2">Your Name</label>
                                    <input
                                        type="text"
                                        value={data.name}
                                        onChange={(e) => setData({ ...data, name: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-brand-500 focus:outline-none"
                                        placeholder="Enter your name"
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/80 text-sm mb-2">Phone Number</label>
                                    <input
                                        type="tel"
                                        value={data.phone}
                                        onChange={(e) => setData({ ...data, phone: e.target.value })}
                                        className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-brand-500 focus:outline-none"
                                        placeholder="(555) 123-4567"
                                    />
                                </div>
                                <div>
                                    <label className="block text-white/80 text-sm mb-2">Location</label>
                                    <div className="relative">
                                        <MapPin className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-white/40" />
                                        <input
                                            type="text"
                                            value={data.location}
                                            onChange={(e) => setData({ ...data, location: e.target.value })}
                                            className="w-full pl-12 pr-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-brand-500 focus:outline-none"
                                            placeholder="City, State or ZIP code"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Preferences Step */}
                    {step === 'preferences' && (
                        <div className="animate-fade-in">
                            <h2 className="text-2xl font-bold text-white mb-2">
                                {data.userType === 'client'
                                    ? 'Your cleaning preferences'
                                    : 'Your service details'}
                            </h2>
                            <p className="text-white/60 mb-8">
                                Help us match you with the right{' '}
                                {data.userType === 'client' ? 'cleaners' : 'clients'}.
                            </p>

                            {data.userType === 'client' ? (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-white/80 text-sm mb-2">Property Type</label>
                                        <select
                                            value={data.propertyType || ''}
                                            onChange={(e) =>
                                                setData({ ...data, propertyType: e.target.value })
                                            }
                                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-brand-500 focus:outline-none"
                                        >
                                            <option value="">Select...</option>
                                            <option value="apartment">Apartment</option>
                                            <option value="house">House</option>
                                            <option value="condo">Condo</option>
                                            <option value="office">Office</option>
                                            <option value="airbnb">Airbnb/Rental</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-white/80 text-sm mb-2">
                                            How often do you need cleaning?
                                        </label>
                                        <select
                                            value={data.cleaningFrequency || ''}
                                            onChange={(e) =>
                                                setData({ ...data, cleaningFrequency: e.target.value })
                                            }
                                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-brand-500 focus:outline-none"
                                        >
                                            <option value="">Select...</option>
                                            <option value="weekly">Weekly</option>
                                            <option value="biweekly">Every 2 weeks</option>
                                            <option value="monthly">Monthly</option>
                                            <option value="onetime">One-time only</option>
                                            <option value="asneeded">As needed</option>
                                        </select>
                                    </div>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-white/80 text-sm mb-2">Experience Level</label>
                                        <select
                                            value={data.experience || ''}
                                            onChange={(e) => setData({ ...data, experience: e.target.value })}
                                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-brand-500 focus:outline-none"
                                        >
                                            <option value="">Select...</option>
                                            <option value="new">New to cleaning</option>
                                            <option value="1-3">1-3 years</option>
                                            <option value="3-5">3-5 years</option>
                                            <option value="5+">5+ years</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-white/80 text-sm mb-2">Service Radius</label>
                                        <select
                                            value={data.serviceArea || ''}
                                            onChange={(e) => setData({ ...data, serviceArea: e.target.value })}
                                            className="w-full px-4 py-3 rounded-lg bg-white/5 border border-white/10 text-white focus:border-brand-500 focus:outline-none"
                                        >
                                            <option value="">Select...</option>
                                            <option value="5">5 miles</option>
                                            <option value="10">10 miles</option>
                                            <option value="25">25 miles</option>
                                            <option value="50">50+ miles</option>
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Complete Step */}
                    {step === 'complete' && (
                        <div className="text-center animate-fade-in">
                            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-500/20 flex items-center justify-center">
                                <Check className="w-10 h-10 text-green-400" />
                            </div>
                            <h2 className="text-2xl font-bold text-white mb-4">
                                You&apos;re all set!
                            </h2>
                            <p className="text-white/60 mb-8">
                                {data.userType === 'client'
                                    ? "Your account is ready. Let's find you a great cleaner!"
                                    : "Welcome to the platform! Start accepting jobs today."}
                            </p>
                            <Button onClick={handleComplete} size="lg" className="gap-2">
                                Go to Dashboard <ArrowRight className="w-5 h-5" />
                            </Button>
                        </div>
                    )}

                    {/* Navigation */}
                    {step !== 'welcome' && step !== 'complete' && (
                        <div className="flex justify-between mt-8">
                            <Button variant="ghost" onClick={handleBack} className="gap-2">
                                <ArrowLeft className="w-4 h-4" /> Back
                            </Button>
                            <Button
                                onClick={handleNext}
                                disabled={!canProceed() || isSubmitting}
                                className="gap-2"
                            >
                                {isSubmitting ? 'Saving...' : step === 'preferences' ? 'Complete' : 'Next'}
                                <ArrowRight className="w-4 h-4" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
