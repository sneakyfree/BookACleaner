/**
 * Sentry Client Configuration — BookACleaner
 * Client-side error tracking with PII scrubbing
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',

    // Performance monitoring
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    // Session replay for debugging
    replaysSessionSampleRate: 0.1,
    replaysOnErrorSampleRate: 1.0,

    // Environment + release tagging
    environment: process.env.NEXT_PUBLIC_ENVIRONMENT || process.env.NODE_ENV || 'development',
    release: process.env.NEXT_PUBLIC_APP_VERSION || '0.1.0',

    // Only enable when DSN is provided
    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,

    // PII scrubbing — never send sensitive data
    beforeSend(event) {
        if (event.request) {
            if (event.request.headers) {
                delete event.request.headers['Cookie']
                delete event.request.headers['Authorization']
            }
            if (event.request.cookies) {
                event.request.cookies = {}
            }
        }
        if (event.user) {
            delete event.user.ip_address
            delete event.user.email
        }
        return event
    },

    // Filter sensitive breadcrumbs
    beforeBreadcrumb(breadcrumb) {
        if (breadcrumb.category === 'console') {
            const msg = breadcrumb.message || ''
            if (msg.includes('token') || msg.includes('password') || msg.includes('Bearer')) {
                return null
            }
        }
        return breadcrumb
    },

    // Ignore common browser noise
    ignoreErrors: [
        'ResizeObserver loop limit exceeded',
        'ResizeObserver loop completed with undelivered notifications',
        'Non-Error promise rejection captured',
        'Network request failed',
        'Failed to fetch',
        /Loading chunk \d+ failed/,
        'AbortError',
    ],
})

