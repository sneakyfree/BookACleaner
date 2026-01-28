import { cn } from '@/lib/utils'

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
    /**
     * Animation variant
     */
    variant?: 'pulse' | 'shimmer'
}

/**
 * Base Skeleton component for loading states
 */
function Skeleton({
    className,
    variant = 'pulse',
    ...props
}: SkeletonProps) {
    return (
        <div
            className={cn(
                'rounded-md bg-white/10',
                variant === 'pulse' && 'animate-pulse',
                variant === 'shimmer' && 'animate-shimmer bg-gradient-to-r from-white/5 via-white/10 to-white/5 bg-[length:200%_100%]',
                className
            )}
            {...props}
        />
    )
}

/**
 * Card skeleton for dashboard cards
 */
function SkeletonCard({ className }: { className?: string }) {
    return (
        <div className={cn('p-6 rounded-xl bg-white/5 border border-white/10', className)}>
            <div className="flex items-center justify-between mb-4">
                <Skeleton className="h-4 w-24" />
                <Skeleton className="h-8 w-8 rounded-full" />
            </div>
            <Skeleton className="h-8 w-20 mb-2" />
            <Skeleton className="h-3 w-32" />
        </div>
    )
}

/**
 * Table skeleton for data tables
 */
function SkeletonTable({ rows = 5, columns = 4 }: { rows?: number; columns?: number }) {
    return (
        <div className="rounded-lg border border-white/10 overflow-hidden">
            {/* Header */}
            <div className="flex gap-4 p-4 bg-white/5 border-b border-white/10">
                {Array.from({ length: columns }).map((_, i) => (
                    <Skeleton key={i} className="h-4 flex-1" />
                ))}
            </div>
            {/* Rows */}
            {Array.from({ length: rows }).map((_, rowIdx) => (
                <div key={rowIdx} className="flex gap-4 p-4 border-b border-white/5 last:border-0">
                    {Array.from({ length: columns }).map((_, colIdx) => (
                        <Skeleton key={colIdx} className="h-4 flex-1" />
                    ))}
                </div>
            ))}
        </div>
    )
}

/**
 * List item skeleton
 */
function SkeletonListItem({ withAvatar = true }: { withAvatar?: boolean }) {
    return (
        <div className="flex items-center gap-4 p-4">
            {withAvatar && <Skeleton className="h-12 w-12 rounded-full flex-shrink-0" />}
            <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
            </div>
            <Skeleton className="h-8 w-20 rounded-md" />
        </div>
    )
}

/**
 * Form field skeleton
 */
function SkeletonInput({ label = true }: { label?: boolean }) {
    return (
        <div className="space-y-2">
            {label && <Skeleton className="h-4 w-24" />}
            <Skeleton className="h-10 w-full rounded-md" />
        </div>
    )
}

/**
 * Dashboard skeleton - complete page loading state
 */
function SkeletonDashboard() {
    return (
        <div className="space-y-8 p-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="space-y-2">
                    <Skeleton className="h-8 w-48" />
                    <Skeleton className="h-4 w-64" />
                </div>
                <Skeleton className="h-10 w-32 rounded-md" />
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {Array.from({ length: 4 }).map((_, i) => (
                    <SkeletonCard key={i} />
                ))}
            </div>

            {/* Content */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2">
                    <SkeletonTable rows={5} columns={4} />
                </div>
                <div className="space-y-4">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <SkeletonListItem key={i} />
                    ))}
                </div>
            </div>
        </div>
    )
}

/**
 * Booking wizard skeleton
 */
function SkeletonBookingWizard() {
    return (
        <div className="max-w-2xl mx-auto p-6 space-y-8">
            {/* Progress bar */}
            <div className="flex items-center gap-2">
                {Array.from({ length: 5 }).map((_, i) => (
                    <Skeleton key={i} className="h-2 flex-1 rounded-full" />
                ))}
            </div>

            {/* Title */}
            <div className="text-center space-y-2">
                <Skeleton className="h-8 w-48 mx-auto" />
                <Skeleton className="h-4 w-64 mx-auto" />
            </div>

            {/* Form */}
            <div className="space-y-6">
                {Array.from({ length: 3 }).map((_, i) => (
                    <SkeletonInput key={i} />
                ))}
            </div>

            {/* Actions */}
            <div className="flex justify-between pt-4">
                <Skeleton className="h-10 w-24 rounded-md" />
                <Skeleton className="h-10 w-32 rounded-md" />
            </div>
        </div>
    )
}

export {
    Skeleton,
    SkeletonCard,
    SkeletonTable,
    SkeletonListItem,
    SkeletonInput,
    SkeletonDashboard,
    SkeletonBookingWizard,
}
