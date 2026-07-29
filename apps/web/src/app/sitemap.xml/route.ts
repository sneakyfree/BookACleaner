/**
 * Generated sitemap.
 *
 * Replaces public/sitemap.xml, which was hand-maintained, frozen at
 * lastmod 2026-02-20, pointed at bookacleaner.COM (the product is
 * bookacleaner.AI — every other reference in the codebase uses .ai), and
 * listed only marketing routes. It contained no cleaner profiles, which are
 * the pages a marketplace actually needs indexed.
 *
 * Implemented as a route handler rather than Next's `sitemap.ts` convention:
 * the metadata-route loader in Next 14.0.4 interpolates the absolute file path
 * into a single-quoted JS string, so any project path containing an apostrophe
 * ("Grant's Folder") produces a syntax error at build time. A route handler
 * skips that loader and behaves identically for crawlers.
 */

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || 'https://bookacleaner.ai'
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

// Sitemaps cap at 50k URLs; stay well under it.
const MAX_CLEANERS = 5000

// Rendered per request, NOT prerendered at build.
//
// Next will happily statically generate this route, which sounds efficient
// until you notice the build runs where the API is unreachable (CI has no
// backend) — so the shipped sitemap is baked with ZERO cleaner profiles and
// stays that way until something revalidates it. Given profiles are the whole
// point of the sitemap, correctness beats the prerender here; the
// Cache-Control below still lets a CDN serve it for an hour.
export const dynamic = 'force-dynamic'

interface CleanerEntry {
  id: string
  updatedAt?: string
}

interface Entry {
  loc: string
  lastmod: string
  changefreq: string
  priority: string
}

async function fetchCleaners(): Promise<CleanerEntry[]> {
  try {
    const res = await fetch(`${API_URL}/api/v1/cleaners/?limit=100`, {
      next: { revalidate: 3600 },
    })
    if (!res.ok) return []
    const data = await res.json()
    const cleaners = Array.isArray(data?.cleaners) ? data.cleaners : []
    return cleaners.slice(0, MAX_CLEANERS)
  } catch {
    // A sitemap that throws is a sitemap search engines cannot read. Fall
    // back to the static routes rather than failing the whole document.
    return []
  }
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

export async function GET() {
  const today = new Date().toISOString().split('T')[0]

  const entries: Entry[] = [
    { loc: `${SITE_URL}/`, lastmod: today, changefreq: 'daily', priority: '1.0' },
    { loc: `${SITE_URL}/cleaners`, lastmod: today, changefreq: 'daily', priority: '0.9' },
    { loc: `${SITE_URL}/pricing`, lastmod: today, changefreq: 'weekly', priority: '0.8' },
    { loc: `${SITE_URL}/register`, lastmod: today, changefreq: 'monthly', priority: '0.7' },
    { loc: `${SITE_URL}/login`, lastmod: today, changefreq: 'monthly', priority: '0.5' },
    { loc: `${SITE_URL}/privacy`, lastmod: today, changefreq: 'yearly', priority: '0.3' },
    { loc: `${SITE_URL}/terms`, lastmod: today, changefreq: 'yearly', priority: '0.3' },
  ]

  for (const cleaner of await fetchCleaners()) {
    entries.push({
      loc: `${SITE_URL}/cleaners/${cleaner.id}`,
      lastmod: cleaner.updatedAt ? new Date(cleaner.updatedAt).toISOString().split('T')[0] : today,
      changefreq: 'weekly',
      priority: '0.8',
    })
  }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries
  .map(
    (e) => `  <url>
    <loc>${escapeXml(e.loc)}</loc>
    <lastmod>${e.lastmod}</lastmod>
    <changefreq>${e.changefreq}</changefreq>
    <priority>${e.priority}</priority>
  </url>`
  )
  .join('\n')}
</urlset>`

  return new Response(body, {
    headers: {
      'Content-Type': 'application/xml',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  })
}
