import { loadStripe, type Stripe } from '@stripe/stripe-js'

/**
 * Returns a memoized Stripe.js promise, or null when no publishable key is
 * configured (e.g. mock/dev mode). Calling loadStripe('') makes Stripe throw an
 * uncaught IntegrationError that crashes the whole page, so we must never pass
 * an empty key. Consumers should treat a null result as "payments unavailable".
 */
let stripePromise: Promise<Stripe | null> | null | undefined

export function getStripe(): Promise<Stripe | null> | null {
    if (stripePromise === undefined) {
        const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
        stripePromise = key ? loadStripe(key) : null
    }
    return stripePromise
}
