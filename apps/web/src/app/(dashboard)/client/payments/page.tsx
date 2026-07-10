'use client'

import { useMemo } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import {
  DollarSign,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Loader2,
  AlertCircle,
  ShieldCheck,
  Clock,
} from 'lucide-react'
import Link from 'next/link'
import { useJobs } from '@/hooks/use-api'
import { formatCurrency } from '@/lib/utils'

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

const statusConfig: Record<
  string,
  { label: string; color: string; bg: string; icon: typeof Clock }
> = {
  authorized: {
    label: 'Authorized',
    color: 'text-blue-600',
    bg: 'bg-blue-100 dark:bg-blue-500/20',
    icon: CreditCard,
  },
  held: {
    label: 'In Escrow',
    color: 'text-amber-600',
    bg: 'bg-amber-100 dark:bg-amber-500/20',
    icon: ShieldCheck,
  },
  captured: {
    label: 'Captured',
    color: 'text-green-600',
    bg: 'bg-green-100 dark:bg-green-500/20',
    icon: DollarSign,
  },
  released: {
    label: 'Released',
    color: 'text-green-600',
    bg: 'bg-green-100 dark:bg-green-500/20',
    icon: ArrowUpRight,
  },
  refunded: {
    label: 'Refunded',
    color: 'text-red-600',
    bg: 'bg-red-100 dark:bg-red-500/20',
    icon: ArrowDownRight,
  },
  failed: {
    label: 'Failed',
    color: 'text-red-600',
    bg: 'bg-red-100 dark:bg-red-500/20',
    icon: AlertCircle,
  },
  pending: {
    label: 'Pending',
    color: 'text-slate-600',
    bg: 'bg-slate-100 dark:bg-slate-500/20',
    icon: Clock,
  },
}

export default function ClientPaymentHistoryPage() {
  const { data: rawJobs, isLoading: loading, error } = useJobs()

  const { payments, stats } = useMemo(() => {
    const jobs: any[] = Array.isArray(rawJobs) ? rawJobs : (rawJobs as any)?.jobs || []

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
      .sort(
        (a: PaymentRecord, b: PaymentRecord) =>
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      )

    let totalSpent = 0,
      escrow = 0,
      released = 0
    paymentList.forEach((p) => {
      if (['held', 'captured', 'released'].includes(p.status)) totalSpent += p.amount
      if (p.status === 'held') escrow += p.amount
      if (p.status === 'released' || p.status === 'captured') released += p.amount
    })

    return { payments: paymentList, stats: { total: totalSpent, escrow, released } }
  }, [rawJobs])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="text-brand-500 h-8 w-8 animate-spin" />
        <span className="text-muted-foreground ml-3">Loading payment history...</span>
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
      </div>

      {error && (
        <Card className="border-red-200 dark:border-red-800">
          <CardContent className="py-6 text-center">
            <AlertCircle className="mx-auto mb-2 h-8 w-8 text-red-500" />
            <p className="text-red-600 dark:text-red-400">
              {(error as any)?.detail || 'Failed to load payments'}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-green-100 p-3 dark:bg-green-500/20">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.total)}</p>
                <p className="text-muted-foreground text-sm">Total Spent</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-amber-100 p-3 dark:bg-amber-500/20">
                <ShieldCheck className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.escrow)}</p>
                <p className="text-muted-foreground text-sm">In Escrow</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-500/20">
                <ArrowUpRight className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.released)}</p>
                <p className="text-muted-foreground text-sm">Released to Cleaners</p>
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
              <CreditCard className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p className="text-lg font-medium">No payments yet</p>
              <p className="text-muted-foreground mt-1">
                Your payment history will appear here once you book a cleaning.
              </p>
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
                    <div className="flex cursor-pointer items-center justify-between rounded-xl bg-slate-50 p-4 transition hover:bg-slate-100 dark:bg-slate-800/50 dark:hover:bg-slate-800">
                      <div className="flex items-center gap-4">
                        <div className={`rounded-lg p-2 ${config.bg}`}>
                          <Icon className={`h-5 w-5 ${config.color}`} />
                        </div>
                        <div>
                          <p className="font-medium">{p.job_title}</p>
                          <p className="text-muted-foreground text-sm">
                            {p.cleaner_name && `${p.cleaner_name} • `}
                            {new Date(p.created_at).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                              year: 'numeric',
                            })}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-lg font-semibold">{formatCurrency(p.amount)}</p>
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs ${config.bg} ${config.color} font-medium`}
                        >
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
