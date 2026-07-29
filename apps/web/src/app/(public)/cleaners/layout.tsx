import type { Metadata } from 'next'

/**
 * Metadata for the public cleaner directory.
 *
 * The listing page is a client component and so cannot export metadata itself;
 * a layout can. Individual profiles override this via their own
 * generateMetadata, which is the correct precedence.
 */
export const metadata: Metadata = {
  // Must carry the template forward. A plain string here would REPLACE the
  // root layout's "%s | BookACleaner.ai" template for this whole subtree,
  // so individual profiles would lose the brand suffix from their titles.
  title: {
    default: 'Find Verified Cleaners Near You',
    template: '%s | BookACleaner.ai',
  },
  description:
    'Browse verified cleaning professionals by location, service and availability. Compare ratings, verification tiers and hourly rates, then book instantly.',
  alternates: { canonical: '/cleaners' },
  openGraph: {
    title: 'Find Verified Cleaners | BookACleaner.ai',
    description: 'Browse verified cleaning professionals by location, service and availability.',
    type: 'website',
  },
}

export default function CleanersLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
