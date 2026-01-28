'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { StripeConnectOnboarding } from '@/components/payments'
import {
    DollarSign,
    ArrowUpRight,
    ArrowDownLeft,
    TrendingUp,
    Calendar,
    Loader2,
    CreditCard,
    Wallet,
} from 'lucide-react'

interface PayoutHistory {
    id: string
    amount: number
    status: string
    createdAt: string
    jobTitle: string
}

interface EarningsSummary {
    thisWeek: number
    thisMonth: number
    pending: number
    available: number
}

export default function PaymentsPage() {
    const { data: session } = useSession()
    const [stripeStatus, setStripeStatus] = useState<any>(null)
    const [earnings, setEarnings] = useState<EarningsSummary | null>(null)
    const [payouts, setPayouts] = useState<PayoutHistory[]>([])
    const [loading, setLoading] = useState(true)

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

    useEffect(() => {
        async function fetchPaymentData() {
            try {
                const [statusRes, earningsRes] = await Promise.all([
                    fetch(`${API_URL}/api/v1/payments/account-status/self`, {
                        headers: {
                            Authorization: `Bearer ${(session as any)?.accessToken}`,
                        },
                    }),
                    fetch(`${API_URL}/api/v1/cleaners/earnings`, {
                        headers: {
                            Authorization: `Bearer ${(session as any)?.accessToken}`,
                        },
                    }),
                ])

                if (statusRes.ok) {
                    setStripeStatus(await statusRes.json())
                }
                if (earningsRes.ok) {
                    setEarnings(await earningsRes.json())
                }

                // Mock payouts for now
                setPayouts([
                    {
                        id: '1',
                        amount: 150.00,
                        status: 'completed',
                        createdAt: new Date(Date.now() - 86400000).toISOString(),
                        jobTitle: 'Deep Clean - Smith Residence',
                    },
                    {
                        id: '2',
                        amount: 85.00,
                        status: 'completed',
                        createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
                        jobTitle: 'Standard Clean - Johnson Home',
                    },
                ])
            } catch (error) {
                console.error('Failed to fetch payment data:', error)
            } finally {
                setLoading(false)
            }
        }

        if (session) {
            fetchPaymentData()
        }
    }, [session, API_URL])

    const handleStartOnboarding = async () => {
        const res = await fetch(`${API_URL}/api/v1/payments/create-connected-account`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${(session as any)?.accessToken}`,
            },
            body: JSON.stringify({
                email: session?.user?.email,
                businessName: 'My Cleaning Business',
            }),
        })

        const { accountId } = await res.json()

        const linkRes = await fetch(`${API_URL}/api/v1/payments/create-account-link`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                accountId,
                returnUrl: `${window.location.origin}/cleaner/payments?onboarding=complete`,
                refreshUrl: `${window.location.origin}/cleaner/payments?onboarding=refresh`,
            }),
        })

        const { url } = await linkRes.json()
        return url
    }

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
            </div>
        )
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div>
                <h1 className="text-2xl font-bold">Payments & Earnings</h1>
                <p className="text-muted-foreground mt-1">
                    Manage your payment settings and view earnings
                </p>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-xl">
                                <DollarSign className="w-6 h-6 text-green-600 dark:text-green-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    ${(earnings?.thisMonth || 0).toFixed(2)}
                                </p>
                                <p className="text-sm text-muted-foreground">This Month</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    ${(earnings?.thisWeek || 0).toFixed(2)}
                                </p>
                                <p className="text-sm text-muted-foreground">This Week</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
                                <Wallet className="w-6 h-6 text-amber-600 dark:text-amber-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    ${(earnings?.pending || 0).toFixed(2)}
                                </p>
                                <p className="text-sm text-muted-foreground">Pending</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-brand-100 dark:bg-brand-500/20 rounded-xl">
                                <CreditCard className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">
                                    ${(earnings?.available || 0).toFixed(2)}
                                </p>
                                <p className="text-sm text-muted-foreground">Available</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Main Content */}
            <div className="grid lg:grid-cols-3 gap-6">
                {/* Stripe Connect */}
                <div className="lg:col-span-1">
                    <StripeConnectOnboarding
                        status={stripeStatus}
                        onStartOnboarding={handleStartOnboarding}
                    />
                </div>

                {/* Payout History */}
                <div className="lg:col-span-2">
                    <Card>
                        <CardHeader>
                            <CardTitle>Payout History</CardTitle>
                            <CardDescription>Your recent earnings and payouts</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <Tabs defaultValue="all">
                                <TabsList>
                                    <TabsTrigger value="all">All</TabsTrigger>
                                    <TabsTrigger value="completed">Completed</TabsTrigger>
                                    <TabsTrigger value="pending">Pending</TabsTrigger>
                                </TabsList>
                                <TabsContent value="all" className="mt-4">
                                    <div className="space-y-4">
                                        {payouts.map((payout) => (
                                            <div
                                                key={payout.id}
                                                className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                                            >
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
                                                        <ArrowDownLeft className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                    </div>
                                                    <div>
                                                        <p className="font-medium">{payout.jobTitle}</p>
                                                        <p className="text-sm text-muted-foreground flex items-center gap-1">
                                                            <Calendar className="w-3 h-3" />
                                                            {new Date(payout.createdAt).toLocaleDateString()}
                                                        </p>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="font-semibold text-green-600 dark:text-green-400">
                                                        +${payout.amount.toFixed(2)}
                                                    </p>
                                                    <span className="inline-block text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400">
                                                        {payout.status}
                                                    </span>
                                                </div>
                                            </div>
                                        ))}

                                        {payouts.length === 0 && (
                                            <div className="text-center py-8 text-muted-foreground">
                                                <Wallet className="w-12 h-12 mx-auto mb-3 opacity-50" />
                                                <p>No payouts yet</p>
                                                <p className="text-sm">Complete jobs to start earning</p>
                                            </div>
                                        )}
                                    </div>
                                </TabsContent>
                                <TabsContent value="completed" className="mt-4">
                                    <div className="space-y-4">
                                        {payouts
                                            .filter(p => p.status === 'completed')
                                            .map((payout) => (
                                                <div
                                                    key={payout.id}
                                                    className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-800/50 rounded-lg"
                                                >
                                                    <div className="flex items-center gap-4">
                                                        <div className="p-2 bg-green-100 dark:bg-green-500/20 rounded-lg">
                                                            <ArrowDownLeft className="w-5 h-5 text-green-600 dark:text-green-400" />
                                                        </div>
                                                        <div>
                                                            <p className="font-medium">{payout.jobTitle}</p>
                                                            <p className="text-sm text-muted-foreground">
                                                                {new Date(payout.createdAt).toLocaleDateString()}
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <p className="font-semibold text-green-600 dark:text-green-400">
                                                        +${payout.amount.toFixed(2)}
                                                    </p>
                                                </div>
                                            ))}
                                    </div>
                                </TabsContent>
                                <TabsContent value="pending" className="mt-4">
                                    <div className="text-center py-8 text-muted-foreground">
                                        <p>No pending payouts</p>
                                    </div>
                                </TabsContent>
                            </Tabs>
                        </CardContent>
                    </Card>
                </div>
            </div>
        </div>
    )
}
