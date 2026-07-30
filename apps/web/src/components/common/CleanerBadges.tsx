'use client'

import { useEffect, useState } from 'react'
import { BadgeDisplay } from './BadgeDisplay'

interface Badge {
  name: string
  description: string
  icon_url: string
  awarded_at?: string
  awarded_reason?: string
}

interface CleanerBadgesProps {
  /** The cleaner's USER id (not their cleaner-profile id). */
  userId?: string | null
  size?: 'sm' | 'md' | 'lg'
  /** Show an encouraging empty state — appropriate on the owner's dashboard,
   *  not on a public profile where it just reads as a negative. */
  showEmpty?: boolean
  className?: string
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Fetches and renders a cleaner's earned badges.
 *
 * The badge engine has worked since the bind-parameter fix, and jobs now sync
 * stats and evaluate on completion — but nothing rendered a badge anywhere, so
 * the whole thing was invisible. This is the missing half.
 *
 * GET /verification/badges/{user_id} is public by design: badges are a trust
 * signal for prospective clients, so they must show to logged-out visitors.
 *
 * Fails silently. A badge strip is decoration on someone else's profile; it
 * must never take the page down with it.
 */
export function CleanerBadges({
  userId,
  size = 'md',
  showEmpty = false,
  className,
}: CleanerBadgesProps) {
  const [badges, setBadges] = useState<Badge[]>([])
  const [loaded, setLoaded] = useState(false)

  useEffect(() => {
    if (!userId) {
      setLoaded(true)
      return
    }
    let cancelled = false

    const load = async () => {
      try {
        const res = await fetch(`${API_URL}/api/v1/verification/badges/${userId}`)
        if (!res.ok) throw new Error(String(res.status))
        const data = await res.json()
        if (!cancelled) setBadges(Array.isArray(data?.badges) ? data.badges : [])
      } catch {
        if (!cancelled) setBadges([])
      } finally {
        if (!cancelled) setLoaded(true)
      }
    }
    load()

    return () => {
      cancelled = true
    }
  }, [userId])

  // Render nothing until loaded, so the strip doesn't flash an empty state.
  if (!loaded) return null
  if (!badges.length && !showEmpty) return null

  return <BadgeDisplay badges={badges} size={size} showEmpty={showEmpty} className={className} />
}

export default CleanerBadges
