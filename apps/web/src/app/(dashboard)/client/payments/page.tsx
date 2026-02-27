'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    DollarSign, CreditCard, ArrowUpRight, ArrowDownRight,
    Loader2, AlertCircle, Download, ShieldCheck, Clock
} from 'lucide-react'
import Link from 'next/link'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface PaymentRecord {
    id: string
    job_id: string
    job_title?: string
    amount: number
    status: string
    created_at: string
    payment_method?: string
    cleaner_name?: string
}

const statusConfig: Record<string, { label: string; color: string; bg: string; icon: typeof Clock }> = {
    authorized: { label: 'Authorized', color: 'text-blue-600', bg: 'bg-blue-100 dark:bg-blue-500/20', icon: CreditCard },
    held: { label: 'In Escrow', color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-500/20', icon: ShieldCheck },
    captured: { label: 'Captured', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-500/20', icon: DollarSign },
    released: { label: 'Released', color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-500/20', icon: ArrowUpRight },
    refunded: { label: 'Refunded', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-500/20', icon: ArrowDownRight },
    failed: { label: 'Failed', color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-500/20', icon: AlertCircle },
    pending: { label: 'Pending', color: 'text-slate-600', bg: 'bg-slate-100 dark:bg-slate-500/20', icon: Clock },
}

export default function ClientPaymentHistoryPage() {
    const { data: session } = useSession()
    const [payments, setPayments] = useState<PaymentRecord[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [stats, setStats] = useState({ total: 0, escrow: 0, released: 0 })

    useEffect(() => {
        const token = (session as any)?.accessToken
        if (!token) { setLoading(false); return }

        async function fetchPayments() {
            try {
                setError(null)
                const res = await fetch(`${API_URL}/api/v1/jobs/`, {
                    headers: { Authorization: `Bearer ${token}` },
                })
                if (!res.ok) throw new Error(`Failed to load payments (${res.status})`)
                const jobs = await res.json()

                const paymentList: PaymentRecord[] = jobs
                    .filter((j: any) => j.total_price > 0)
                    .map((j: any) => ({
                        id: j.stripe_payment_intent_id || j.id,
                        job_id: j.id,
                        job_title: j.title || (j.services || []).join(', ') || 'Cleaning',
                        amount: j.total_price,
                        status: j.payment_status || 'pending',
                        created_at: j.created_at || j.scheduled_date,
                        cleaner_name: j.cleaner_name,
                    }))
                    .sort((a: PaymentRecord, b: PaymentRecord) =>
                        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
                    )

                let totalSpent = 0, escrow = 0, released = 0
                paymentList.forEach(p => {
                    if (['held', 'captured', 'released'].includes(p.status)) totalSpent += p.amount
                    if (p.status === 'held') escrow += p.amount
                    if (p.status === 'released' || p.status === 'captured') released += p.amount
                })

                setPayments(paymentList)
                setStats({ total: totalSpent, escrow, released })
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Failed to load payments')
            } finally {
                setLoading(false)
            }
        }
        fetchPayments()
    }, [session])

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                <span className="ml-3 text-muted-foreground">Loading payment history...</span>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Payment History</h1>
                    <p className="text-muted-foreground mt-1">Track all your payments and escrow holds</p>
                </div>
                <Button variant="outline" className="gap-2">
                    <Download className="w-4 h-4" /> Export
                </Button>
            </div>

            {error && (
                <Card className="border-red-200 dark:border-red-800">
                    <CardContent className="py-6 text-center">
                        <AlertCircle className="w-8 h-8 mx-auto text-red-500 mb-2" />
                        <p className="text-red-600 dark:text-red-400">{error}</p>
                    </CardContent>
                </Card>
            )}

            {/* Stats */}
            <div className="grid md:grid-cols-3 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-xl">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">${stats.total.toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground">Total Spent</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
                                <ShieldCheck className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">${stats.escrow.toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground">In Escrow</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
                                <ArrowUpRight className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">${stats.released.toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground">Released to Cleaners</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Payment List */}
            <Card>
                <CardHeader>
                    <CardTitle>Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    {payments.length === 0 ? (
                        <div className="py-12 text-center">
                            <CreditCard className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                            <p className="text-lg font-medium">No payments yet</p>
                            <p className="text-muted-foreground mt-1">Your payment history will appear here once you book a cleaning.</p>
                            <Link href="/client/bookings">
                                <Button className="mt-4">View Bookings</Button>
                            </Link>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {payments.map((p) => {
                                const config = statusConfig[p.status] || statusConfig.pending
                                const Icon = config.icon
                                return (
                                    <Link key={p.id} href={`/client/bookings/${p.job_id}`}>
                                        <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer">
                                            <div className="flex items-center gap-4">
                                                <div className={`p-2 rounded-lg ${config.bg}`}>
                                                    <Icon className={`w-5 h-5 ${config.color}`} />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{p.job_title}</p>
                                                    <p className="text-sm text-muted-foreground">
                                                        {p.cleaner_name && `${p.cleaner_name} • `}
                                                        {new Date(p.created_at).toLocaleDateString('en-US', {
                                                            month: 'short', day: 'numeric', year: 'numeric'
                                                        })}
                                                    </p>
                                                </div>
                                            </div>
                                            <div className="text-right">
                                                <p className="text-lg font-semibold">${p.amount.toLocaleString()}</p>
                                                <span className={`text-xs px-2 py-0.5 rounded-full ${config.bg} ${config.color} font-medium`}>
                                                    {config.label}
                                                </span>
                                            </div>
                                        </div>
                                    </Link>
                                )
                            })}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}
