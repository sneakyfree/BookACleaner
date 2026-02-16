'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
    DollarSign, Clock, CheckCircle, XCircle,
    Eye, Loader2, ArrowRight, Briefcase
} from 'lucide-react'
import Link from 'next/link'

interface Bid {
    id: string
    job_id: string
    job_title?: string
    amount: number
    message?: string
    estimated_hours?: number
    status: string
    created_at: string
    job_city?: string
    job_scheduled_date?: string
}

export default function MyBidsPage() {
    const [bids, setBids] = useState<Bid[]>([])
    const [loading, setLoading] = useState(true)
    const [statusFilter, setStatusFilter] = useState('all')

    useEffect(() => {
        fetchBids()
    }, [statusFilter])

    const fetchBids = async () => {
        try {
            const token = localStorage.getItem('token')
            const params = statusFilter !== 'all' ? `?status=${statusFilter}` : ''
            const res = await fetch(`/api/v1/bids/my-bids${params}`, {
                headers: { Authorization: `Bearer ${token}` }
            })
            if (res.ok) {
                const data = await res.json()
                setBids(data.bids || [])
            }
        } catch {
            setBids([
                { id: 'b1', job_id: 'j1', job_title: 'Deep Clean - 3BR House', amount: 230, message: 'I can start early morning', estimated_hours: 3, status: 'pending', created_at: '2026-02-07T10:00:00Z', job_city: 'Austin, TX', job_scheduled_date: '2026-02-15' },
                { id: 'b2', job_id: 'j2', job_title: 'Airbnb Turnover', amount: 110, status: 'accepted', created_at: '2026-02-06T14:00:00Z', job_city: 'Austin, TX', job_scheduled_date: '2026-02-16' },
                { id: 'b3', job_id: 'j3', job_title: 'Office Cleaning', amount: 170, message: 'Weekly availability confirmed', status: 'declined', created_at: '2026-02-05T09:00:00Z', job_city: 'Dallas, TX' },
            ])
        } finally {
            setLoading(false)
        }
    }

    const handleWithdraw = async (bidId: string) => {
        try {
            const token = localStorage.getItem('token')
            await fetch(`/api/v1/bids/bids/${bidId}`, {
                method: 'DELETE',
                headers: { Authorization: `Bearer ${token}` }
            })
            fetchBids()
        } catch {
            // handle error
        }
    }

    const getStatusConfig = (status: string) => {
        const configs: Record<string, { color: string; bg: string; icon: React.ReactNode }> = {
            pending: { color: 'text-amber-600', bg: 'bg-amber-100 dark:bg-amber-500/20', icon: <Clock className="w-3.5 h-3.5" /> },
            accepted: { color: 'text-green-600', bg: 'bg-green-100 dark:bg-green-500/20', icon: <CheckCircle className="w-3.5 h-3.5" /> },
            declined: { color: 'text-red-600', bg: 'bg-red-100 dark:bg-red-500/20', icon: <XCircle className="w-3.5 h-3.5" /> },
            withdrawn: { color: 'text-gray-600', bg: 'bg-gray-100 dark:bg-gray-500/20', icon: <XCircle className="w-3.5 h-3.5" /> },
        }
        return configs[status] || configs.pending
    }

    const filteredBids = statusFilter === 'all'
        ? bids
        : bids.filter(b => b.status === statusFilter)

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">My Bids</h1>
                    <p className="text-muted-foreground mt-1">Track your marketplace bids</p>
                </div>
                <Link href="/cleaner/marketplace">
                    <Button className="gap-2">
                        <Briefcase className="w-4 h-4" /> Browse Jobs
                    </Button>
                </Link>
            </div>

            {/* Status Filters */}
            <div className="flex gap-2">
                {['all', 'pending', 'accepted', 'declined', 'withdrawn'].map(s => (
                    <Button
                        key={s}
                        variant={statusFilter === s ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => setStatusFilter(s)}
                    >
                        {s.charAt(0).toUpperCase() + s.slice(1)}
                        {s !== 'all' && (
                            <span className="ml-1.5 px-1.5 py-0.5 text-xs rounded-full bg-black/10 dark:bg-white/10">
                                {bids.filter(b => b.status === s).length}
                            </span>
                        )}
                    </Button>
                ))}
            </div>

            {/* Bid List */}
            {filteredBids.length === 0 ? (
                <Card>
                    <CardContent className="py-12 text-center">
                        <Briefcase className="w-12 h-12 mx-auto mb-4 text-muted-foreground opacity-50" />
                        <p className="text-lg font-medium">No bids yet</p>
                        <p className="text-muted-foreground mt-1">Browse the marketplace to find jobs</p>
                        <Link href="/cleaner/marketplace">
                            <Button className="mt-4">Browse Jobs</Button>
                        </Link>
                    </CardContent>
                </Card>
            ) : (
                <div className="space-y-3">
                    {filteredBids.map(bid => {
                        const sc = getStatusConfig(bid.status)
                        return (
                            <Card key={bid.id} className="hover:shadow-md transition-shadow">
                                <CardContent className="p-5">
                                    <div className="flex items-start justify-between gap-4">
                                        <div className="flex-1">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h3 className="font-semibold">{bid.job_title || 'Cleaning Job'}</h3>
                                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium ${sc.bg} ${sc.color}`}>
                                                    {sc.icon} {bid.status.charAt(0).toUpperCase() + bid.status.slice(1)}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-sm text-muted-foreground mt-2">
                                                {bid.job_city && <span>{bid.job_city}</span>}
                                                {bid.job_scheduled_date && (
                                                    <span>{new Date(bid.job_scheduled_date).toLocaleDateString()}</span>
                                                )}
                                                <span>Bid: {new Date(bid.created_at).toLocaleDateString()}</span>
                                            </div>
                                            {bid.message && (
                                                <p className="text-sm text-muted-foreground mt-2 italic">&quot;{bid.message}&quot;</p>
                                            )}
                                        </div>
                                        <div className="text-right flex flex-col items-end gap-2">
                                            <p className="text-xl font-bold text-brand-600">${bid.amount}</p>
                                            {bid.estimated_hours && (
                                                <p className="text-xs text-muted-foreground">{bid.estimated_hours}h est.</p>
                                            )}
                                            <div className="flex gap-2 mt-1">
                                                {bid.status === 'pending' && (
                                                    <Button size="sm" variant="outline" onClick={() => handleWithdraw(bid.id)}>
                                                        Withdraw
                                                    </Button>
                                                )}
                                                {bid.status === 'accepted' && (
                                                    <Link href={`/cleaner/jobs`}>
                                                        <Button size="sm" className="gap-1">
                                                            View Job <ArrowRight className="w-3 h-3" />
                                                        </Button>
                                                    </Link>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
