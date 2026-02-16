/**
 * Sentry Server Configuration — P8
 * Initialize Sentry for server-side error tracking in Next.js
 */
import * as Sentry from '@sentry/nextjs'

Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN || '',

    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.2 : 1.0,

    environment: process.env.NODE_ENV || 'development',

    release: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',

    enabled: !!process.env.NEXT_PUBLIC_SENTRY_DSN,
})
