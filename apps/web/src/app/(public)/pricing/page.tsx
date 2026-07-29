import type { Metadata } from 'next'
import PricingPage from '@/components/PricingPage'

// Pricing is a high-intent landing page and was inheriting the site-wide
// title/description, so it competed with the homepage for the same terms.
export const metadata: Metadata = {
  title: 'Pricing — Cleaning Plans & Rates',
  description:
    'Transparent cleaning prices: pay as you go, weekly plans, or Host Pro for Airbnb turnovers. No hidden fees, verified professionals, instant booking.',
  alternates: { canonical: '/pricing' },
}

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
