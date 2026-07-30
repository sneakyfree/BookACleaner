'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'

interface Badge {
  name: string
  description: string
  icon_url: string
  awarded_at?: string
  awarded_reason?: string
}

interface BadgeDisplayProps {
  badges: Badge[]
  size?: 'sm' | 'md' | 'lg'
  showEmpty?: boolean
  maxShow?: number
  className?: string
}

const sizeMap = {
  sm: 'w-8 h-8',
  md: 'w-10 h-10',
  lg: 'w-14 h-14',
}

const textSizeMap = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
}

/**
 * Display earned badges with tooltips and shimmer animation for newly awarded.
 */
export function BadgeDisplay({
  badges,
  size = 'md',
  showEmpty = false,
  maxShow = 8,
  className,
}: BadgeDisplayProps) {
  const [failedIcons, setFailedIcons] = useState<Record<string, boolean>>({})

  if (!badges?.length && !showEmpty) return null

  const visibleBadges = badges?.slice(0, maxShow) || []
  const overflow = (badges?.length || 0) - maxShow

  return (
    <div className={cn('flex flex-wrap gap-2', className)}>
      {visibleBadges.map((badge, i) => {
        const isNew =
          badge.awarded_at &&
          Date.now() - new Date(badge.awarded_at).getTime() < 7 * 24 * 60 * 60 * 1000

        return (
          <div key={i} className="group relative">
            <div
              className={cn(
                'from-brand-50 to-accent-50 dark:from-brand-500/20 dark:to-accent-500/20 border-brand-200/50 dark:border-brand-500/30 flex cursor-help items-center justify-center rounded-xl border bg-gradient-to-br transition-transform hover:scale-110',
                sizeMap[size],
                isNew && 'ring-brand-500/50 animate-pulse ring-2'
              )}
            >
              {/* Fallback is driven by state, not by mutating the
                                DOM from onError. The previous version hid the
                                initial whenever icon_url was set — and it is
                                always set — so a missing asset rendered a broken
                                image with nothing behind it. */}
              {badge.icon_url && !failedIcons[badge.name] ? (
                <img
                  src={badge.icon_url}
                  alt={badge.name}
                  className={cn('object-contain p-1.5', sizeMap[size])}
                  onError={() => setFailedIcons((prev) => ({ ...prev, [badge.name]: true }))}
                />
              ) : (
                <span
                  className={cn('text-brand-600 dark:text-brand-400 font-bold', textSizeMap[size])}
                >
                  {badge.name.charAt(0)}
                </span>
              )}
            </div>

            {/* Tooltip */}
            <div className="pointer-events-none absolute bottom-full left-1/2 z-50 mb-2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-slate-900 px-3 py-2 text-xs text-white opacity-0 shadow-lg transition-opacity group-hover:opacity-100 dark:bg-slate-100 dark:text-slate-900">
              <p className="font-semibold">{badge.name}</p>
              <p className="text-slate-300 dark:text-slate-600">{badge.description}</p>
              {isNew && (
                <p className="text-brand-400 dark:text-brand-600 mt-0.5">✨ Newly earned!</p>
              )}
              <div className="absolute left-1/2 top-full -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-100" />
            </div>
          </div>
        )
      })}

      {overflow > 0 && (
        <div
          className={cn(
            'bg-muted text-muted-foreground border-border flex items-center justify-center rounded-xl border font-medium',
            sizeMap[size],
            textSizeMap[size]
          )}
        >
          +{overflow}
        </div>
      )}

      {showEmpty && (!badges || badges.length === 0) && (
        <p className="text-muted-foreground text-sm italic">
          No badges earned yet. Complete jobs and build your reputation to earn badges!
        </p>
      )}
    </div>
  )
}

export default BadgeDisplay
