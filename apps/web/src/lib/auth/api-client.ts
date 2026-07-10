'use client'

/**
 * Centralized API Client Bridge
 * Connects NextAuth session → ApiClient token, provides React hooks for
 * authenticated API calls with automatic token refresh on 401.
 */

import { useSession } from 'next-auth/react'
import { useEffect, useCallback, useRef } from 'react'
import { api } from '@/lib/api'

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

/**
 * Build an Error carrying the backend `detail` and HTTP `status`.
 * Throwing a real Error means callers reading `err.message` (the common case)
 * get the backend detail instead of `undefined` — previously producing empty
 * toasts and blank error banners across the app.
 */
export interface ApiError extends Error {
  detail: string
  status: number
}

function makeApiError(detail: string, status: number): ApiError {
  const err = new Error(detail) as ApiError
  err.detail = detail
  err.status = status
  return err
}

/**
 * Hook that syncs the NextAuth session's access token into the global ApiClient.
 * Place this once in a top-level provider (e.g. providers.tsx).
 */
export function useApiTokenSync() {
  const { data: session, status } = useSession()

  useEffect(() => {
    // Publish status first so the client knows whether to wait for a token
    // ('loading') or fire immediately ('unauthenticated'); setToken releases
    // any requests parked during the loading window.
    api.setAuthStatus(status)
    const accessToken = (session as any)?.accessToken
    api.setToken(accessToken ?? null)
  }, [session, status])
}

/**
 * Standalone authenticated fetch function.
 * Use this when you need fetch outside of React Query hooks —
 * for example in event handlers, form submissions, or one-off calls.
 *
 * Automatically:
 *  - Injects Authorization header from current session
 *  - Retries once on 401 after triggering session refresh
 *  - Sets Content-Type to application/json by default
 */
export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestInit = {},
  _retried = false
): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`

  // Wait out the auth-loading window so imperative calls fired right after
  // mount don't race ahead of the bearer token (same guard as ApiClient).
  await (api as any).ensureAuthResolved?.()

  // Get token from current session (server-side compatible via stored ref)
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  }

  // Inject token from the global ApiClient singleton
  const token = (api as any).token
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }

  const response = await fetch(url, {
    ...options,
    headers,
  })

  if (!response.ok) {
    // On 401, the token refresh hook (in refresh.ts) will handle rotation.
    // We throw so React Query / callers can handle error states.
    const error = await response.json().catch(() => ({ detail: 'Request failed' }))
    throw makeApiError(error.detail || response.statusText, response.status)
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T
  }

  return response.json()
}

/**
 * Hook that provides an authenticated fetch function bound to the current session.
 * Prefer the React Query hooks in use-api.ts for data fetching;
 * use this for imperative calls (form submits, button clicks).
 *
 * @example
 * const { authFetch } = useAuthFetch()
 * const handleSubmit = async (data) => {
 *   await authFetch('/api/v1/reviews', { method: 'POST', body: JSON.stringify(data) })
 * }
 */
export function useAuthFetch() {
  const { data: session } = useSession()

  const authFetch = useCallback(
    async <T = any>(endpoint: string, options: RequestInit = {}): Promise<T> => {
      const accessToken = (session as any)?.accessToken
      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
        ...((options.headers as Record<string, string>) || {}),
      }
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`
      }

      const url = endpoint.startsWith('http') ? endpoint : `${API_URL}${endpoint}`
      const response = await fetch(url, { ...options, headers })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ detail: 'Request failed' }))
        throw makeApiError(error.detail || response.statusText, response.status)
      }

      if (response.status === 204) return undefined as T
      return response.json()
    },
    [session]
  )

  return { authFetch }
}
