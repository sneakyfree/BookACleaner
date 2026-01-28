'use client'

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
} from 'lucide-react'

export default function CleanerEarningsPage() {
    const stats = {
        thisMonth: 4250,
        lastMonth: 3890,
        pending: 480,
        available: 3770,
    }

    const monthlyChange = ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100

    const transactions = [
        {
            id: '1',
            type: 'earning',
            description: 'Deep Clean - Lake House',
            client: 'John D.',
            amount: 180,
            date: 'Today',
            status: 'completed',
        },
        {
            id: '2',
            type: 'earning',
            description: 'Airbnb Turnover - Downtown Condo',
            client: 'Sarah M.',
            amount: 120,
            date: 'Yesterday',
            status: 'pending',
        },
        {
            id: '3',
            type: 'payout',
            description: 'Weekly payout to bank',
            amount: -1500,
            date: 'Jan 20, 2026',
            status: 'completed',
        },
        {
            id: '4',
            type: 'earning',
            description: 'Standard Clean - Beach Cottage',
            client: 'Mike R.',
            amount: 100,
            date: 'Jan 19, 2026',
            status: 'completed',
        },
        {
            id: '5',
            type: 'earning',
            description: 'Move Out Clean - Modern Apartment',
            client: 'Emily K.',
            amount: 200,
            date: 'Jan 18, 2026',
            status: 'completed',
        },
    ]

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
                            ) : (
                                <>
                                    <ArrowDownRight className="w-4 h-4 text-red-500" />
                                    <span className="text-red-500">{monthlyChange.toFixed(1)}%</span>
                                </>
                            )}
                            <span className="text-muted-foreground ml-1">vs last month</span>
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

            {/* Transactions */}
            <Card>
                <CardHeader>
                    <CardTitle>Recent Transactions</CardTitle>
                </CardHeader>
                <CardContent>
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
                </CardContent>
            </Card>
        </div>
    )
}
