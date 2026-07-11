'use client'

import { useState } from 'react'
import {
  CreditCard,
  DollarSign,
  Banknote,
  Wallet,
  Undo2,
  Users,
  Loader2,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  Receipt,
} from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn, formatCurrency } from '@/lib/utils'
import {
  useBillingOverview,
  useBillingTransactions,
  useBillingSubscriptions,
} from '@/hooks/use-api'
import { api } from '@/lib/api'

interface Transaction {
  job_id: string
  title: string
  amount: number
  platform_fee: number
  net: number
  status: string
  payment_status: string
  client: { name: string; email: string } | null
  cleaner_business: string | null
  paid_at: string | null
  created_at: string
}

interface Subscription {
  plan: string
  status: string
  user: { name: string; email: string } | null
  current_period_end: string | null
}

const PAGE_SIZE = 20

// Payment statuses eligible for an admin refund
const REFUNDABLE = new Set(['captured', 'held', 'authorized', 'transferred', 'released'])

const paymentStatusColors: Record<string, string> = {
  pending: 'bg-amber-500/20 text-amber-400',
  authorized: 'bg-blue-500/20 text-blue-400',
  captured: 'bg-green-500/20 text-green-400',
  held: 'bg-purple-500/20 text-purple-400',
  transferred: 'bg-teal-500/20 text-teal-400',
  released: 'bg-emerald-500/20 text-emerald-400',
  refunded: 'bg-red-500/20 text-red-400',
  failed: 'bg-red-500/20 text-red-400',
}

const subStatusColors: Record<string, string> = {
  active: 'bg-green-500/20 text-green-400',
  trialing: 'bg-blue-500/20 text-blue-400',
  past_due: 'bg-amber-500/20 text-amber-400',
  canceled: 'bg-red-500/20 text-red-400',
  cancelled: 'bg-red-500/20 text-red-400',
}

const badgeColor = (map: Record<string, string>, key: string) =>
  map[key] || 'bg-white/10 text-white/60'

export default function AdminBillingPage() {
  const [txPage, setTxPage] = useState(1)
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [subPage, setSubPage] = useState(1)

  const {
    data: overview,
    isLoading: overviewLoading,
    error: overviewError,
    refetch: refetchOverview,
  } = useBillingOverview()
  const {
    data: txData,
    isLoading: txLoading,
    error: txError,
  } = useBillingTransactions(txPage, statusFilter !== 'all' ? statusFilter : undefined)
  const { data: subData, isLoading: subLoading } = useBillingSubscriptions(subPage)

  const queryClient = useQueryClient()

  const transactions: Transaction[] = txData?.transactions || []
  const txTotal: number = txData?.total ?? transactions.length
  const subscriptions: Subscription[] = subData?.subscriptions || []
  const subTotal: number = subData?.total ?? subscriptions.length

  const refundMut = useMutation({
    mutationFn: (jobId: string) => api.admin.billingRefund(jobId),
    onSuccess: () => {
      toast.success('Refund issued')
      queryClient.invalidateQueries({ queryKey: ['admin', 'billing'] })
    },
    onError: (err: any) => toast.error(err?.detail || 'Refund failed'),
  })

  const handleRefund = (tx: Transaction) => {
    if (
      window.confirm(
        `Refund ${formatCurrency(tx.amount)} for "${tx.title}"? This cannot be undone.`
      )
    ) {
      refundMut.mutate(tx.job_id)
    }
  }

  const paymentStatuses: Record<string, number> = overview?.jobs_by_payment_status || {}
  const statusTotal = Object.values(paymentStatuses).reduce((a, b) => a + b, 0)
  const filterOptions = Array.from(
    new Set([
      'pending',
      'authorized',
      'captured',
      'held',
      'refunded',
      ...Object.keys(paymentStatuses),
    ])
  )

  const subsByPlan: Record<string, number> = overview?.subscriptions_by_plan || {}

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <CreditCard className="text-brand-400 h-7 w-7" />
            Billing & Payments
          </h1>
          <p className="mt-1 text-white/60">Revenue, transactions, refunds and subscriptions</p>
        </div>

        {/* Error Banner */}
        {overviewError && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">
              {(overviewError as any)?.detail || 'Failed to load billing overview'}
            </p>
            <button
              onClick={() => refetchOverview()}
              className="ml-auto text-sm font-medium text-red-400 hover:text-red-300"
            >
              Retry
            </button>
          </div>
        )}

        {/* Overview stat cards */}
        {overviewLoading ? (
          <div className="mb-8 flex items-center justify-center py-16">
            <Loader2 className="text-brand-400 h-8 w-8 animate-spin" />
            <span className="ml-3 text-white/60">Loading billing overview...</span>
          </div>
        ) : overview ? (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
              <StatCard
                title="Gross Revenue"
                value={formatCurrency(overview.gross_revenue || 0)}
                icon={DollarSign}
                accent="text-green-400"
              />
              <StatCard
                title="Platform Fee"
                value={formatCurrency(overview.platform_fee || 0)}
                icon={Receipt}
                accent="text-brand-400"
              />
              <StatCard
                title="Net to Cleaners"
                value={formatCurrency(overview.net_to_cleaners || 0)}
                icon={Banknote}
                accent="text-blue-400"
              />
              <StatCard
                title="Outstanding Payouts"
                value={formatCurrency(overview.outstanding_payouts || 0)}
                icon={Wallet}
                accent="text-amber-400"
              />
              <StatCard
                title="Refunded"
                value={formatCurrency(overview.refunded_amount || 0)}
                sub={`${overview.refunded_count || 0} refund${(overview.refunded_count || 0) === 1 ? '' : 's'}`}
                icon={Undo2}
                accent="text-red-400"
              />
              <StatCard
                title="Active Subscriptions"
                value={String(overview.active_subscriptions || 0)}
                sub={
                  Object.keys(subsByPlan).length > 0
                    ? Object.entries(subsByPlan)
                        .map(([plan, count]) => `${plan}: ${count}`)
                        .join(' · ')
                    : undefined
                }
                icon={Users}
                accent="text-purple-400"
              />
            </div>

            {/* Jobs by payment status */}
            {statusTotal > 0 && (
              <div className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6">
                <h3 className="mb-4 text-sm font-medium text-white/60">Jobs by payment status</h3>
                <div className="mb-3 flex h-3 overflow-hidden rounded-full bg-white/5">
                  {Object.entries(paymentStatuses).map(([status, count]) => (
                    <div
                      key={status}
                      className={cn(
                        'transition-all',
                        badgeColor(paymentStatusColors, status).split(' ')[0].replace('/20', '/60')
                      )}
                      style={{ width: `${(count / statusTotal) * 100}%` }}
                      title={`${status}: ${count}`}
                    />
                  ))}
                </div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(paymentStatuses).map(([status, count]) => (
                    <span
                      key={status}
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                        badgeColor(paymentStatusColors, status)
                      )}
                    >
                      {status.replace(/_/g, ' ')} · {count}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : null}

        {/* Transactions */}
        <div className="mb-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
            <h2 className="text-lg font-semibold text-white">Transactions</h2>
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value)
                setTxPage(1)
              }}
              className="focus:ring-brand-500/50 cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-sm text-white focus:outline-none focus:ring-2"
            >
              <option value="all">All Payment Statuses</option>
              {filterOptions.map((s) => (
                <option key={s} value={s}>
                  {s.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                </option>
              ))}
            </select>
          </div>

          {txError && (
            <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
              <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
              <p className="text-sm text-red-300">
                {(txError as any)?.detail || 'Failed to load transactions'}
              </p>
            </div>
          )}

          {txLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="text-brand-400 h-8 w-8 animate-spin" />
              <span className="ml-3 text-white/60">Loading transactions...</span>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10 text-sm text-white/50">
                        <th className="px-6 py-4 text-left font-medium">Job</th>
                        <th className="px-4 py-4 text-left font-medium">Client</th>
                        <th className="px-4 py-4 text-left font-medium">Cleaner</th>
                        <th className="px-4 py-4 text-right font-medium">Amount</th>
                        <th className="px-4 py-4 text-right font-medium">Fee</th>
                        <th className="px-4 py-4 text-right font-medium">Net</th>
                        <th className="px-4 py-4 text-left font-medium">Payment</th>
                        <th className="px-4 py-4 text-left font-medium">Date</th>
                        <th className="px-6 py-4 text-right font-medium">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactions.map((tx) => (
                        <tr
                          key={tx.job_id}
                          className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="max-w-[220px] px-6 py-4">
                            <p className="truncate font-medium text-white" title={tx.title}>
                              {tx.title || 'Untitled job'}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            {tx.client ? (
                              <div>
                                <p className="text-sm text-white">{tx.client.name}</p>
                                <p className="text-xs text-white/40">{tx.client.email}</p>
                              </div>
                            ) : (
                              <span className="text-sm text-white/30">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm text-white/70">
                            {tx.cleaner_business || <span className="text-white/30">—</span>}
                          </td>
                          <td className="px-4 py-4 text-right text-sm font-medium text-white">
                            {formatCurrency(tx.amount || 0)}
                          </td>
                          <td className="text-brand-400 px-4 py-4 text-right text-sm">
                            {formatCurrency(tx.platform_fee || 0)}
                          </td>
                          <td className="px-4 py-4 text-right text-sm text-green-400">
                            {formatCurrency(tx.net || 0)}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                                badgeColor(paymentStatusColors, tx.payment_status)
                              )}
                            >
                              {(tx.payment_status || 'unknown').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 text-sm text-white/60">
                            {tx.paid_at || tx.created_at
                              ? new Date(tx.paid_at || tx.created_at).toLocaleDateString()
                              : '—'}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {REFUNDABLE.has(tx.payment_status) && (
                              <button
                                onClick={() => handleRefund(tx)}
                                disabled={refundMut.isPending}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
                              >
                                {refundMut.isPending && refundMut.variables === tx.job_id ? (
                                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                ) : (
                                  <RotateCcw className="h-3.5 w-3.5" />
                                )}
                                Refund
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {transactions.length === 0 && (
                  <div className="py-12 text-center text-white/40">
                    {statusFilter !== 'all'
                      ? 'No transactions match this filter'
                      : 'No transactions yet'}
                  </div>
                )}
              </div>

              {txTotal > PAGE_SIZE && (
                <Pagination page={txPage} total={txTotal} onChange={setTxPage} />
              )}
            </>
          )}
        </div>

        {/* Subscriptions */}
        <div>
          <h2 className="mb-4 text-lg font-semibold text-white">Subscriptions</h2>
          {subLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="text-brand-400 h-8 w-8 animate-spin" />
              <span className="ml-3 text-white/60">Loading subscriptions...</span>
            </div>
          ) : (
            <>
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-white/10 text-sm text-white/50">
                        <th className="px-6 py-4 text-left font-medium">User</th>
                        <th className="px-4 py-4 text-left font-medium">Plan</th>
                        <th className="px-4 py-4 text-left font-medium">Status</th>
                        <th className="px-6 py-4 text-left font-medium">Period Ends</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subscriptions.map((sub, i) => (
                        <tr
                          key={i}
                          className="border-b border-white/5 transition-colors hover:bg-white/[0.02]"
                        >
                          <td className="px-6 py-4">
                            {sub.user ? (
                              <div>
                                <p className="text-sm font-medium text-white">{sub.user.name}</p>
                                <p className="text-xs text-white/40">{sub.user.email}</p>
                              </div>
                            ) : (
                              <span className="text-sm text-white/30">—</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span className="bg-brand-500/20 text-brand-400 rounded-full px-2.5 py-1 text-xs font-medium capitalize">
                              {sub.plan || 'free'}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={cn(
                                'rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                                badgeColor(subStatusColors, sub.status)
                              )}
                            >
                              {(sub.status || 'unknown').replace(/_/g, ' ')}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-white/60">
                            {sub.current_period_end
                              ? new Date(sub.current_period_end).toLocaleDateString()
                              : '—'}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {subscriptions.length === 0 && (
                  <div className="py-12 text-center text-white/40">No subscriptions yet</div>
                )}
              </div>

              {subTotal > PAGE_SIZE && (
                <Pagination page={subPage} total={subTotal} onChange={setSubPage} />
              )}
            </>
          )}
        </div>
      </div>
    </div>
  )
}

function StatCard({
  title,
  value,
  sub,
  icon: Icon,
  accent,
}: {
  title: string
  value: string
  sub?: string
  icon: React.ElementType
  accent: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      <div className="mb-4 flex items-start justify-between">
        <div className="bg-brand-500/20 flex h-10 w-10 items-center justify-center rounded-lg">
          <Icon className={cn('h-5 w-5', accent)} />
        </div>
      </div>
      <p className="mb-1 text-sm text-white/50">{title}</p>
      <p className="text-2xl font-bold text-white">{value}</p>
      {sub && <p className="mt-1 text-xs text-white/40">{sub}</p>}
    </div>
  )
}

function Pagination({
  page,
  total,
  onChange,
}: {
  page: number
  total: number
  onChange: (p: number) => void
}) {
  const pages = Math.ceil(total / PAGE_SIZE)
  return (
    <div className="mt-6 flex items-center justify-center gap-4">
      <button
        onClick={() => onChange(Math.max(1, page - 1))}
        disabled={page <= 1}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/60 hover:bg-white/10 disabled:opacity-30"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      <span className="text-sm text-white/60">
        Page {page} of {pages}
      </span>
      <button
        onClick={() => onChange(page + 1)}
        disabled={page >= pages}
        className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/60 hover:bg-white/10 disabled:opacity-30"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}
