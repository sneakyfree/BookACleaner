'use client'

import { useState } from 'react'
import {
    Bell, Check, CheckCheck, Mail, Calendar, DollarSign, Star,
    ShieldCheck, AlertTriangle, Loader2, AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useNotifications, useMarkNotificationRead, useMarkAllNotificationsRead } from '@/hooks/use-api'

interface Notification {
    id: string
    type: string
    title: string
    message: string
    is_read: boolean
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
    const unreadCount = notifications.filter(n => !n.is_read).length

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
    const grouped = notifications.reduce((acc, n) => {
        const date = new Date(n.created_at).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
        if (!acc[date]) acc[date] = []
        acc[date].push(n)
        return acc
    }, {} as Record<string, Notification[]>)

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 p-6">
            <div className="max-w-3xl mx-auto">
                <div className="flex items-center justify-between mb-8">
                    <div>
                        <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                            <Bell className="w-7 h-7 text-brand-400" />
                            Notifications
                        </h1>
                        <p className="text-white/60 mt-1">
                            {unreadCount > 0 ? `${unreadCount} unread` : 'All caught up!'}
                        </p>
                    </div>
                    {unreadCount > 0 && (
                        <button onClick={markAllRead}
                            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2">
                            <CheckCheck className="w-4 h-4" /> Mark all read
                        </button>
                    )}
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-lg flex items-center gap-3">
                        <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                        <p className="text-red-300 text-sm">{(error as any)?.detail || 'Failed to load notifications'}</p>
                        <button onClick={() => refetch()} className="ml-auto text-red-400 hover:text-red-300 text-sm font-medium">Retry</button>
                    </div>
                )}

                {loading ? (
                    <div className="flex items-center justify-center py-20">
                        <Loader2 className="w-8 h-8 animate-spin text-brand-400" />
                        <span className="ml-3 text-white/60">Loading notifications...</span>
                    </div>
                ) : notifications.length === 0 ? (
                    <div className="py-20 text-center text-white/40">
                        <Bell className="w-12 h-12 mx-auto mb-3 opacity-40" />
                        <p>No notifications yet</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {Object.entries(grouped).map(([date, items]) => (
                            <div key={date}>
                                <h3 className="text-white/40 text-sm font-medium mb-3">{date}</h3>
                                <div className="space-y-2">
                                    {items.map(n => {
                                        const Icon = typeIcons[n.type] || Bell
                                        return (
                                            <button
                                                key={n.id}
                                                onClick={() => !n.is_read && markAsRead(n.id)}
                                                className={cn(
                                                    'w-full text-left bg-white/5 rounded-xl border p-4 transition-all hover:bg-white/[0.08] flex items-start gap-4',
                                                    !n.is_read ? 'border-brand-500/30' : 'border-white/5 opacity-70'
                                                )}
                                            >
                                                <div className={cn('w-10 h-10 rounded-full flex items-center justify-center shrink-0', typeColors[n.type] || 'bg-white/10 text-white/60')}>
                                                    <Icon className="w-5 h-5" />
                                                </div>
                                                <div className="flex-1 min-w-0">
                                                    <div className="flex items-center justify-between mb-1">
                                                        <p className="text-white font-medium text-sm">{n.title}</p>
                                                        <span className="text-white/30 text-xs shrink-0 ml-2">{formatDate(n.created_at)}</span>
                                                    </div>
                                                    <p className="text-white/50 text-sm">{n.message}</p>
                                                </div>
                                                {!n.is_read && (
                                                    <div className="w-2.5 h-2.5 rounded-full bg-brand-500 shrink-0 mt-2" />
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
