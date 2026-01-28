'use client'

import { useEffect, useRef, useCallback } from 'react'

/**
 * Accessibility Utilities
 * Focus management, keyboard navigation, and screen reader announcements
 */

// ============================================
// Focus Trap Hook
// ============================================

interface FocusTrapOptions {
    enabled?: boolean
    returnFocusOnDeactivate?: boolean
}

export function useFocusTrap(options: FocusTrapOptions = {}) {
    const { enabled = true, returnFocusOnDeactivate = true } = options
    const containerRef = useRef<HTMLDivElement>(null)
    const previousFocusRef = useRef<HTMLElement | null>(null)

    useEffect(() => {
        if (!enabled) return

        // Store current focus
        previousFocusRef.current = document.activeElement as HTMLElement

        const container = containerRef.current
        if (!container) return

        // Get all focusable elements
        const getFocusableElements = () => {
            return container.querySelectorAll<HTMLElement>(
                'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
            )
        }

        // Focus first element
        const focusableElements = getFocusableElements()
        if (focusableElements.length > 0) {
            focusableElements[0].focus()
        }

        // Handle keyboard navigation
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key !== 'Tab') return

            const focusable = getFocusableElements()
            if (focusable.length === 0) return

            const first = focusable[0]
            const last = focusable[focusable.length - 1]

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault()
                    last.focus()
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault()
                    first.focus()
                }
            }
        }

        document.addEventListener('keydown', handleKeyDown)

        return () => {
            document.removeEventListener('keydown', handleKeyDown)

            // Return focus
            if (returnFocusOnDeactivate && previousFocusRef.current) {
                previousFocusRef.current.focus()
            }
        }
    }, [enabled, returnFocusOnDeactivate])

    return containerRef
}

// ============================================
// Keyboard Navigation Hook
// ============================================

interface KeyboardNavigationOptions {
    orientation?: 'horizontal' | 'vertical' | 'both'
    loop?: boolean
    onSelect?: (index: number) => void
}

export function useKeyboardNavigation(
    itemCount: number,
    options: KeyboardNavigationOptions = {}
) {
    const { orientation = 'vertical', loop = true, onSelect } = options
    const currentIndexRef = useRef(0)

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent) => {
            let newIndex = currentIndexRef.current
            let handled = false

            const isVertical = orientation === 'vertical' || orientation === 'both'
            const isHorizontal = orientation === 'horizontal' || orientation === 'both'

            if (isVertical && e.key === 'ArrowDown') {
                newIndex = loop
                    ? (currentIndexRef.current + 1) % itemCount
                    : Math.min(currentIndexRef.current + 1, itemCount - 1)
                handled = true
            } else if (isVertical && e.key === 'ArrowUp') {
                newIndex = loop
                    ? (currentIndexRef.current - 1 + itemCount) % itemCount
                    : Math.max(currentIndexRef.current - 1, 0)
                handled = true
            } else if (isHorizontal && e.key === 'ArrowRight') {
                newIndex = loop
                    ? (currentIndexRef.current + 1) % itemCount
                    : Math.min(currentIndexRef.current + 1, itemCount - 1)
                handled = true
            } else if (isHorizontal && e.key === 'ArrowLeft') {
                newIndex = loop
                    ? (currentIndexRef.current - 1 + itemCount) % itemCount
                    : Math.max(currentIndexRef.current - 1, 0)
                handled = true
            } else if (e.key === 'Home') {
                newIndex = 0
                handled = true
            } else if (e.key === 'End') {
                newIndex = itemCount - 1
                handled = true
            } else if (e.key === 'Enter' || e.key === ' ') {
                onSelect?.(currentIndexRef.current)
                handled = true
            }

            if (handled) {
                e.preventDefault()
                currentIndexRef.current = newIndex
            }

            return newIndex
        },
        [itemCount, loop, orientation, onSelect]
    )

    return {
        currentIndex: currentIndexRef.current,
        handleKeyDown,
        setCurrentIndex: (index: number) => {
            currentIndexRef.current = index
        },
    }
}

// ============================================
// Screen Reader Announcer
// ============================================

let announcer: HTMLDivElement | null = null

function getAnnouncer() {
    if (announcer) return announcer

    announcer = document.createElement('div')
    announcer.setAttribute('aria-live', 'polite')
    announcer.setAttribute('aria-atomic', 'true')
    announcer.className = 'sr-only'
    announcer.style.cssText =
        'position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0, 0, 0, 0); white-space: nowrap; border: 0;'
    document.body.appendChild(announcer)

    return announcer
}

export function announce(message: string, priority: 'polite' | 'assertive' = 'polite') {
    const el = getAnnouncer()
    el.setAttribute('aria-live', priority)

    // Clear and set to trigger announcement
    el.textContent = ''
    requestAnimationFrame(() => {
        el.textContent = message
    })
}

// ============================================
// Skip Link Component
// ============================================

interface SkipLinkProps {
    targetId: string
    children?: React.ReactNode
}

export function SkipLink({ targetId, children = 'Skip to main content' }: SkipLinkProps) {
    return (
        <a
            href={`#${targetId}`}
            className="sr-only focus:not-sr-only focus:absolute focus:z-[9999] focus:top-4 focus:left-4 focus:px-4 focus:py-2 focus:bg-brand-500 focus:text-white focus:rounded-md focus:outline-none focus:ring-2 focus:ring-brand-400 focus:ring-offset-2"
        >
            {children}
        </a>
    )
}

// ============================================
// Visually Hidden Component
// ============================================

interface VisuallyHiddenProps {
    children: React.ReactNode
    as?: keyof JSX.IntrinsicElements
}

export function VisuallyHidden({ children, as: Component = 'span' }: VisuallyHiddenProps) {
    return (
        <Component className="sr-only">
            {children}
        </Component>
    )
}

// ============================================
// Live Region Component
// ============================================

interface LiveRegionProps {
    children: React.ReactNode
    mode?: 'polite' | 'assertive' | 'off'
    atomic?: boolean
}

export function LiveRegion({ children, mode = 'polite', atomic = true }: LiveRegionProps) {
    return (
        <div
            aria-live={mode}
            aria-atomic={atomic}
            className="sr-only"
        >
            {children}
        </div>
    )
}
