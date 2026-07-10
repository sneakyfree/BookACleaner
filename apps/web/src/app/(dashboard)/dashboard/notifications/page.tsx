'use client'

import { useState } from 'react'
import {
  Bell,
  Check,
  CheckCheck,
  Mail,
  Calendar,
  DollarSign,
  Star,
  ShieldCheck,
  AlertTriangle,
  Loader2,
  AlertCircle,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  useNotifications,
  useMarkNotificationRead,
  useMarkAllNotificationsRead,
} from '@/hooks/use-api'

interface Notification {
  id: string
  type: string
  title: string
  message: string
  read: boolean
  created_at: string
  data?: Record<string, any>
}

const typeIcons: Record<string, typeof Bell> = {
  booking: Calendar,
  payment: DollarSign,
  review: Star,
  verification: ShieldCheck,
  message: Mail,
  alert: AlertTriangle,
}

const typeColors: Record<string, string> = {
  booking: 'bg-blue-500/20 text-blue-400',
  payment: 'bg-green-500/20 text-green-400',
  review: 'bg-amber-500/20 text-amber-400',
  verification: 'bg-purple-500/20 text-purple-400',
  message: 'bg-cyan-500/20 text-cyan-400',
  alert: 'bg-red-500/20 text-red-400',
}

export default function NotificationsPage() {
  const { data: rawData, isLoading: loading, error, refetch } = useNotifications()
  const markReadMut = useMarkNotificationRead()
  const markAllReadMut = useMarkAllNotificationsRead()

  const notifications: Notification[] = rawData?.notifications || rawData?.items || rawData || []
  const unreadCount = notifications.filter((n) => !n.read).length

  const markAsRead = (id: string) => markReadMut.mutate(id)
  const markAllRead = () => markAllReadMut.mutate()

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr)
    const now = new Date()
    const diff = now.getTime() - date.getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    if (hours < 24) return `${hours}h ago`
    const days = Math.floor(hours / 24)
    if (days === 1) return 'Yesterday'
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  // Group by date
  const grouped = notifications.reduce(
    (acc, n) => {
      const date = new Date(n.created_at).toLocaleDateString('en-US', {
        month: 'long',
        day: 'numeric',
        year: 'numeric',
      })
      if (!acc[date]) acc[date] = []
      acc[date].push(n)
      return acc
    },
    {} as Record<string, Notification[]>
  )

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between">
          <div>
            <h1 className="flex items-center gap-3 text-2xl font-bold text-white">
              <Bell className="text-brand-400 h-7 w-7" />
              Notifications
            </h1>
            <p className="mt-1 text-white/60">
              {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
            </p>
          </div>
          {unreadCount > 0 && (
            <button
              onClick={markAllRead}
              className="flex items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-white/20"
            >
              <CheckCheck className="h-4 w-4" /> Mark all read
            </button>
          )}
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 p-4">
            <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
            <p className="text-sm text-red-300">
              {(error as any)?.detail || 'Failed to load notifications'}
            </p>
            <button
              onClick={() => refetch()}
              className="ml-auto text-sm font-medium text-red-400 hover:text-red-300"
            >
              Retry
            </button>
          </div>
        )}

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="text-brand-400 h-8 w-8 animate-spin" />
            <span className="ml-3 text-white/60">Loading notifications...</span>
          </div>
        ) : notifications.length === 0 ? (
          <div className="py-20 text-center text-white/40">
            <Bell className="mx-auto mb-3 h-12 w-12 opacity-40" />
            <p>No notifications yet</p>
          </div>
        ) : (
          <div className="space-y-6">
            {Object.entries(grouped).map(([date, items]) => (
              <div key={date}>
                <h3 className="mb-3 text-sm font-medium text-white/40">{date}</h3>
                <div className="space-y-2">
                  {items.map((n) => {
                    const Icon = typeIcons[n.type] || Bell
                    return (
                      <button
                        key={n.id}
                        onClick={() => !n.read && markAsRead(n.id)}
                        className={cn(
                          'flex w-full items-start gap-4 rounded-xl border bg-white/5 p-4 text-left transition-all hover:bg-white/[0.08]',
                          !n.read ? 'border-brand-500/30' : 'border-white/5 opacity-70'
                        )}
                      >
                        <div
                          className={cn(
                            'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
                            typeColors[n.type] || 'bg-white/10 text-white/60'
                          )}
                        >
                          <Icon className="h-5 w-5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="mb-1 flex items-center justify-between">
                            <p className="text-sm font-medium text-white">{n.title}</p>
                            <span className="ml-2 shrink-0 text-xs text-white/30">
                              {formatDate(n.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-white/50">{n.message}</p>
                        </div>
                        {!n.read && (
                          <div className="bg-brand-500 mt-2 h-2.5 w-2.5 shrink-0 rounded-full" />
                        )}
                      </button>
                    )
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
