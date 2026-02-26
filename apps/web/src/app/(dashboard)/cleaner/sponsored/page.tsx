'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import {
    Zap, Crown, Rocket, TrendingUp, Check, Loader2, AlertCircle, Star
} from 'lucide-react'
import { cn } from '@/lib/utils'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

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
    const { data: session } = useSession()
    const [activeListing, setActiveListing] = useState<SponsoredListing | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const [purchasing, setPurchasing] = useState(false)

    const userId = (session as any)?.user?.id

    const fetchActive = useCallback(async () => {
        if (!userId) return

        try {
            setLoading(true)
            const res = await fetch(`${API_URL}/api/v1/sponsored/active`)
            if (!res.ok) throw new Error('Failed to check sponsored status')
            const data = await res.json()
            const mine = (data.sponsored || []).find((s: SponsoredListing) => s.cleaner_id === userId)
            setActiveListing(mine || null)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [userId])

    useEffect(() => {
        if (session) fetchActive()
    }, [session, fetchActive])

    const handlePurchase = async (priority: number, durationDays: number) => {
        const token = (session as any)?.accessToken
        if (!token || !userId) return

        try {
            setPurchasing(true)
            setError('')
            const res = await fetch(`${API_URL}/api/v1/sponsored/create`, {
                method: 'POST',
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    cleaner_id: userId,
                    duration_days: durationDays,
                    priority,
                }),
            })
            if (!res.ok) {
                const data = await res.json().catch(() => null)
                throw new Error(data?.detail || 'Purchase failed')
            }
            const data = await res.json()
            setActiveListing(data)
        } catch (err: any) {
            setError(err.message || 'Failed to purchase listing')
        } finally {
            setPurchasing(false)
        }
    }

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
