'use client'

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
                                'rounded-xl flex items-center justify-center bg-gradient-to-br from-brand-50 to-accent-50 dark:from-brand-500/20 dark:to-accent-500/20 border border-brand-200/50 dark:border-brand-500/30 transition-transform hover:scale-110 cursor-help',
                                sizeMap[size],
                                isNew && 'animate-pulse ring-2 ring-brand-500/50'
                            )}
                        >
                            {badge.icon_url ? (
                                <img
                                    src={badge.icon_url}
                                    alt={badge.name}
                                    className={cn('object-contain p-1.5', sizeMap[size])}
                                    onError={(e) => {
                                        ; (e.target as HTMLImageElement).style.display = 'none'
                                            ; (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden')
                                    }}
                                />
                            ) : null}
                            <span className={cn('font-bold text-brand-600 dark:text-brand-400', !badge.icon_url ? '' : 'hidden', textSizeMap[size])}>
                                {badge.name.charAt(0)}
                            </span>
                        </div>

                        {/* Tooltip */}
                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50 shadow-lg">
                            <p className="font-semibold">{badge.name}</p>
                            <p className="text-slate-300 dark:text-slate-600">{badge.description}</p>
                            {isNew && (
                                <p className="text-brand-400 dark:text-brand-600 mt-0.5">✨ Newly earned!</p>
                            )}
                            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-900 dark:border-t-slate-100" />
                        </div>
                    </div>
                )
            })}

            {overflow > 0 && (
                <div
                    className={cn(
                        'rounded-xl flex items-center justify-center bg-muted text-muted-foreground font-medium border border-border',
                        sizeMap[size],
                        textSizeMap[size]
                    )}
                >
                    +{overflow}
                </div>
            )}

            {showEmpty && (!badges || badges.length === 0) && (
                <p className="text-sm text-muted-foreground italic">
                    No badges earned yet. Complete jobs and build your reputation to earn badges!
                </p>
            )}
        </div>
    )
}

export default BadgeDisplay
