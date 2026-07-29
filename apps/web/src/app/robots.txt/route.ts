/**
 * Generated robots.txt.
 *
 * Replaces public/robots.txt, whose Sitemap directive pointed at
 * https://bookacleaner.com/sitemap.xml — the wrong domain. Every other
 * reference in this codebase (root layout metadataBase, API CORS allow-list,
 * README) uses bookacleaner.ai, so crawlers were being pointed at a host that
 * is not the canonical site.
 *
 * A route handler rather than Next's `robots.ts` convention, for the same
 * build reason documented in sitemap.xml/route.ts.
 *
 * The disallow list is unchanged: authenticated areas stay out of the index.
 */

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bookacleaner.ai'

export const revalidate = 86400

export async function GET() {
  const body = `# BookACleaner robots.txt
User-agent: *
Allow: /
Disallow: /api/
Disallow: /admin/
Disallow: /client/
Disallow: /cleaner/
Disallow: /dashboard/
Disallow: /settings/
Disallow: /welcome

Sitemap: ${SITE_URL}/sitemap.xml
`

  return new Response(body, {
    headers: {
      'Content-Type': 'text/plain',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}
