import type { Metadata } from 'next'
import CleanerProfileClient from './CleanerProfileClient'

/**
 * Server wrapper for the public cleaner profile.
 *
 * The page itself is a client component (it fetches and renders interactively),
 * and a client component cannot export generateMetadata — so every cleaner
 * profile used to serve the root layout's generic title and description:
 *
 *   "BookACleaner.ai | AI-Powered Cleaning Marketplace"
 *
 * Identical for every professional on the platform, with no per-cleaner
 * description, no Open Graph image, and no structured data. For a marketplace
 * whose organic growth depends on individual profiles ranking, that is the
 * single most valuable page on the site rendering as a duplicate of every
 * other one.
 *
 * This wrapper adds per-cleaner metadata and LocalBusiness JSON-LD without
 * touching the interactive component, which is re-exported unchanged.
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bookacleaner.ai'

interface CleanerSummary {
  id: string
  name?: string | null
  businessName?: string | null
  bio?: string | null
  profilePhoto?: string | null
  verificationTier?: number
  overallRating?: number
  totalReviews?: number
  completedJobs?: number
  serviceAreas?: string[]
  services?: string[]
}

async function fetchCleaner(cleanerId: string): Promise<CleanerSummary | null> {
  try {
    const res = await fetch(`${API_URL}/api/v1/cleaners/${cleanerId}`, {
      // Profiles change rarely; a short revalidate keeps crawlers and
      // repeat visitors off the origin without serving stale ratings.
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    return (await res.json()) as CleanerSummary
  } catch {
    // Metadata must never break the page. A failed lookup falls back to
    // the generic title rather than throwing during render.
    return null
  }
}

function displayName(cleaner: CleanerSummary): string {
  return cleaner.businessName || cleaner.name || 'Cleaning Professional'
}

export async function generateMetadata({
  params,
}: {
  params: { cleanerId: string }
}): Promise<Metadata> {
  const cleaner = await fetchCleaner(params.cleanerId)
  if (!cleaner) {
    return {
      title: 'Cleaning Professional',
      description:
        'View verified cleaning professionals on BookACleaner.ai — ratings, services, availability and instant booking.',
    }
  }

  const name = displayName(cleaner)
  const areas = (cleaner.serviceAreas || []).slice(0, 3).join(', ')
  const rating = cleaner.overallRating
    ? `Rated ${cleaner.overallRating.toFixed(1)}/5`
    : 'Verified professional'
  const reviews = cleaner.totalReviews
    ? ` from ${cleaner.totalReviews} review${cleaner.totalReviews === 1 ? '' : 's'}`
    : ''

  const description =
    cleaner.bio?.slice(0, 155) ||
    `${rating}${reviews}. ${
      areas ? `Serving ${areas}. ` : ''
    }Book a verified cleaner on BookACleaner.ai.`

  const canonical = `${SITE_URL}/cleaners/${cleaner.id}`

  return {
    // Feeds the root layout's "%s | BookACleaner.ai" template, which no
    // page was supplying a value for.
    title: areas ? `${name} — Cleaning Services in ${areas}` : name,
    description,
    alternates: { canonical },
    openGraph: {
      title: `${name} | BookACleaner.ai`,
      description,
      url: canonical,
      type: 'profile',
      images: cleaner.profilePhoto ? [{ url: cleaner.profilePhoto }] : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${name} | BookACleaner.ai`,
      description,
    },
  }
}

/**
 * LocalBusiness structured data. Local search results lean heavily on this,
 * and it is what surfaces the star rating in a result snippet.
 */
function structuredData(cleaner: CleanerSummary) {
  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    '@id': `${SITE_URL}/cleaners/${cleaner.id}`,
    name: displayName(cleaner),
    url: `${SITE_URL}/cleaners/${cleaner.id}`,
    description: cleaner.bio || undefined,
    image: cleaner.profilePhoto || undefined,
    areaServed: (cleaner.serviceAreas || []).map((a) => ({
      '@type': 'Place',
      name: a,
    })),
    makesOffer: (cleaner.services || []).map((s) => ({
      '@type': 'Offer',
      itemOffered: { '@type': 'Service', name: s },
    })),
  }

  // Only emit a rating when one genuinely exists — an aggregateRating with
  // zero reviews is invalid structured data and can trigger a penalty.
  if (cleaner.overallRating && cleaner.totalReviews) {
    data.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: cleaner.overallRating,
      reviewCount: cleaner.totalReviews,
      bestRating: 5,
      worstRating: 1,
    }
  }

  return data
}

export default async function CleanerProfilePage({ params }: { params: { cleanerId: string } }) {
  const cleaner = await fetchCleaner(params.cleanerId)

  return (
    <>
      {cleaner && (
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(structuredData(cleaner)),
          }}
        />
      )}
      <CleanerProfileClient />
    </>
  )
}
