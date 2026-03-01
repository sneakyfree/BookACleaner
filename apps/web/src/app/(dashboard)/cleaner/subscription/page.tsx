'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    Check,
    Crown,
    Zap,
    Shield,
    Loader2,
    ExternalLink,
    Star,
    Clock,
    TrendingUp,
    Award,
} from 'lucide-react'
import { useQuery } from '@tanstack/react-query'
import { apiFetch } from '@/lib/auth/api-client'

interface PlanTier {
    id: string
    name: string
    price: number
    period: string
    description: string
    icon: any
    color: string
    features: string[]
    popular?: boolean
}

const PLANS: PlanTier[] = [
    {
        id: 'free',
        name: 'Starter',
        price: 0,
        period: 'forever',
        description: 'Get started and build your reputation',
        icon: Shield,
        color: 'text-gray-500',
        features: [
            'Up to 5 jobs per month',
            'Basic profile page',
            'Standard search placement',
            'Email notifications',
            'Community support',
        ],
    },
    {
        id: 'pro',
        name: 'Pro',
        price: 29,
        period: '/month',
        description: 'Grow your business with premium tools',
        icon: Zap,
        color: 'text-brand-500',
        popular: true,
        features: [
            'Unlimited jobs',
            'Priority search placement',
            'Route optimization',
            'Calendar sync (iCal + Google)',
            'Real-time chat',
            'Badge eligibility',
            'Priority support',
            'Analytics dashboard',
        ],
    },
    {
        id: 'premium',
        name: 'Premium',
        price: 79,
        period: '/month',
        description: 'Maximize earnings with AI-powered tools',
        icon: Crown,
        color: 'text-amber-500',
        features: [
            'Everything in Pro',
            'AI pricing recommendations',
            'Sponsored listing credits ($20/mo)',
            'Featured profile badge',
            'Dedicated account manager',
            'Custom branded invoices',
            'Multi-team support',
            'API access',
        ],
    },
]

export default function SubscriptionPage() {
    const [loading, setLoading] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)

    const { data: subData } = useQuery({
        queryKey: ['subscription-plan'],
        queryFn: async () => {
            try {
                return await apiFetch('/api/v1/payments/subscription')
            } catch { return { plan: 'free' } }
        },
    })

    const currentPlan = (subData as any)?.plan_id || (subData as any)?.plan || (subData as any)?.tier || 'free'

    const handleSubscribe = async (planId: string) => {
        if (planId === 'free' || planId === currentPlan) return

        setLoading(planId)
        setError(null)

        try {
            const data = await apiFetch(`/api/v1/payments/create-checkout-session?plan=${planId}`, {
                method: 'POST',
            })
            if (data.url) {
                window.location.href = data.url
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as any)?.detail || 'Something went wrong')
        } finally {
            setLoading(null)
        }
    }

    const handleManageSubscription = async () => {
        setLoading('manage')
        setError(null)

        try {
            const data = await apiFetch('/api/v1/payments/customer-portal', {
                method: 'POST',
            })
            if (data.url) window.location.href = data.url
        } catch (err) {
            setError(err instanceof Error ? err.message : (err as any)?.detail || 'Something went wrong')
        } finally {
            setLoading(null)
        }
    }

    return (
        <div className="space-y-8 max-w-5xl mx-auto">
            {/* Header */}
            <div className="text-center">
                <h1 className="text-3xl font-bold">Choose Your Plan</h1>
                <p className="text-muted-foreground mt-2">
                    Upgrade to unlock powerful tools that help you earn more
                </p>
            </div>

            {error && (
                <div className="p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-600 text-center">
                    {error}
                </div>
            )}

            {/* Pricing Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {PLANS.map(plan => {
                    const Icon = plan.icon
                    const isCurrent = currentPlan === plan.id
                    const isUpgrade = PLANS.findIndex(p => p.id === plan.id) > PLANS.findIndex(p => p.id === currentPlan)

                    return (
                        <Card
                            key={plan.id}
                            className={`relative overflow-hidden transition-shadow hover:shadow-lg ${plan.popular ? 'ring-2 ring-brand-500 shadow-lg' : ''
                                }`}
                        >
                            {plan.popular && (
                                <div className="absolute top-0 right-0">
                                    <div className="bg-brand-500 text-white text-xs font-bold px-3 py-1 rounded-bl-lg">
                                        MOST POPULAR
                                    </div>
                                </div>
                            )}

                            <CardHeader className="pb-4">
                                <div className="flex items-center gap-2 mb-2">
                                    <Icon className={`w-5 h-5 ${plan.color}`} />
                                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                                </div>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-4xl font-bold">
                                        ${plan.price}
                                    </span>
                                    <span className="text-muted-foreground text-sm">{plan.period}</span>
                                </div>
                                <CardDescription className="mt-2">{plan.description}</CardDescription>
                            </CardHeader>

                            <CardContent className="space-y-4">
                                <ul className="space-y-2.5">
                                    {plan.features.map(feature => (
                                        <li key={feature} className="flex items-start gap-2 text-sm">
                                            <Check className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" />
                                            <span>{feature}</span>
                                        </li>
                                    ))}
                                </ul>

                                <div className="pt-4">
                                    {isCurrent ? (
                                        <Button variant="outline" className="w-full" disabled>
                                            Current Plan
                                        </Button>
                                    ) : plan.id === 'free' ? (
                                        <Button variant="ghost" className="w-full" disabled>
                                            Free Forever
                                        </Button>
                                    ) : (
                                        <Button
                                            onClick={() => handleSubscribe(plan.id)}
                                            disabled={loading !== null}
                                            className={`w-full ${plan.popular
                                                ? 'bg-brand-500 hover:bg-brand-600'
                                                : ''
                                                }`}
                                        >
                                            {loading === plan.id ? (
                                                <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processing...</>
                                            ) : (
                                                <>{isUpgrade ? 'Upgrade' : 'Switch'} to {plan.name}</>
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    )
                })}
            </div>

            {/* Manage Subscription */}
            {currentPlan !== 'free' && (
                <div className="text-center">
                    <Button
                        variant="link"
                        onClick={handleManageSubscription}
                        disabled={loading === 'manage'}
                        className="text-muted-foreground"
                    >
                        {loading === 'manage' ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Opening...</>
                        ) : (
                            <><ExternalLink className="w-4 h-4 mr-2" /> Manage Billing & Invoices</>
                        )}
                    </Button>
                </div>
            )}

            {/* FAQ */}
            <Card>
                <CardContent className="p-6">
                    <h3 className="font-semibold mb-4">Frequently Asked Questions</h3>
                    <div className="grid md:grid-cols-2 gap-4 text-sm">
                        <div>
                            <p className="font-medium">Can I cancel anytime?</p>
                            <p className="text-muted-foreground mt-1">
                                Yes, cancel anytime. You'll keep access until the end of your billing period.
                            </p>
                        </div>
                        <div>
                            <p className="font-medium">What payment methods do you accept?</p>
                            <p className="text-muted-foreground mt-1">
                                All major credit cards via Stripe. We also support Apple Pay and Google Pay.
                            </p>
                        </div>
                        <div>
                            <p className="font-medium">Can I switch plans?</p>
                            <p className="text-muted-foreground mt-1">
                                Yes, upgrade or downgrade anytime. Changes apply at the next billing cycle.
                            </p>
                        </div>
                        <div>
                            <p className="font-medium">Is there a free trial?</p>
                            <p className="text-muted-foreground mt-1">
                                The Starter plan is free forever. Pro comes with a 14-day free trial.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    )
}
