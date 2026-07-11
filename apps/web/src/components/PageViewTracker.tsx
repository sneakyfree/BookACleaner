'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { api } from '@/lib/api'

/**
 * Global page-view beacon. Fires api.trackPageView on every route change
 * (public + dashboard). trackPageView is fire-and-forget and swallows
 * errors, so this can never throw into the page.
 */
export function PageViewTracker() {
  const pathname = usePathname()

  useEffect(() => {
    if (!pathname) return
    try {
      api.trackPageView(pathname, typeof document !== 'undefined' ? document.referrer : undefined)
    } catch {
      /* analytics must never break the page */
    }
  }, [pathname])

  return null
}

export default PageViewTracker
