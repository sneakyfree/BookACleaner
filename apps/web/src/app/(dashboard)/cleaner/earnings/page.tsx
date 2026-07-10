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
  Loader2,
  AlertCircle,
  Banknote,
} from 'lucide-react'
import { toast } from 'sonner'
import { useJobs } from '@/hooks/use-api'
import { apiFetch } from '@/lib/auth/api-client'
import { formatCurrency } from '@/lib/utils'

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
            month: 'short',
            day: 'numeric',
            year: 'numeric',
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

  const monthlyChange =
    stats.lastMonth > 0 ? ((stats.thisMonth - stats.lastMonth) / stats.lastMonth) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="text-brand-500 h-8 w-8 animate-spin" />
        <span className="text-muted-foreground ml-3">Loading earnings...</span>
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
            <AlertCircle className="mx-auto mb-3 h-10 w-10 text-red-500" />
            <p className="font-medium text-red-600 dark:text-red-400">
              {(error as any)?.detail || 'Failed to load earnings'}
            </p>
            <p className="text-muted-foreground mt-1 text-sm">Please try refreshing the page</p>
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
          <Button
            className="bg-green-600 text-white hover:bg-green-700"
            onClick={async () => {
              if (stats.available <= 0) {
                toast.error('No available balance to withdraw')
                return
              }
              try {
                await apiFetch('/api/v1/payments/request-payout', {
                  method: 'POST',
                  body: JSON.stringify({ amount: stats.available }),
                })
                toast.success(`Payout of ${formatCurrency(stats.available)} requested!`)
              } catch {
                toast.error('Payout request failed')
              }
            }}
          >
            <Banknote className="mr-2 h-4 w-4" />
            Request Payout
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-green-100 p-3 dark:bg-green-500/20">
                <DollarSign className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.thisMonth)}</p>
                <p className="text-muted-foreground text-sm">This Month</p>
              </div>
            </div>
            <div className="mt-2 flex items-center text-sm">
              {monthlyChange > 0 ? (
                <>
                  <ArrowUpRight className="h-4 w-4 text-green-500" />
                  <span className="text-green-500">+{monthlyChange.toFixed(1)}%</span>
                </>
              ) : monthlyChange < 0 ? (
                <>
                  <ArrowDownRight className="h-4 w-4 text-red-500" />
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
              <div className="rounded-xl bg-blue-100 p-3 dark:bg-blue-500/20">
                <TrendingUp className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.lastMonth)}</p>
                <p className="text-muted-foreground text-sm">Last Month</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-amber-100 p-3 dark:bg-amber-500/20">
                <Calendar className="h-6 w-6 text-amber-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.pending)}</p>
                <p className="text-muted-foreground text-sm">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="from-brand-500 to-brand-600 bg-gradient-to-r text-white">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="rounded-xl bg-white/20 p-3">
                <DollarSign className="h-6 w-6" />
              </div>
              <div>
                <p className="text-2xl font-bold">{formatCurrency(stats.available)}</p>
                <p className="text-sm text-white/80">Available to Withdraw</p>
              </div>
            </div>
            <Button className="text-brand-600 mt-4 w-full bg-white hover:bg-white/90">
              Withdraw Funds
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Earnings Chart (Last 7 Days) */}
      {transactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Last 7 Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex h-32 items-end gap-2">
              {(() => {
                const days: Record<string, number> = {}
                const now = new Date()
                for (let i = 6; i >= 0; i--) {
                  const d = new Date(now)
                  d.setDate(d.getDate() - i)
                  days[d.toLocaleDateString('en-US', { weekday: 'short' })] = 0
                }
                transactions.forEach((tx) => {
                  const txDate = new Date(tx.date)
                  const daysDiff = Math.floor(
                    (now.getTime() - txDate.getTime()) / (1000 * 60 * 60 * 24)
                  )
                  if (daysDiff >= 0 && daysDiff < 7) {
                    const key = txDate.toLocaleDateString('en-US', { weekday: 'short' })
                    if (key in days) days[key] += tx.amount
                  }
                })
                const maxVal = Math.max(...Object.values(days), 1)
                return Object.entries(days).map(([day, val]) => (
                  <div key={day} className="flex flex-1 flex-col items-center gap-1">
                    <span className="text-muted-foreground text-xs font-medium">
                      {val > 0 ? `$${val}` : ''}
                    </span>
                    <div className="relative w-full" style={{ height: '80px' }}>
                      <div
                        className="from-brand-600 to-brand-400 absolute bottom-0 w-full rounded-t-md bg-gradient-to-t transition-all"
                        style={{ height: `${Math.max((val / maxVal) * 100, val > 0 ? 8 : 2)}%` }}
                      />
                    </div>
                    <span className="text-muted-foreground text-xs">{day}</span>
                  </div>
                ))
              })()}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transactions */}
      <Card>
        <CardHeader>
          <CardTitle>Recent Transactions</CardTitle>
        </CardHeader>
        <CardContent>
          {transactions.length === 0 ? (
            <div className="py-8 text-center">
              <DollarSign className="text-muted-foreground mx-auto mb-3 h-10 w-10" />
              <p className="text-muted-foreground">No transactions yet</p>
              <p className="text-muted-foreground mt-1 text-sm">Complete jobs to start earning</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex items-center justify-between rounded-xl bg-slate-50 p-4 dark:bg-slate-800/50"
                >
                  <div className="flex items-center gap-4">
                    <div
                      className={`rounded-lg p-2 ${
                        tx.type === 'earning'
                          ? 'bg-green-100 dark:bg-green-500/20'
                          : 'bg-blue-100 dark:bg-blue-500/20'
                      }`}
                    >
                      <DollarSign
                        className={`h-5 w-5 ${
                          tx.type === 'earning' ? 'text-green-600' : 'text-blue-600'
                        }`}
                      />
                    </div>
                    <div>
                      <p className="font-medium">{tx.description}</p>
                      <p className="text-muted-foreground text-sm">
                        {tx.client && `${tx.client} • `}
                        {tx.date}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p
                      className={`text-lg font-semibold ${
                        tx.amount > 0 ? 'text-green-600' : 'text-blue-600'
                      }`}
                    >
                      {tx.amount > 0 ? '+' : ''}
                      {formatCurrency(Math.abs(tx.amount))}
                    </p>
                    <span
                      className={`rounded-full px-2 py-0.5 text-xs ${
                        tx.status === 'completed'
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
    </div>
  )
}
