'use client'

/**
 * Token Refresh and Session Management
 * Implements secure token refresh flow with NextAuth
 */

import { useSession, signOut } from 'next-auth/react'
import { useEffect, useRef, useCallback, useState } from 'react'

// Token refresh configuration
const TOKEN_REFRESH_INTERVAL = 4 * 60 * 1000 // 4 minutes (before 5 min expiry)
const TOKEN_EXPIRY_BUFFER = 60 * 1000 // 1 minute buffer

export interface TokenInfo {
    accessToken: string
    expiresAt: number
    refreshToken?: string
}

/**
 * Hook for automatic token refresh
 */
export function useTokenRefresh() {
    const { data: session, update } = useSession()
    const refreshTimeoutRef = useRef<NodeJS.Timeout | null>(null)
    const [isRefreshing, setIsRefreshing] = useState(false)
    const [lastRefresh, setLastRefresh] = useState<Date | null>(null)

    const refreshToken = useCallback(async () => {
        if (isRefreshing) return

        try {
            setIsRefreshing(true)
            console.log('[TokenRefresh] Refreshing token...')

            // Trigger NextAuth session update
            const newSession = await update()

            if (newSession) {
                setLastRefresh(new Date())
                console.log('[TokenRefresh] Token refreshed successfully')
            } else {
                console.warn('[TokenRefresh] Session update returned null')
                // Session expired, force logout
                await signOut({ redirect: true, callbackUrl: '/login' })
            }
        } catch (error) {
            console.error('[TokenRefresh] Failed to refresh token:', error)
            // On refresh failure, sign out to prevent stale session
            await signOut({ redirect: true, callbackUrl: '/login' })
        } finally {
            setIsRefreshing(false)
        }
    }, [update, isRefreshing])

    // Schedule token refresh
    const scheduleRefresh = useCallback((expiresAt?: number) => {
        // Clear existing timeout
        if (refreshTimeoutRef.current) {
            clearTimeout(refreshTimeoutRef.current)
        }

        if (!expiresAt) {
            // Default to 4 minutes if no expiry info
            refreshTimeoutRef.current = setTimeout(refreshToken, TOKEN_REFRESH_INTERVAL)
            return
        }

        const now = Date.now()
        const timeUntilExpiry = expiresAt - now
        const refreshTime = Math.max(
            timeUntilExpiry - TOKEN_EXPIRY_BUFFER,
            1000 // Minimum 1 second
        )

        console.log(`[TokenRefresh] Scheduling refresh in ${refreshTime / 1000}s`)
        refreshTimeoutRef.current = setTimeout(refreshToken, refreshTime)
    }, [refreshToken])

    // Setup auto-refresh on session change
    useEffect(() => {
        if (session?.user) {
            const expiresAt = (session as any).expiresAt
            scheduleRefresh(expiresAt)
        }

        return () => {
            if (refreshTimeoutRef.current) {
                clearTimeout(refreshTimeoutRef.current)
            }
        }
    }, [session, scheduleRefresh])

    // Refresh on window focus (user returns to tab)
    useEffect(() => {
        const handleFocus = () => {
            if (session?.user && lastRefresh) {
                const timeSinceRefresh = Date.now() - lastRefresh.getTime()
                if (timeSinceRefresh > TOKEN_REFRESH_INTERVAL) {
                    console.log('[TokenRefresh] Tab focused, refreshing stale token')
                    refreshToken()
                }
            }
        }

        window.addEventListener('focus', handleFocus)
        return () => window.removeEventListener('focus', handleFocus)
    }, [session, lastRefresh, refreshToken])

    return {
        isRefreshing,
        lastRefresh,
        refreshToken,
    }
}

/**
 * Hook for session management with enhanced features
 */
export function useSessionManagement() {
    const { data: session, status } = useSession()
    const { isRefreshing, lastRefresh, refreshToken } = useTokenRefresh()
    const [isOnline, setIsOnline] = useState(true)

    // Track online/offline status
    useEffect(() => {
        const handleOnline = () => setIsOnline(true)
        const handleOffline = () => setIsOnline(false)

        window.addEventListener('online', handleOnline)
        window.addEventListener('offline', handleOffline)

        return () => {
            window.removeEventListener('online', handleOnline)
            window.removeEventListener('offline', handleOffline)
        }
    }, [])

    // Get session status
    const isAuthenticated = status === 'authenticated' && !!session?.user
    const isLoading = status === 'loading'

    // Get user info
    const user = session?.user ?? null

    // Logout with cleanup
    const logout = useCallback(async () => {
        try {
            // Clear any local storage
            localStorage.removeItem('bookacleaner-theme')
            localStorage.removeItem('bookacleaner-locale')

            // Sign out
            await signOut({ redirect: true, callbackUrl: '/login' })
        } catch (error) {
            console.error('[SessionManagement] Logout error:', error)
        }
    }, [])

    // Get authorization header
    const getAuthHeader = useCallback((): Record<string, string> => {
        const accessToken = (session as any)?.accessToken
        if (accessToken) {
            return { Authorization: `Bearer ${accessToken}` }
        }
        return {}
    }, [session])

    return {
        session,
        user,
        isAuthenticated,
        isLoading,
        isRefreshing,
        isOnline,
        lastRefresh,
        logout,
        refreshToken,
        getAuthHeader,
    }
}

/**
 * Fetch wrapper with automatic token injection
 */
export function createAuthenticatedFetch(getAuthHeader: () => Record<string, string>) {
    return async function authenticatedFetch(
        url: string,
        options: RequestInit = {}
    ): Promise<Response> {
        const authHeaders = getAuthHeader()

        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...authHeaders,
                ...options.headers,
            },
        })

        // Handle 401 - token expired
        if (response.status === 401) {
            console.warn('[AuthFetch] Received 401, session may be expired')
            // Let the token refresh hook handle this
        }

        return response
    }
}

/**
 * Session activity tracker
 */
export function useActivityTracker(timeoutMinutes: number = 30) {
    const { logout } = useSessionManagement()
    const lastActivityRef = useRef(Date.now())
    const timeoutRef = useRef<NodeJS.Timeout | null>(null)

    const updateActivity = useCallback(() => {
        lastActivityRef.current = Date.now()
    }, [])

    useEffect(() => {
        // Activity events to track
        const events = ['mousedown', 'keydown', 'touchstart', 'scroll']

        events.forEach((event) => {
            window.addEventListener(event, updateActivity)
        })

        // Check for inactivity
        const checkInactivity = () => {
            const inactiveTime = Date.now() - lastActivityRef.current
            const timeoutMs = timeoutMinutes * 60 * 1000

            if (inactiveTime > timeoutMs) {
                console.log('[ActivityTracker] Session timeout due to inactivity')
                logout()
            }
        }

        timeoutRef.current = setInterval(checkInactivity, 60000) // Check every minute

        return () => {
            events.forEach((event) => {
                window.removeEventListener(event, updateActivity)
            })
            if (timeoutRef.current) {
                clearInterval(timeoutRef.current)
            }
        }
    }, [timeoutMinutes, logout, updateActivity])

    return { updateActivity }
}
