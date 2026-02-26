'use client'

import { useState, useEffect } from 'react'

/**
 * Hook that returns true if the given media query matches.
 * Updates reactively on viewport changes.
 */
export function useMediaQuery(query: string): boolean {
    const [matches, setMatches] = useState(false)

    useEffect(() => {
        const mql = window.matchMedia(query)
        setMatches(mql.matches)

        const handler = (e: MediaQueryListEvent) => setMatches(e.matches)
        mql.addEventListener('change', handler)

        return () => mql.removeEventListener('change', handler)
    }, [query])

    return matches
}

/**
 * Returns true on mobile screens (< 768px).
 */
export function useIsMobile(): boolean {
    return useMediaQuery('(max-width: 767px)')
}

/**
 * Returns true on tablet screens (768px - 1023px).
 */
export function useIsTablet(): boolean {
    return useMediaQuery('(min-width: 768px) and (max-width: 1023px)')
}
