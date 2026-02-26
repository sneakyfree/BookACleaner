'use client'

/**
 * Skeleton Card — animated shimmer loading placeholder
 * Usage: <SkeletonCard lines={3} />
 */

interface SkeletonCardProps {
    lines?: number
    showAvatar?: boolean
    className?: string
}

export function SkeletonCard({ lines = 3, showAvatar = false, className = '' }: SkeletonCardProps) {
    return (
        <div className={`p-5 rounded-xl border bg-card animate-pulse ${className}`}>
            {showAvatar && (
                <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-700" />
                    <div className="flex-1 space-y-2">
                        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-1/3" />
                        <div className="h-3 bg-gray-200 dark:bg-gray-700 rounded w-1/4" />
                    </div>
                </div>
            )}
            <div className="space-y-3">
                {Array.from({ length: lines }).map((_, i) => (
                    <div
                        key={i}
                        className="h-3.5 bg-gray-200 dark:bg-gray-700 rounded"
                        style={{ width: `${85 - i * 15}%` }}
                    />
                ))}
            </div>
        </div>
    )
}

export default SkeletonCard
