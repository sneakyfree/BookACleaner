import PricingPage from '@/components/PricingPage'

/**
 * Public /pricing route.
 *
 * Delegates to the shared, working PricingPage component which uses NextAuth
 * (not a nonexistent localStorage 'token'), the correct backend plan slugs
 * (pay_as_you_go / weekly_clean / host_pro), and redirects logged-out users to
 * register before starting Stripe checkout. The previous inline implementation
 * sent `Bearer null` with wrong slugs (pro/premium) and silently 401'd.
 */
export default function PricingRoute() {
    return <PricingPage />
}
