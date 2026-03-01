'use client'

import { useState } from 'react'
import {
    Zap, Crown, Rocket, TrendingUp, Check, Loader2, AlertCircle, Star, XCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { apiFetch } from '@/lib/auth/api-client'

interface SponsoredListing {
    id: string
    cleaner_id: string
    status: string
    priority: number
    starts_at: string
    expires_at: string
}

const tiers = [
    {
        name: 'Standard',
        priority: 1,
        price: 29,
        icon: Zap,
        color: 'text-blue-400',
        bg: 'bg-blue-500/10 border-blue-500/20',
        features: ['Highlighted in search results', '30-day visibility boost', 'Basic analytics'],
    },
    {
        name: 'Premium',
        priority: 2,
        price: 79,
        icon: Crown,
        color: 'text-amber-400',
        bg: 'bg-amber-500/10 border-amber-500/20',
        features: ['Featured placement', 'Priority in matching', '30-day boost', 'View analytics'],
        popular: true,
    },
    {
        name: 'Featured',
        priority: 3,
        price: 149,
        icon: Rocket,
        color: 'text-purple-400',
        bg: 'bg-purple-500/10 border-purple-500/20',
        features: ['Top of search results', 'Homepage showcase', 'Priority matching', '60-day boost', 'Full analytics'],
    },
]

export default function SponsoredListingsPage() {
    const [error, setError] = useState('')
    const queryClient = useQueryClient()

    const { data: myData, isLoading: loading } = useQuery({
        queryKey: ['sponsored-my-listing'],
        queryFn: () => apiFetch('/api/v1/sponsored/my-listing'),
    })

    const activeListing = (myData as any)?.listing || null

    const purchaseMut = useMutation({
        mutationFn: ({ priority, durationDays }: { priority: number; durationDays: number }) =>
            apiFetch('/api/v1/sponsored/create', {
                method: 'POST',
                body: JSON.stringify({
                    duration_days: durationDays,
                    priority,
                }),
            }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sponsored-my-listing'] })
        },
        onError: (err: any) => setError(err?.detail || 'Failed to purchase listing'),
    })

    const cancelMut = useMutation({
        mutationFn: () => apiFetch('/api/v1/sponsored/cancel', { method: 'POST' }),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['sponsored-my-listing'] })
        },
        onError: (err: any) => setError(err?.detail || 'Failed to cancel listing'),
    })

    const handlePurchase = (priority: number, durationDays: number) => {
        setError('')
        purchaseMut.mutate({ priority, durationDays })
    }
    const purchasing = purchaseMut.isPending
    const cancelling = cancelMut.isPending

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-5xl mx-auto">
                <div className="mb-8 text-center">
                    <h1 className="text-3xl font-bold text-white flex items-center justify-center gap-3">
                        <TrendingUp className="w-8 h-8 text-brand-400" />
                        Boost Your Visibility
                    </h1>
                    <p className="text-white/60 mt-2 max-w-lg mx-auto">
                        Get more clients with sponsored placement. Stand out from the competition and grow your business.
                    </p>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center justify-center gap-3 max-w-lg mx-auto">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-red-300 text-sm">{error}</p>
                    </div>
                )}

                {activeListing && (
                    <div className="mb-8 p-4 bg-brand-500/10 border border-brand-500/30 rounded-xl flex items-center justify-center gap-3 max-w-lg mx-auto">
                        <Star className="w-5 h-5 text-brand-400" />
                        <div className="text-center">
                            <p className="text-brand-300 font-medium">You have an active sponsored listing!</p>
                            <p className="text-white/50 text-sm">
                                Tier {activeListing.priority} · Expires {new Date(activeListing.expires_at).toLocaleDateString()}
                            </p>
                        </div>
                        <button
                            onClick={() => cancelMut.mutate()}
                            disabled={cancelling}
                            className="ml-4 px-3 py-1.5 rounded-lg bg-red-500/20 text-red-300 text-xs font-medium hover:bg-red-500/30 transition flex items-center gap-1.5"
                        >
                            {cancelling ? <Loader2 className="w-3 h-3 animate-spin" /> : <XCircle className="w-3 h-3" />}
                            Cancel
                        </button>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {tiers.map(tier => {
                            const Icon = tier.icon
                            const isActive = activeListing?.priority === tier.priority
                            return (
                                <div key={tier.name}
                                    className={cn(
                                        'rounded-2xl border p-6 transition-all relative',
                                        tier.bg,
                                        tier.popular && 'ring-2 ring-amber-500/30'
                                    )}>
                                    {tier.popular && (
                                        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 bg-amber-500 text-black text-xs font-bold rounded-full">
                                            Most Popular
                                        </div>
                                    )}
                                    <div className="text-center mb-6 pt-2">
                                        <Icon className={cn('w-10 h-10 mx-auto mb-3', tier.color)} />
                                        <h3 className="text-xl font-bold text-white">{tier.name}</h3>
                                        <p className="text-3xl font-bold text-white mt-2">
                                            ${tier.price}<span className="text-white/40 text-sm font-normal">/mo</span>
                                        </p>
                                    </div>
                                    <ul className="space-y-3 mb-6">
                                        {tier.features.map(f => (
                                            <li key={f} className="flex items-center gap-2 text-white/70 text-sm">
                                                <Check className={cn('w-4 h-4 shrink-0', tier.color)} />
                                                {f}
                                            </li>
                                        ))}
                                    </ul>
                                    <button
                                        onClick={() => handlePurchase(tier.priority, tier.priority === 3 ? 60 : 30)}
                                        disabled={purchasing || isActive}
                                        className={cn(
                                            'w-full px-4 py-3 rounded-xl font-medium transition-colors flex items-center justify-center gap-2',
                                            isActive
                                                ? 'bg-white/10 text-white/40 cursor-default'
                                                : 'bg-white/20 hover:bg-white/30 text-white'
                                        )}>
                                        {isActive ? 'Active' : purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Get Started'}
                                    </button>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}
