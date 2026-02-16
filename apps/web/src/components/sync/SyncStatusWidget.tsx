'use client'

import { Calendar, RefreshCw, CheckCircle2, AlertCircle, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * iCal Sync Status Widget — P5
 * Shows sync status on property cards/detail pages
 */

interface SyncStatusProps {
    lastSync?: string
    nextSync?: string
    status: 'synced' | 'syncing' | 'error' | 'not_configured'
    source?: string
}

const statusConfig = {
    synced: { icon: CheckCircle2, label: 'Synced', color: 'text-green-400', bg: 'bg-green-500/10' },
    syncing: { icon: RefreshCw, label: 'Syncing…', color: 'text-blue-400', bg: 'bg-blue-500/10' },
    error: { icon: AlertCircle, label: 'Sync Error', color: 'text-red-400', bg: 'bg-red-500/10' },
    not_configured: { icon: Calendar, label: 'Not Set Up', color: 'text-white/40', bg: 'bg-white/5' },
}

export function SyncStatusWidget({ lastSync, nextSync, status, source }: SyncStatusProps) {
    const cfg = statusConfig[status]
    const Icon = cfg.icon

    return (
        <div className={cn('rounded-lg border border-white/10 p-3', cfg.bg)}>
            <div className="flex items-center gap-2 mb-2">
                <Icon className={cn('w-4 h-4', cfg.color, status === 'syncing' && 'animate-spin')} />
                <span className={cn('text-sm font-medium', cfg.color)}>{cfg.label}</span>
                {source && <span className="text-white/30 text-xs ml-auto">{source}</span>}
            </div>
            {lastSync && (
                <p className="text-white/50 text-xs flex items-center gap-1">
                    <Clock className="w-3 h-3" /> Last: {new Date(lastSync).toLocaleString()}
                </p>
            )}
            {nextSync && (
                <p className="text-white/50 text-xs flex items-center gap-1 mt-0.5">
                    <RefreshCw className="w-3 h-3" /> Next: {new Date(nextSync).toLocaleString()}
                </p>
            )}
        </div>
    )
}
