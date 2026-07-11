'use client'

import { useEffect, useState } from 'react'
import {
  LifeBuoy,
  Search,
  Loader2,
  AlertCircle,
  MessageSquare,
  Send,
  ChevronLeft,
  ChevronRight,
  Inbox,
  ShieldCheck,
  User,
} from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useSupportTickets, useSupportTicket } from '@/hooks/use-api'
import { api } from '@/lib/api'

interface TicketRow {
  id: string
  subject: string
  email: string
  category: string
  priority: string
  status: string
  requester: { name: string; email: string } | null
  message_count: number
  created_at: string
}

interface TicketMessage {
  author_role: string
  body: string
  created_at: string
}

const PAGE_SIZE = 20

const statusColors: Record<string, string> = {
  open: 'bg-green-500/20 text-green-400',
  pending: 'bg-amber-500/20 text-amber-400',
  resolved: 'bg-blue-500/20 text-blue-400',
  closed: 'bg-white/10 text-white/50',
}

const priorityColors: Record<string, string> = {
  urgent: 'bg-red-500/20 text-red-400',
  high: 'bg-amber-500/20 text-amber-400',
  normal: 'bg-white/10 text-white/60',
  low: 'bg-white/10 text-white/40',
}

const STATUSES = ['all', 'open', 'pending', 'resolved', 'closed'] as const

export default function AdminSupportPage() {
  const [statusFilter, setStatusFilter] = useState<string>('open')
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [page, setPage] = useState(1)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [reply, setReply] = useState('')

  // Debounce the search box (~350ms) so we don't refetch on every keystroke.
  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 350)
    return () => clearTimeout(t)
  }, [search])

  const {
    data: listData,
    isLoading: listLoading,
    error: listError,
    refetch,
  } = useSupportTickets(
    page,
    statusFilter !== 'all' ? statusFilter : undefined,
    debouncedSearch || undefined
  )

  const { data: detailData, isLoading: detailLoading } = useSupportTicket(selectedId || '')

  const queryClient = useQueryClient()

  const tickets: TicketRow[] = listData?.tickets || []
  const total: number = listData?.total ?? tickets.length
  const openCount: number = listData?.open_count ?? 0

  const ticket = detailData?.ticket
  const messages: TicketMessage[] = detailData?.messages || []

  const replyMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api.admin.supportReply(id, body),
    onSuccess: () => {
      setReply('')
      toast.success('Reply sent')
      queryClient.invalidateQueries({ queryKey: ['admin', 'support'] })
    },
    onError: (err: any) => toast.error(err?.detail || 'Failed to send reply'),
  })

  const statusMut = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      api.admin.supportUpdate(id, { status }),
    onSuccess: (_data, vars) => {
      toast.success(`Ticket marked ${vars.status}`)
      queryClient.invalidateQueries({ queryKey: ['admin', 'support'] })
    },
    onError: (err: any) => toast.error(err?.detail || 'Failed to update ticket'),
  })

  const handleSend = () => {
    if (!selectedId || !reply.trim()) return
    replyMut.mutate({ id: selectedId, body: reply.trim() })
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Header */}
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
              <LifeBuoy className="text-brand-400 h-7 w-7" />
              Support Queue
            </h1>
            <p className="mt-1 text-white/60">
              {openCount} open ticket{openCount === 1 ? '' : 's'} · {total} shown in filter
            </p>
          </div>
          <div className="flex gap-1 rounded-lg bg-white/5 p-1">
            {STATUSES.map((s) => (
              <button
                key={s}
                onClick={() => {
                  setStatusFilter(s)
                  setPage(1)
                }}
                className={cn(
                  'rounded-md px-3 py-1.5 text-sm capitalize transition-colors',
                  statusFilter === s ? 'bg-brand-500 text-white' : 'text-white/60 hover:text-white'
                )}
              >
                {s}
              </button>
            ))}
          </div>
        </div>

        {/* Error Banner */}
        {listError && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">
              {(listError as any)?.detail || 'Failed to load support tickets'}
            </p>
            <button
              onClick={() => refetch()}
              className="ml-auto text-sm font-medium text-red-400 hover:text-red-300"
            >
              Retry
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
          {/* Left: ticket list */}
          <div className="lg:col-span-2">
            <div className="relative mb-4">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/40" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search subject, email, message..."
                className="focus:ring-brand-500/50 w-full rounded-lg border border-white/10 bg-white/5 py-2.5 pl-10 pr-4 text-white placeholder:text-white/30 focus:outline-none focus:ring-2"
              />
            </div>

            {listLoading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="text-brand-400 h-6 w-6 animate-spin" />
                <span className="ml-3 text-white/60">Loading tickets...</span>
              </div>
            ) : tickets.length === 0 ? (
              <div className="rounded-xl border border-white/10 bg-white/5 py-12 text-center">
                <Inbox className="mx-auto mb-3 h-8 w-8 text-white/20" />
                <p className="text-white/40">No tickets match your filters</p>
              </div>
            ) : (
              <div className="space-y-2">
                {tickets.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedId(t.id)}
                    className={cn(
                      'w-full rounded-xl border p-4 text-left transition-colors',
                      selectedId === t.id
                        ? 'border-brand-500/50 bg-brand-500/10'
                        : 'border-white/10 bg-white/5 hover:bg-white/10'
                    )}
                  >
                    <div className="mb-1 flex items-start justify-between gap-2">
                      <p className="truncate font-medium text-white">{t.subject}</p>
                      <span
                        className={cn(
                          'shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
                          statusColors[t.status] || 'bg-white/10 text-white/60'
                        )}
                      >
                        {t.status}
                      </span>
                    </div>
                    <p className="truncate text-sm text-white/50">
                      {t.requester?.name || t.requester?.email || t.email || 'Unknown requester'}
                    </p>
                    <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
                      <span className="rounded bg-white/5 px-1.5 py-0.5 capitalize">
                        {t.category || 'general'}
                      </span>
                      {t.priority && t.priority !== 'normal' && (
                        <span
                          className={cn(
                            'rounded px-1.5 py-0.5 capitalize',
                            priorityColors[t.priority] || 'bg-white/10 text-white/60'
                          )}
                        >
                          {t.priority}
                        </span>
                      )}
                      <span className="flex items-center gap-1">
                        <MessageSquare className="h-3 w-3" />
                        {t.message_count}
                      </span>
                      <span className="ml-auto">
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : '—'}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Pagination */}
            {total > PAGE_SIZE && (
              <div className="mt-4 flex items-center justify-center gap-4">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/60 hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <span className="text-sm text-white/60">
                  Page {page} of {Math.ceil(total / PAGE_SIZE)}
                </span>
                <button
                  onClick={() => setPage((p) => p + 1)}
                  disabled={page >= Math.ceil(total / PAGE_SIZE)}
                  className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-white/60 hover:bg-white/10 disabled:opacity-30"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>

          {/* Right: selected ticket thread */}
          <div className="lg:col-span-3">
            {!selectedId ? (
              <div className="flex h-full min-h-[300px] items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <div className="text-center">
                  <LifeBuoy className="mx-auto mb-3 h-10 w-10 text-white/20" />
                  <p className="text-white/40">Select a ticket to view the conversation</p>
                </div>
              </div>
            ) : detailLoading ? (
              <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-white/10 bg-white/5">
                <Loader2 className="text-brand-400 h-6 w-6 animate-spin" />
                <span className="ml-3 text-white/60">Loading ticket...</span>
              </div>
            ) : !ticket ? (
              <div className="flex min-h-[300px] items-center justify-center rounded-xl border border-red-500/30 bg-white/5">
                <div className="text-center">
                  <AlertCircle className="mx-auto mb-3 h-8 w-8 text-red-400" />
                  <p className="text-red-400">Failed to load ticket</p>
                </div>
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-white/10 bg-white/5">
                {/* Ticket header */}
                <div className="border-b border-white/10 p-6">
                  <div className="mb-2 flex flex-wrap items-start justify-between gap-3">
                    <h2 className="text-lg font-semibold text-white">{ticket.subject}</h2>
                    <span
                      className={cn(
                        'rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                        statusColors[ticket.status] || 'bg-white/10 text-white/60'
                      )}
                    >
                      {ticket.status}
                    </span>
                  </div>
                  <p className="text-sm text-white/50">
                    {ticket.requester?.name || 'Unknown'} ·{' '}
                    {ticket.requester?.email || ticket.email} ·{' '}
                    <span className="capitalize">{ticket.category || 'general'}</span>
                  </p>

                  {/* Status controls */}
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(['open', 'pending', 'resolved', 'closed'] as const).map((s) => (
                      <button
                        key={s}
                        onClick={() => statusMut.mutate({ id: ticket.id, status: s })}
                        disabled={statusMut.isPending || ticket.status === s}
                        className={cn(
                          'rounded-lg border px-3 py-1.5 text-xs font-medium capitalize transition',
                          ticket.status === s
                            ? 'border-brand-500/50 bg-brand-500/20 text-brand-400'
                            : 'border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white',
                          'disabled:cursor-default'
                        )}
                      >
                        {statusMut.isPending && statusMut.variables?.status === s ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          s
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Message thread */}
                <div className="max-h-[480px] space-y-4 overflow-y-auto p-6">
                  {messages.length === 0 ? (
                    <p className="py-6 text-center text-white/40">No messages yet</p>
                  ) : (
                    messages.map((m, i) => {
                      const isAdmin = m.author_role === 'admin'
                      return (
                        <div
                          key={i}
                          className={cn('flex', isAdmin ? 'justify-end' : 'justify-start')}
                        >
                          <div
                            className={cn(
                              'max-w-[85%] rounded-xl border p-4',
                              isAdmin
                                ? 'border-brand-500/30 bg-brand-500/10'
                                : 'border-white/10 bg-white/5'
                            )}
                          >
                            <div className="mb-2 flex items-center gap-2 text-xs text-white/40">
                              {isAdmin ? (
                                <ShieldCheck className="text-brand-400 h-3.5 w-3.5" />
                              ) : (
                                <User className="h-3.5 w-3.5" />
                              )}
                              <span className="font-medium capitalize">
                                {isAdmin ? 'Support Team' : m.author_role || 'requester'}
                              </span>
                              <span>·</span>
                              <span>
                                {m.created_at ? new Date(m.created_at).toLocaleString() : ''}
                              </span>
                            </div>
                            <p className="whitespace-pre-wrap text-sm text-white/80">{m.body}</p>
                          </div>
                        </div>
                      )
                    })
                  )}
                </div>

                {/* Reply box */}
                <div className="border-t border-white/10 p-4">
                  <textarea
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    placeholder="Write a reply..."
                    rows={3}
                    className="focus:ring-brand-500/50 w-full resize-none rounded-lg border border-white/10 bg-white/5 p-3 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2"
                  />
                  <div className="mt-2 flex justify-end">
                    <button
                      onClick={handleSend}
                      disabled={!reply.trim() || replyMut.isPending}
                      className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
                    >
                      {replyMut.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                      Send Reply
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
