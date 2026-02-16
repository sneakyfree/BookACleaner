'use client'

/**
 * TierBadge — P7
 * Displays the cleaner verification tier as a color-coded badge with icon
 */
import { Shield, Star, Award, Crown, Gem } from 'lucide-react'
import { cn } from '@/lib/utils'

interface TierBadgeProps {
    tier: number
    size?: 'sm' | 'md' | 'lg'
    showLabel?: boolean
}

const TIER_CONFIG = [
    { name: 'Starter', icon: Shield, color: 'bg-gray-500/20 text-gray-400 border-gray-500/30' },
    { name: 'Verified', icon: Star, color: 'bg-blue-500/20 text-blue-400 border-blue-500/30' },
    { name: 'Professional', icon: Award, color: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30' },
    { name: 'Certified', icon: Crown, color: 'bg-amber-500/20 text-amber-400 border-amber-500/30' },
    { name: 'Elite', icon: Gem, color: 'bg-purple-500/20 text-purple-400 border-purple-500/30' },
]

const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs gap-1',
    md: 'px-2.5 py-1 text-sm gap-1.5',
    lg: 'px-3 py-1.5 text-sm gap-2',
}

const iconSize = { sm: 'w-3 h-3', md: 'w-3.5 h-3.5', lg: 'w-4 h-4' }

export function TierBadge({ tier, size = 'md', showLabel = true }: TierBadgeProps) {
    const t = TIER_CONFIG[Math.max(0, Math.min(tier - 1, 4))]
    const Icon = t.icon

    return (
        <span className={cn(
            'inline-flex items-center rounded-full border font-medium',
            t.color,
            sizeClasses[size]
        )}>
            <Icon className={iconSize[size]} />
            {showLabel && t.name}
        </span>
    )
}
