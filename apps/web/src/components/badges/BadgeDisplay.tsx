'use client'

import { useState, useEffect } from 'react'
import { Award, Shield, Star, Zap, Crown } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

interface Badge {
    id: string
    name: string
    description: string
    icon: string
    tier: string
    awarded_at: string
}

const BADGE_ICONS: Record<string, any> = {
    award: Award,
    shield: Shield,
    star: Star,
    zap: Zap,
    crown: Crown,
}

const TIER_COLORS: Record<string, string> = {
    bronze: 'from-amber-600 to-amber-800',
    silver: 'from-gray-400 to-gray-600',
    gold: 'from-yellow-400 to-amber-500',
    platinum: 'from-indigo-400 to-purple-500',
}

interface BadgeDisplayProps {
    badges: Badge[]
    size?: 'sm' | 'md'
}

export function BadgeDisplay({ badges, size = 'md' }: BadgeDisplayProps) {
    const [hoveredBadge, setHoveredBadge] = useState<string | null>(null)

    if (!badges || badges.length === 0) return null

    const iconSize = size === 'sm' ? 'w-3.5 h-3.5' : 'w-4 h-4'
    const badgeSize = size === 'sm' ? 'w-7 h-7' : 'w-9 h-9'

    return (
        <div className="flex flex-wrap gap-2">
            {badges.map(badge => {
                const IconComponent = BADGE_ICONS[badge.icon] || Award
                const tierColor = TIER_COLORS[badge.tier] || TIER_COLORS.bronze
                const isHovered = hoveredBadge === badge.id

                return (
                    <div key={badge.id} className="relative group">
                        <button
                            onMouseEnter={() => setHoveredBadge(badge.id)}
                            onMouseLeave={() => setHoveredBadge(null)}
                            className={`${badgeSize} rounded-full bg-gradient-to-br ${tierColor} flex items-center justify-center shadow-sm ring-2 ring-white dark:ring-gray-900 transition-transform ${isHovered ? 'scale-110' : ''}`}
                        >
                            <IconComponent className={`${iconSize} text-white`} />
                        </button>

                        {/* Tooltip */}
                        {isHovered && (
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-48 p-2.5 bg-gray-900 dark:bg-gray-800 text-white rounded-lg shadow-xl text-xs z-50 pointer-events-none">
                                <p className="font-semibold mb-0.5">{badge.name}</p>
                                <p className="text-gray-300 text-[11px] leading-tight">{badge.description}</p>
                                <p className="text-gray-500 text-[10px] mt-1">
                                    Earned {new Date(badge.awarded_at).toLocaleDateString()}
                                </p>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-px border-4 border-transparent border-t-gray-900 dark:border-t-gray-800" />
                            </div>
                        )}
                    </div>
                )
            })}
        </div>
    )
}

export default BadgeDisplay
