'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    DollarSign,
    TrendingUp,
    Calendar,
    ArrowUpRight,
    ArrowDownRight,
    Download,
    Filter,
    Loader2,
    AlertCircle,
    Banknote,
} from 'lucide-react'
import { toast } from 'sonner'
import { useJobs } from '@/hooks/use-api'
import { apiFetch } from '@/lib/auth/api-client'

interface ApiJob {
    id: string
    title: string
    services: string[]
    total_price: number
    status: string
    completed_at?: string
    scheduled_date?: string
    client_id?: string
    client_name?: string
}

interface Transaction {
    id: string
    type: 'earning' | 'payout'
    description: string
    client?: string
    amount: number
    date: string
    status: string
}

export default function CleanerEarningsPage() {
    const { data: rawJobs, isLoading: loading, error } = useJobs()

    const { stats, transactions } = useMemo(() => {
        const jobs: ApiJob[] = Array.isArray(rawJobs) ? rawJobs : (rawJobs as any)?.jobs || []

        const now = new Date()
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0)

        let thisMonthTotal = 0
        let lastMonthTotal = 0
        let pendingTotal = 0
        const txList: Transaction[] = []

        jobs.forEach((job) => {
            const jobDate = new Date(job.completed_at || job.scheduled_date || '')
            const price = job.total_price || 0

            if (job.status === 'completed') {
                if (jobDate >= thisMonthStart) {
                    thisMonthTotal += price
                } else if (jobDate >= lastMonthStart && jobDate <= lastMonthEnd) {
                    lastMonthTotal += price
                }

                txList.push({
                    id: job.id,
                    type: 'earning',
                    description: (job.services || []).join(', ') || job.title || 'Cleaning Job',
                    client: job.client_name || 'Client',
                    amount: price,
                    date: jobDate.toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric',
                    }),
                    status: 'completed',
                })
            } else if (job.status === 'confirmed' || job.status === 'pending') {
                pendingTotal += price
            }
        })

        txList.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

        return {
            stats: {
                thisMonth: thisMonthTotal,
                lastMonth: lastMonthTotal,
                pending: pendingTotal,
                available: thisMonthTotal + lastMonthTotal,
            },
            transactions: txList.slice(0, 20),
        }
    }, [rawJobs])

    const monthlyChange = stats.lastMonth > 0
        ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100
        : 0

    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-brand-500" />
                <span className="ml-3 text-muted-foreground">Loading earnings...</span>
            </div>
        )
    }

    if (error) {
        return (
            <div className="space-y-8">
                <div>
                    <h1 className="text-2xl font-bold">Earnings</h1>
                    <p className="text-muted-foreground mt-1">Track your income and payouts</p>
                </div>
                <Card className="border-red-200 dark:border-red-800">
                    <CardContent className="py-8 text-center">
                        <AlertCircle className="w-10 h-10 mx-auto text-red-500 mb-3" />
                        <p className="text-red-600 dark:text-red-400 font-medium">{(error as any)?.detail || 'Failed to load earnings'}</p>
                        <p className="text-sm text-muted-foreground mt-1">Please try refreshing the page</p>
                    </CardContent>
                </Card>
            </div>
        )
    }

    return (
        <div className="space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Earnings</h1>
                    <p className="text-muted-foreground mt-1">Track your income and payouts</p>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline">
                        <Filter className="w-4 h-4 mr-2" />
                        Filter
                    </Button>
                    <Button variant="outline">
                        <Download className="w-4 h-4 mr-2" />
                        Export
                    </Button>
                    <Button
                        className="bg-green-600 hover:bg-green-700 text-white"
                        onClick={async () => {
                            if (stats.available <= 0) { toast.error('No available balance to withdraw'); return }
                            try {
                                await apiFetch('/api/v1/payments/request-payout', {
                                    method: 'POST',
                                    body: JSON.stringify({ amount: stats.available }),
                                })
                                toast.success(`Payout of $${stats.available} requested!`)
                            } catch { toast.error('Payout request failed') }
                        }}
                    >
                        <Banknote className="w-4 h-4 mr-2" />
                        Request Payout
                    </Button>
                </div>
            </div>

            {/* Stats */}
            <div className="grid md:grid-cols-4 gap-4">
                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-green-100 dark:bg-green-500/20 rounded-xl">
                                <DollarSign className="w-6 h-6 text-green-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">${stats.thisMonth.toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground">This Month</p>
                            </div>
                        </div>
                        <div className="mt-2 flex items-center text-sm">
                            {monthlyChange > 0 ? (
                                <>
                                    <ArrowUpRight className="w-4 h-4 text-green-500" />
                                    <span className="text-green-500">+{monthlyChange.toFixed(1)}%</span>
                                </>
                            ) : monthlyChange < 0 ? (
                                <>
                                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                                    <span className="text-red-500">{monthlyChange.toFixed(1)}%</span>
                                </>
                            ) : (
                                <span className="text-muted-foreground">—</span>
                            )}
                            {monthlyChange !== 0 && (
                                <span className="text-muted-foreground ml-1">vs last month</span>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 dark:bg-blue-500/20 rounded-xl">
                                <TrendingUp className="w-6 h-6 text-blue-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">${stats.lastMonth.toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground">Last Month</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card>
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-amber-100 dark:bg-amber-500/20 rounded-xl">
                                <Calendar className="w-6 h-6 text-amber-600" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">${stats.pending.toLocaleString()}</p>
                                <p className="text-sm text-muted-foreground">Pending</p>
                            </div>
                        </div>
                    </CardContent>
                </Card>

                <Card className="bg-gradient-to-r from-brand-500 to-brand-600 text-white">
                    <CardContent className="pt-6">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/20 rounded-xl">
                                <DollarSign className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-2xl font-bold">${stats.available.toLocaleString()}</p>
                                <p className="text-sm text-white/80">Available to Withdraw</p>
                            </div>
                        </div>
                        <Button className="w-full mt-4 bg-white text-brand-600 hover:bg-white/90">
                            Withdraw Funds
                        </Button>
                    </CardContent>
                </Card>
            </div>

            {/* Earnings Chart (Last 7 Days) */}
            {
                transactions.length > 0 && (
                    <Card>
                        <CardHeader>
                            <CardTitle className="text-base">Last 7 Days</CardTitle>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-end gap-2 h-32">
                                {(() => {
                                    const days: Record<string, number> = {}
                                    const now = new Date()
                                    for (let i = 6; i >= 0; i--) {
                                        const d = new Date(now)
                                        d.setDate(d.getDate() - i)
                                        days[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0
                                    }
                                    transactions.forEach(tx => {
                                        const txDate = new Date(tx.date)
                                        const daysDiff = Math.floor((now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24))
                                        if (daysDiff >= 0 && daysDiff < 7) {
                                            const key = txDate.toLocaleDateString('en-US', { weekday: 'short' })
                                            if (key in days) days[key] += tx.amount
                                        }
                                    })
                                    const maxVal = Math.max(...Object.values(days), 1)
                                    return Object.entries(days).map(([day, val]) => (
                                        <div key={day} className="flex-1 flex flex-col items-center gap-1">
                                            <span className="text-xs text-muted-foreground font-medium">
                                                {val > 0 ? `$${val}` : ''}
                                            </span>
                                            <div className="w-full relative" style={{ height: '80px' }}>
                                                <div
                                                    className="absolute bottom-0 w-full rounded-t-md bg-gradient-to-t from-brand-600 to-brand-400 transition-all"
                                                    style={{ height: `${Math.max((val / maxVal) * 100, val > 0 ? 8 : 2)}%` }}
                                                />
                                            </div>
                                            <span className="text-xs text-muted-foreground">{day}</span>
                                        </div>
                                    ))
                                })()}
                            </div>
                        </CardContent>
                    </Card>
                )
            }

            {/* Transactions */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
                    {transactions.length === 0 ? (
                        <div className="py-8 text-center">
                            <DollarSign className="w-10 h-10 mx-auto text-muted-foreground mb-3" />
                            <p className="text-muted-foreground">No transactions yet</p>
                            <p className="text-sm text-muted-foreground mt-1">Complete jobs to start earning</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {transactions.map((tx) => (
                                <div
                                    key={tx.id}
                                    className="flex items-center justify-between p-4 rounded-xl bg-slate-50 dark:bg-slate-800/50"
                                >
                                    <div className="flex items-center gap-4">
                                        <div
                                            className={`p-2 rounded-lg ${tx.type === 'earning'
                                                ? 'bg-green-100 dark:bg-green-500/20'
                                                : 'bg-blue-100 dark:bg-blue-500/20'
                                                }`}
                                        >
                                            <DollarSign
                                                className={`w-5 h-5 ${tx.type === 'earning' ? 'text-green-600' : 'text-blue-600'
                                                    }`}
                                            />
                                        </div>
                                        <div>
                                            <p className="font-medium">{tx.description}</p>
                                            <p className="text-sm text-muted-foreground">
                                                {tx.client && `${tx.client} • `}{tx.date}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <p
                                            className={`text-lg font-semibold ${tx.amount > 0 ? 'text-green-600' : 'text-blue-600'
                                                }`}
                                        >
                                            {tx.amount > 0 ? '+' : ''}${Math.abs(tx.amount).toLocaleString()}
                                        </p>
                                        <span
                                            className={`text-xs px-2 py-0.5 rounded-full ${tx.status === 'completed'
                                                ? 'bg-green-100 text-green-700 dark:bg-green-500/20 dark:text-green-400'
                                                : 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400'
                                                }`}
                                        >
                                            {tx.status}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div >
    )
}
