import { test, expect } from '@playwright/test'

/**
 * SEO guards for the public surface.
 *
 * Cleaner profiles are the pages a marketplace grows on, and they used to be
 * client components with no metadata at all — every profile served the root
 * layout's generic "BookACleaner.ai | AI-Powered Cleaning Marketplace" title,
 * no description, no canonical, and no structured data.
 *
 * These assert on the HTML a crawler receives, so a future refactor back to a
 * bare client component fails the build instead of silently de-indexing the
 * catalogue.
 */

const API_URL = process.env.API_URL || 'http://localhost:8000'

async function firstCleanerId(request: any): Promise<string | null> {
  const res = await request.get(`${API_URL}/api/v1/cleaners/?limit=1`)
  if (!res.ok()) return null
  const data = await res.json()
  return data?.cleaners?.[0]?.id ?? null
}

test.describe('SEO', () => {
  test('robots.txt points at the canonical domain', async ({ request }) => {
    const res = await request.get('/robots.txt')
    expect(res.ok()).toBeTruthy()
    const body = await res.text()

    expect(body).toContain('Sitemap:')
    // The old static file pointed at bookacleaner.com, which is not the site.
    expect(body).not.toContain('bookacleaner.com')
    // Authenticated areas must stay out of the index.
    expect(body).toContain('Disallow: /admin/')
    expect(body).toContain('Disallow: /client/')
  })

  test('sitemap is valid xml and lists the public routes', async ({ request }) => {
    const res = await request.get('/sitemap.xml')
    expect(res.ok()).toBeTruthy()
    const body = await res.text()

    expect(body).toContain('<?xml')
    expect(body).toContain('<urlset')
    expect(body).toContain('/cleaners')
    expect(body).toContain('/pricing')
    expect(body).not.toContain('bookacleaner.com')
  })

  test('sitemap includes individual cleaner profiles', async ({ request }) => {
    const id = await firstCleanerId(request)
    test.skip(!id, 'no cleaners seeded')

    const res = await request.get('/sitemap.xml')
    const body = await res.text()

    // The hand-maintained sitemap listed only marketing pages — the actual
    // indexable inventory was entirely absent.
    const profileUrls = body.match(/<loc>[^<]*\/cleaners\/[^<]+<\/loc>/g) || []
    expect(profileUrls.length).toBeGreaterThan(0)
  })

  test('cleaner profile has a unique title, not the site default', async ({ page, request }) => {
    const id = await firstCleanerId(request)
    test.skip(!id, 'no cleaners seeded')

    await page.goto(`/cleaners/${id}`)
    const title = await page.title()

    expect(title.length).toBeGreaterThan(0)
    expect(title).not.toBe('BookACleaner.ai | AI-Powered Cleaning Marketplace')
    // The root layout defines a "%s | BookACleaner.ai" template that no page
    // was supplying a value for.
    expect(title).toContain('BookACleaner.ai')
  })

  test('cleaner profile has a description and canonical url', async ({ page, request }) => {
    const id = await firstCleanerId(request)
    test.skip(!id, 'no cleaners seeded')

    await page.goto(`/cleaners/${id}`)

    const description = await page
      .locator('meta[name="description"]')
      .first()
      .getAttribute('content')
    expect(description).toBeTruthy()
    expect((description || '').length).toBeGreaterThan(20)

    const canonical = await page.locator('link[rel="canonical"]').first().getAttribute('href')
    expect(canonical).toContain(`/cleaners/${id}`)
  })

  test('cleaner profile emits LocalBusiness structured data', async ({ page, request }) => {
    const id = await firstCleanerId(request)
    test.skip(!id, 'no cleaners seeded')

    await page.goto(`/cleaners/${id}`)
    const blocks = await page.locator('script[type="application/ld+json"]').allTextContents()
    expect(blocks.length).toBeGreaterThan(0)

    const parsed = blocks.map((b) => JSON.parse(b))
    const business = parsed.find((p) => p['@type'] === 'LocalBusiness')
    expect(business).toBeTruthy()
    expect(business.name).toBeTruthy()
    expect(business.url).toContain(`/cleaners/${id}`)

    // A rating block may only be present when reviews actually exist —
    // aggregateRating with zero reviews is invalid structured data.
    if (business.aggregateRating) {
      expect(business.aggregateRating.reviewCount).toBeGreaterThan(0)
      expect(business.aggregateRating.ratingValue).toBeGreaterThan(0)
    }
  })

  test('public marketing pages have their own titles', async ({ page }) => {
    for (const [path, expected] of [
      ['/cleaners', 'Cleaners'],
      ['/pricing', 'Pricing'],
    ] as const) {
      await page.goto(path)
      const title = await page.title()
      expect(title, `${path} is still inheriting the site-wide title`).not.toBe(
        'BookACleaner.ai | AI-Powered Cleaning Marketplace'
      )
      expect(title).toContain(expected)
    }
  })
})
