'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Check, Star, Zap, Shield, Calendar, Users,
    Trophy, Clock, ArrowRight, Sparkles
} from 'lucide-react'

interface PricingTier {
    name: string
    price: number
    period: string
    description: string
    features: string[]
    cta: string
    popular?: boolean
    planId: string
}

const tiers: PricingTier[] = [
    {
        name: 'Free',
        price: 0,
        period: 'forever',
        description: 'Get started with basic features',
        planId: 'free',
        cta: 'Get Started',
        features: [
            'Up to 5 bookings/month',
            'Basic cleaner matching',
            'In-app messaging',
            'Standard support',
            'Community feed access',
        ],
    },
    {
        name: 'Pro',
        price: 29,
        period: '/month',
        description: 'For growing cleaning businesses',
        planId: 'pro',
        cta: 'Start Pro Trial',
        popular: true,
        features: [
            'Unlimited bookings',
            'AI-powered matching',
            'Priority placement in marketplace',
            'Route optimization',
            'Calendar integrations',
            'Advanced analytics',
            'Badge & verification priority',
            'Priority support',
        ],
    },
    {
        name: 'Premium',
        price: 79,
        period: '/month',
        description: 'Enterprise-grade for large teams',
        planId: 'premium',
        cta: 'Contact Sales',
        features: [
            'Everything in Pro',
            'Multi-team management',
            'Custom branding',
            'API access',
            'Dedicated account manager',
            'SLA guarantees',
            'Advanced reporting',
            'White-label options',
            'Bulk scheduling',
            'Custom integrations',
        ],
    },
]

export default function PricingPage() {
    const [annual, setAnnual] = useState(false)
    const [loading, setLoading] = useState<string | null>(null)

    const handleSubscribe = async (planId: string) => {
        if (planId === 'free') return
        setLoading(planId)
        try {
            const token = localStorage.getItem('token')
            const res = await fetch(`/api/v1/payments/create-checkout-session?plan=${planId}`, {
                method: 'POST',
                headers: { Authorization: `Bearer ${token}` },
            })
            if (res.ok) {
                const data = await res.json()
                if (data.url) {
                    window.location.href = data.url
                }
            }
        } catch {
            // handle error
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-background to-muted/30">
            <div className="max-w-6xl mx-auto px-4 py-16">
                {/* Header */}
                <div className="text-center mb-12">
                    <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-brand-100 dark:bg-brand-500/20 text-brand-700 dark:text-brand-300 rounded-full text-sm font-medium mb-4">
                        <Sparkles className="w-4 h-4" /> Simple, transparent pricing
                    </div>
                    <h1 className="text-4xl md:text-5xl font-bold mb-4">
                        Choose your plan
                    </h1>
                    <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                        Start free and scale as your cleaning business grows. No hidden fees, cancel anytime.
                    </p>

                    {/* Annual toggle */}
                    <div className="flex items-center justify-center gap-3 mt-8">
                        <span className={`text-sm ${!annual ? 'font-semibold' : 'text-muted-foreground'}`}>Monthly</span>
                        <button
                            onClick={() => setAnnual(!annual)}
                            className={`relative w-12 h-6 rounded-full transition-colors ${annual ? 'bg-brand-600' : 'bg-muted'}`}
                        >
                            <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform shadow ${annual ? 'translate-x-6' : 'translate-x-0.5'}`} />
                        </button>
                        <span className={`text-sm ${annual ? 'font-semibold' : 'text-muted-foreground'}`}>
                            Annual <span className="text-green-600 font-medium">(Save 20%)</span>
                        </span>
                    </div>
                </div>

                {/* Pricing Cards */}
                <div className="grid md:grid-cols-3 gap-6 lg:gap-8">
                    {tiers.map((tier) => {
                        const displayPrice = annual && tier.price > 0
                            ? Math.round(tier.price * 0.8)
                            : tier.price

                        return (
                            <Card
                                key={tier.name}
                                className={`relative overflow-hidden transition-all hover:shadow-xl ${tier.popular
                                        ? 'ring-2 ring-brand-600 shadow-lg scale-[1.02]'
                                        : 'hover:scale-[1.01]'
                                    }`}
                            >
                                {tier.popular && (
                                    <div className="absolute top-0 right-0 bg-brand-600 text-white px-4 py-1 text-xs font-bold rounded-bl-lg">
                                        MOST POPULAR
                                    </div>
                                )}
                                <CardHeader className="pb-4">
                                    <CardTitle className="text-xl">{tier.name}</CardTitle>
                                    <p className="text-sm text-muted-foreground">{tier.description}</p>
                                    <div className="mt-4">
                                        <span className="text-4xl font-bold">${displayPrice}</span>
                                        <span className="text-muted-foreground">{tier.period}</span>
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <Button
                                        className={`w-full mb-6 ${tier.popular ? 'bg-brand-600 hover:bg-brand-700' : ''}`}
                                        variant={tier.popular ? 'default' : 'outline'}
                                        onClick={() => handleSubscribe(tier.planId)}
                                        disabled={loading === tier.planId}
                                    >
                                        {loading === tier.planId ? 'Processing...' : tier.cta}
                                        <ArrowRight className="w-4 h-4 ml-2" />
                                    </Button>
                                    <ul className="space-y-3">
                                        {tier.features.map((feature, i) => (
                                            <li key={i} className="flex items-start gap-2 text-sm">
                                                <Check className="w-4 h-4 text-green-500 mt-0.5 shrink-0" />
                                                <span>{feature}</span>
                                            </li>
                                        ))}
                                    </ul>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>

                {/* Trust Badges */}
                <div className="mt-16 text-center">
                    <div className="flex flex-wrap items-center justify-center gap-8 text-muted-foreground">
                        <div className="flex items-center gap-2">
                            <Shield className="w-5 h-5" />
                            <span className="text-sm">SSL Encrypted</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Clock className="w-5 h-5" />
                            <span className="text-sm">Cancel Anytime</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Users className="w-5 h-5" />
                            <span className="text-sm">10,000+ Users</span>
                        </div>
                        <div className="flex items-center gap-2">
                            <Trophy className="w-5 h-5" />
                            <span className="text-sm">Best in Class</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
