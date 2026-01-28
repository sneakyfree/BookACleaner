'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * Loading States and Progress Indicators
 * Various loading patterns for different use cases
 */

// ============================================
// Spinner Component
// ============================================

interface SpinnerProps {
    size?: 'sm' | 'md' | 'lg' | 'xl'
    className?: string
    label?: string
}

const spinnerSizes = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
}

export function Spinner({ size = 'md', className, label = 'Loading' }: SpinnerProps) {
    return (
        <div role="status" aria-label={label}>
            <Loader2
                className={cn('animate-spin text-brand-400', spinnerSizes[size], className)}
            />
            <span className="sr-only">{label}</span>
        </div>
    )
}

// ============================================
// Full Page Loader
// ============================================

interface FullPageLoaderProps {
    message?: string
    submessage?: string
}

export function FullPageLoader({ message = 'Loading...', submessage }: FullPageLoaderProps) {
    return (
        <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-900/90 backdrop-blur-sm">
            <div className="relative">
                {/* Animated rings */}
                <div className="absolute inset-0 rounded-full border-4 border-brand-500/20 animate-ping" />
                <div className="absolute inset-0 rounded-full border-4 border-t-brand-500 animate-spin" />

                {/* Logo */}
                <div className="w-16 h-16 rounded-full bg-brand-500/20 flex items-center justify-center">
                    <span className="text-2xl font-bold text-brand-400">B</span>
                </div>
            </div>

            <p className="mt-6 text-white font-medium">{message}</p>
            {submessage && (
                <p className="mt-1 text-white/50 text-sm">{submessage}</p>
            )}
        </div>
    )
}

// ============================================
// Inline Loader
// ============================================

interface InlineLoaderProps {
    text?: string
    className?: string
}

export function InlineLoader({ text = 'Loading...', className }: InlineLoaderProps) {
    return (
        <div className={cn('flex items-center gap-2 text-white/60', className)}>
            <Spinner size="sm" />
            <span className="text-sm">{text}</span>
        </div>
    )
}

// ============================================
// Button Loader
// ============================================

interface ButtonLoaderProps {
    isLoading: boolean
    children: React.ReactNode
    loadingText?: string
}

export function ButtonLoader({ isLoading, children, loadingText = 'Processing...' }: ButtonLoaderProps) {
    if (isLoading) {
        return (
            <span className="flex items-center gap-2">
                <Spinner size="sm" />
                {loadingText}
            </span>
        )
    }
    return <>{children}</>
}

// ============================================
// Progress Bar
// ============================================

interface ProgressBarProps {
    value: number
    max?: number
    showLabel?: boolean
    size?: 'sm' | 'md' | 'lg'
    variant?: 'default' | 'success' | 'warning' | 'error'
    className?: string
}

const progressSizes = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
}

const progressVariants = {
    default: 'bg-brand-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
}

export function ProgressBar({
    value,
    max = 100,
    showLabel = false,
    size = 'md',
    variant = 'default',
    className,
}: ProgressBarProps) {
    const percentage = Math.min(100, Math.max(0, (value / max) * 100))

    return (
        <div className={cn('w-full', className)}>
            <div
                className={cn(
                    'w-full bg-white/10 rounded-full overflow-hidden',
                    progressSizes[size]
                )}
                role="progressbar"
                aria-valuenow={value}
                aria-valuemin={0}
                aria-valuemax={max}
            >
                <div
                    className={cn(
                        'h-full rounded-full transition-all duration-300',
                        progressVariants[variant]
                    )}
                    style={{ width: `${percentage}%` }}
                />
            </div>
            {showLabel && (
                <p className="mt-1 text-xs text-white/50 text-right">{percentage.toFixed(0)}%</p>
            )}
        </div>
    )
}

// ============================================
// Skeleton Pulse
// ============================================

interface SkeletonPulseProps {
    className?: string
    rounded?: 'none' | 'sm' | 'md' | 'lg' | 'full'
}

const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    full: 'rounded-full',
}

export function SkeletonPulse({ className, rounded = 'md' }: SkeletonPulseProps) {
    return (
        <div
            className={cn(
                'animate-pulse bg-white/10',
                roundedClasses[rounded],
                className
            )}
        />
    )
}

// ============================================
// Loading Dots
// ============================================

export function LoadingDots({ className }: { className?: string }) {
    return (
        <span className={cn('inline-flex gap-1', className)}>
            {[0, 1, 2].map((i) => (
                <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-current animate-bounce"
                    style={{ animationDelay: `${i * 150}ms` }}
                />
            ))}
        </span>
    )
}

// ============================================
// Shimmer Effect
// ============================================

interface ShimmerProps {
    className?: string
}

export function Shimmer({ className }: ShimmerProps) {
    return (
        <div
            className={cn(
                'relative overflow-hidden bg-white/5',
                'before:absolute before:inset-0',
                'before:bg-gradient-to-r before:from-transparent before:via-white/10 before:to-transparent',
                'before:animate-shimmer',
                className
            )}
        />
    )
}
