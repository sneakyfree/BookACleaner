'use client'

import { useState } from 'react'
import {
  LifeBuoy,
  Send,
  Loader2,
  AlertCircle,
  MessageSquare,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  User,
  Plus,
} from 'lucide-react'
import { toast } from 'sonner'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { cn } from '@/lib/utils'
import { useMyTickets } from '@/hooks/use-api'
import { api } from '@/lib/api'

interface MyTicket {
  id: string
  subject: string
  category: string
  status: string
  message_count?: number
  created_at: string
}

interface TicketMessage {
  author_role: string
  body: string
  created_at: string
}

const statusColors: Record<string, string> = {
  open: 'bg-green-500/20 text-green-400',
  pending: 'bg-amber-500/20 text-amber-400',
  resolved: 'bg-blue-500/20 text-blue-400',
  closed: 'bg-white/10 text-white/50',
}

const CATEGORIES = [
  { value: 'general', label: 'General question' },
  { value: 'billing', label: 'Billing & payments' },
  { value: 'account', label: 'Account' },
  { value: 'technical', label: 'Technical issue' },
]

export default function SupportPage() {
  const [subject, setSubject] = useState('')
  const [category, setCategory] = useState('general')
  const [message, setMessage] = useState('')
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [reply, setReply] = useState('')

  const { data: ticketsData, isLoading: listLoading, error: listError, refetch } = useMyTickets()
  const queryClient = useQueryClient()

  const tickets: MyTicket[] = ticketsData?.tickets || []

  const { data: threadData, isLoading: threadLoading } = useQuery({
    queryKey: ['support', 'ticket', expandedId],
    queryFn: () => api.support.ticket(expandedId as string),
    enabled: !!expandedId,
  })
  const messages: TicketMessage[] = threadData?.messages || []

  const createMut = useMutation({
    mutationFn: (data: { subject: string; message: string; category: string }) =>
      api.support.createTicket(data),
    onSuccess: () => {
      toast.success('Support request submitted', {
        description: 'Our team will get back to you shortly.',
      })
      setSubject('')
      setMessage('')
      setCategory('general')
      queryClient.invalidateQueries({ queryKey: ['support'] })
    },
    onError: (err: any) => toast.error(err?.detail || 'Failed to submit request'),
  })

  const replyMut = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => api.support.reply(id, body),
    onSuccess: () => {
      setReply('')
      toast.success('Reply sent')
      queryClient.invalidateQueries({ queryKey: ['support'] })
    },
    onError: (err: any) => toast.error(err?.detail || 'Failed to send reply'),
  })

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault()
    if (!subject.trim() || !message.trim()) return
    createMut.mutate({ subject: subject.trim(), message: message.trim(), category })
  }

  const handleReply = (id: string) => {
    if (!reply.trim()) return
    replyMut.mutate({ id, body: reply.trim() })
  }

  const toggleExpanded = (id: string) => {
    setReply('')
    setExpandedId(expandedId === id ? null : id)
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mx-auto max-w-3xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
            <LifeBuoy className="text-brand-400 h-7 w-7" />
            Support
          </h1>
          <p className="mt-1 text-white/60">
            Need a hand? Send us a message and track your requests.
          </p>
        </div>

        {/* New request form */}
        <form
          onSubmit={handleCreate}
          className="mb-8 rounded-xl border border-white/10 bg-white/5 p-6"
        >
          <h2 className="mb-4 flex items-center gap-2 text-lg font-semibold text-white">
            <Plus className="text-brand-400 h-5 w-5" />
            New request
          </h2>
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
            <input
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Subject"
              maxLength={200}
              className="focus:ring-brand-500/50 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white placeholder:text-white/30 focus:outline-none focus:ring-2 sm:col-span-2"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="focus:ring-brand-500/50 cursor-pointer appearance-none rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white focus:outline-none focus:ring-2"
            >
              {CATEGORIES.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Describe your question or issue..."
            rows={4}
            className="focus:ring-brand-500/50 mb-4 w-full resize-none rounded-lg border border-white/10 bg-white/5 p-3 text-white placeholder:text-white/30 focus:outline-none focus:ring-2"
          />
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={!subject.trim() || !message.trim() || createMut.isPending}
              className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium text-white transition disabled:opacity-50"
            >
              {createMut.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Submit Request
            </button>
          </div>
        </form>

        {/* My requests */}
        <h2 className="mb-4 text-lg font-semibold text-white">My requests</h2>

        {listError && (
          <div className="mb-4 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">
              {(listError as any)?.detail || 'Failed to load your requests'}
            </p>
            <button
              onClick={() => refetch()}
              className="ml-auto text-sm font-medium text-red-400 hover:text-red-300"
            >
              Retry
            </button>
          </div>
        )}

        {listLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="text-brand-400 h-6 w-6 animate-spin" />
            <span className="ml-3 text-white/60">Loading your requests...</span>
          </div>
        ) : tickets.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-white/5 py-12 text-center">
            <MessageSquare className="mx-auto mb-3 h-8 w-8 text-white/20" />
            <p className="text-white/40">No support requests yet</p>
          </div>
        ) : (
          <div className="space-y-3">
            {tickets.map((t) => {
              const expanded = expandedId === t.id
              return (
                <div
                  key={t.id}
                  className="overflow-hidden rounded-xl border border-white/10 bg-white/5"
                >
                  <button
                    onClick={() => toggleExpanded(t.id)}
                    className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-white/[0.03]"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-medium text-white">{t.subject}</p>
                      <p className="mt-0.5 text-xs text-white/40">
                        <span className="capitalize">{t.category || 'general'}</span>
                        {' · '}
                        {t.created_at ? new Date(t.created_at).toLocaleDateString() : ''}
                        {typeof t.message_count === 'number' &&
                          ` · ${t.message_count} message${t.message_count === 1 ? '' : 's'}`}
                      </p>
                    </div>
                    <span
                      className={cn(
                        'shrink-0 rounded-full px-2.5 py-1 text-xs font-medium capitalize',
                        statusColors[t.status] || 'bg-white/10 text-white/60'
                      )}
                    >
                      {t.status}
                    </span>
                    {expanded ? (
                      <ChevronUp className="h-4 w-4 shrink-0 text-white/40" />
                    ) : (
                      <ChevronDown className="h-4 w-4 shrink-0 text-white/40" />
                    )}
                  </button>

                  {expanded && (
                    <div className="border-t border-white/10 p-4">
                      {threadLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="text-brand-400 h-5 w-5 animate-spin" />
                          <span className="ml-3 text-sm text-white/60">
                            Loading conversation...
                          </span>
                        </div>
                      ) : (
                        <>
                          <div className="mb-4 max-h-[360px] space-y-3 overflow-y-auto">
                            {messages.length === 0 ? (
                              <p className="py-4 text-center text-sm text-white/40">
                                No messages yet
                              </p>
                            ) : (
                              messages.map((m, i) => {
                                const isSupport = m.author_role === 'admin'
                                return (
                                  <div
                                    key={i}
                                    className={cn(
                                      'flex',
                                      isSupport ? 'justify-start' : 'justify-end'
                                    )}
                                  >
                                    <div
                                      className={cn(
                                        'max-w-[85%] rounded-xl border p-3',
                                        isSupport
                                          ? 'border-brand-500/30 bg-brand-500/10'
                                          : 'border-white/10 bg-white/5'
                                      )}
                                    >
                                      <div className="mb-1.5 flex items-center gap-2 text-xs text-white/40">
                                        {isSupport ? (
                                          <ShieldCheck className="text-brand-400 h-3.5 w-3.5" />
                                        ) : (
                                          <User className="h-3.5 w-3.5" />
                                        )}
                                        <span className="font-medium">
                                          {isSupport ? 'Support Team' : 'You'}
                                        </span>
                                        <span>·</span>
                                        <span>
                                          {m.created_at
                                            ? new Date(m.created_at).toLocaleString()
                                            : ''}
                                        </span>
                                      </div>
                                      <p className="whitespace-pre-wrap text-sm text-white/80">
                                        {m.body}
                                      </p>
                                    </div>
                                  </div>
                                )
                              })
                            )}
                          </div>

                          {t.status !== 'closed' && (
                            <div className="flex gap-2">
                              <input
                                value={reply}
                                onChange={(e) => setReply(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault()
                                    handleReply(t.id)
                                  }
                                }}
                                placeholder="Write a reply..."
                                className="focus:ring-brand-500/50 flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white placeholder:text-white/30 focus:outline-none focus:ring-2"
                              />
                              <button
                                onClick={() => handleReply(t.id)}
                                disabled={!reply.trim() || replyMut.isPending}
                                className="bg-brand-500 hover:bg-brand-600 flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-white transition disabled:opacity-50"
                              >
                                {replyMut.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Send className="h-4 w-4" />
                                )}
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
