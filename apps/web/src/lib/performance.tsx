'use client'

import React, { Suspense, lazy, ComponentType, useState, useEffect } from 'react'
import { Spinner } from '@/components/ui/loading'

/**
 * Performance Optimization Utilities
 * Lazy loading, code splitting, and performance monitoring
 */

// ============================================
// Lazy Component Wrapper
// ============================================

interface LazyComponentOptions {
    fallback?: React.ReactNode
    delay?: number
    onLoad?: () => void
}

/**
 * Create a lazy-loaded component with custom fallback
 */
export function lazyLoad<T extends ComponentType<any>>(
    importFn: () => Promise<{ default: T }>,
    options: LazyComponentOptions = {}
) {
    const LazyComponent = lazy(importFn)

    const { fallback = <LoadingFallback />, delay = 0, onLoad } = options

    return function LazyWrapper(props: React.ComponentProps<T>) {
        const [showFallback, setShowFallback] = useState(delay > 0)

        useEffect(() => {
            if (delay > 0) {
                const timer = setTimeout(() => setShowFallback(false), delay)
                return () => clearTimeout(timer)
            }
            return undefined
        }, [])

        useEffect(() => {
            onLoad?.()
        }, [])

        if (showFallback) {
            return <>{fallback}</>
        }

        return (
            <Suspense fallback={fallback}>
                <LazyComponent {...props} />
            </Suspense>
        )
    }
}

function LoadingFallback() {
    return (
        <div className="flex items-center justify-center p-8">
            <Spinner size="lg" label="Loading component..." />
        </div>
    )
}

// ============================================
// Image Lazy Loading
// ============================================

interface LazyImageProps {
    src: string
    alt: string
    className?: string
    width?: number
    height?: number
    placeholder?: 'blur' | 'empty'
    priority?: boolean
}

export function LazyImage({
    src,
    alt,
    className,
    width,
    height,
    placeholder = 'empty',
    priority = false,
}: LazyImageProps) {
    const [loaded, setLoaded] = useState(false)
    const [error, setError] = useState(false)

    return (
        <div className={className} style={{ width, height }}>
            {!loaded && !error && placeholder === 'blur' && (
                <div className="absolute inset-0 bg-white/5 animate-pulse rounded" />
            )}
            <img
                src={src}
                alt={alt}
                width={width}
                height={height}
                loading={priority ? 'eager' : 'lazy'}
                onLoad={() => setLoaded(true)}
                onError={() => setError(true)}
                className={`transition-opacity duration-300 ${loaded ? 'opacity-100' : 'opacity-0'}`}
            />
            {error && (
                <div className="flex items-center justify-center bg-white/5 text-white/40 text-sm">
                    Failed to load image
                </div>
            )}
        </div>
    )
}

// ============================================
// Intersection Observer Hook
// ============================================

interface UseIntersectionObserverOptions {
    threshold?: number
    rootMargin?: string
    triggerOnce?: boolean
}

export function useIntersectionObserver(
    options: UseIntersectionObserverOptions = {}
) {
    const { threshold = 0, rootMargin = '0px', triggerOnce = true } = options
    const [ref, setRef] = useState<HTMLElement | null>(null)
    const [isIntersecting, setIsIntersecting] = useState(false)

    useEffect(() => {
        if (!ref) return

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsIntersecting(true)
                    if (triggerOnce) {
                        observer.disconnect()
                    }
                } else if (!triggerOnce) {
                    setIsIntersecting(false)
                }
            },
            { threshold, rootMargin }
        )

        observer.observe(ref)

        return () => observer.disconnect()
    }, [ref, threshold, rootMargin, triggerOnce])

    return { ref: setRef, isIntersecting }
}

// ============================================
// Virtualized List Component
// ============================================

interface VirtualizedListProps<T> {
    items: T[]
    itemHeight: number
    containerHeight: number
    renderItem: (item: T, index: number) => React.ReactNode
    overscan?: number
}

export function VirtualizedList<T>({
    items,
    itemHeight,
    containerHeight,
    renderItem,
    overscan = 3,
}: VirtualizedListProps<T>) {
    const [scrollTop, setScrollTop] = useState(0)

    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
        items.length - 1,
        Math.floor((scrollTop + containerHeight) / itemHeight) + overscan
    )

    const visibleItems = items.slice(startIndex, endIndex + 1)
    const totalHeight = items.length * itemHeight
    const offsetY = startIndex * itemHeight

    return (
        <div
            style={{ height: containerHeight, overflow: 'auto' }}
            onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}
        >
            <div style={{ height: totalHeight, position: 'relative' }}>
                <div style={{ transform: `translateY(${offsetY}px)` }}>
                    {visibleItems.map((item, index) => (
                        <div key={startIndex + index} style={{ height: itemHeight }}>
                            {renderItem(item, startIndex + index)}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}

// ============================================
// Debounce Hook
// ============================================

export function useDebounce<T>(value: T, delay: number): T {
    const [debouncedValue, setDebouncedValue] = useState(value)

    useEffect(() => {
        const timer = setTimeout(() => setDebouncedValue(value), delay)
        return () => clearTimeout(timer)
    }, [value, delay])

    return debouncedValue
}

// ============================================
// Throttle Hook
// ============================================

export function useThrottle<T>(value: T, limit: number): T {
    const [throttledValue, setThrottledValue] = useState(value)
    const lastRan = React.useRef(Date.now())

    useEffect(() => {
        const handler = setTimeout(() => {
            if (Date.now() - lastRan.current >= limit) {
                setThrottledValue(value)
                lastRan.current = Date.now()
            }
        }, limit - (Date.now() - lastRan.current))

        return () => clearTimeout(handler)
    }, [value, limit])

    return throttledValue
}

// ============================================
// Performance Monitoring
// ============================================

interface PerformanceMetrics {
    fcp: number | null
    lcp: number | null
    fid: number | null
    cls: number | null
    ttfb: number | null
}

export function usePerformanceMetrics(): PerformanceMetrics {
    const [metrics, setMetrics] = useState<PerformanceMetrics>({
        fcp: null,
        lcp: null,
        fid: null,
        cls: null,
        ttfb: null,
    })

    useEffect(() => {
        // First Contentful Paint
        const fcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const fcp = entries.find((e) => e.name === 'first-contentful-paint')
            if (fcp) {
                setMetrics((m) => ({ ...m, fcp: fcp.startTime }))
            }
        })
        fcpObserver.observe({ entryTypes: ['paint'] })

        // Largest Contentful Paint
        const lcpObserver = new PerformanceObserver((list) => {
            const entries = list.getEntries()
            const lcp = entries[entries.length - 1]
            if (lcp) {
                setMetrics((m) => ({ ...m, lcp: lcp.startTime }))
            }
        })
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] })

        // Time to First Byte
        const navEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
        if (navEntries.length > 0) {
            setMetrics((m) => ({ ...m, ttfb: navEntries[0].responseStart }))
        }

        return () => {
            fcpObserver.disconnect()
            lcpObserver.disconnect()
        }
    }, [])

    return metrics
}

// ============================================
// Prefetch Link
// ============================================

interface PrefetchLinkProps {
    href: string
    children: React.ReactNode
    className?: string
}

export function PrefetchLink({ href, children, className }: PrefetchLinkProps) {
    const [prefetched, setPrefetched] = useState(false)

    const handleMouseEnter = () => {
        if (!prefetched) {
            const link = document.createElement('link')
            link.rel = 'prefetch'
            link.href = href
            document.head.appendChild(link)
            setPrefetched(true)
        }
    }

    return (
        <a
            href={href}
            className={className}
            onMouseEnter={handleMouseEnter}
            onFocus={handleMouseEnter}
        >
            {children}
        </a>
    )
}
