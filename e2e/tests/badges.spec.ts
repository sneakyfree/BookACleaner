import { test, expect } from '@playwright/test'

/**
 * Badges, end to end.
 *
 * The engine had been correct since the bind-parameter fix, but the feature was
 * invisible and unearnable in practice:
 *   - nothing rendered a badge anywhere (two unused BadgeDisplay components,
 *     nothing calling /verification/badges),
 *   - cleaner_profiles.completed_jobs was never incremented by anything, so
 *     count-based criteria were frozen at 0,
 *   - evaluation was dispatched to a Celery task with a broken signature.
 *
 * These drive the browser, because CleanerBadges fetches on mount — a curl of
 * the server-rendered HTML cannot see the result.
 */

const API_URL = process.env.API_URL || 'http://localhost:8000'
const SEED_PASSWORD = process.env.SEED_PASSWORD || 'demo1234'

async function login(request: any, email: string) {
  const res = await request.post(`${API_URL}/api/v1/auth/login`, {
    data: { email, password: SEED_PASSWORD },
  })
  if (!res.ok()) return null
  const body = await res.json()
  return { token: body.access_token, userId: body.user?.id }
}

/** Evaluate badges for the seeded cleaner and return their user id. */
async function earnBadges(request: any) {
  const session = await login(request, 'maria@demo.com')
  if (!session?.token) return null

  await request.post(`${API_URL}/api/v1/verification/badges/evaluate`, {
    headers: { Authorization: `Bearer ${session.token}` },
  })
  return session.userId
}

async function cleanerIdFor(request: any, userId: string) {
  const res = await request.get(`${API_URL}/api/v1/cleaners/?limit=100`)
  const data = await res.json()
  return data?.cleaners?.find((c: any) => c.userId === userId)?.id ?? null
}

test.describe('Badges', () => {
  test('the badges endpoint is public — no auth required', async ({ request }) => {
    // Badges are a trust signal for prospective clients, so a logged-out
    // visitor must be able to see them.
    const userId = await earnBadges(request)
    test.skip(!userId, 'demo cleaner not seeded')

    const res = await request.get(`${API_URL}/api/v1/verification/badges/${userId}`)
    expect(res.status()).toBe(200)
    const body = await res.json()
    expect(body).toHaveProperty('badges')
    expect(body).toHaveProperty('count')
  })

  test('completing work earns badges', async ({ request }) => {
    const userId = await earnBadges(request)
    test.skip(!userId, 'demo cleaner not seeded')

    const res = await request.get(`${API_URL}/api/v1/verification/badges/${userId}`)
    const body = await res.json()
    expect(body.count).toBeGreaterThan(0)

    // Every badge must carry what the UI needs to render it.
    for (const badge of body.badges) {
      expect(badge.name).toBeTruthy()
      expect(badge).toHaveProperty('description')
      expect(badge).toHaveProperty('icon_url')
    }
  })

  test('the retired Community Star badge is never awarded', async ({ request }) => {
    const userId = await earnBadges(request)
    test.skip(!userId, 'demo cleaner not seeded')

    const res = await request.get(`${API_URL}/api/v1/verification/badges/${userId}`)
    const names = (await res.json()).badges.map((b: any) => b.name)
    expect(names).not.toContain('Community Star')
  })

  test('every badge icon asset actually serves', async ({ request }) => {
    // The icon_urls pointed at /badges/*.svg and public/badges/ did not
    // exist, so every badge rendered a broken image.
    for (const icon of [
      'first-job',
      'five-star',
      'verified-pro',
      'top-rated',
      'early-adopter',
      'speed-demon',
      'repeat-favorite',
    ]) {
      const res = await request.get(`/badges/${icon}.svg`)
      expect(res.status(), `/badges/${icon}.svg is missing`).toBe(200)
    }
  })

  test('badges render on the public cleaner profile', async ({ page, request }) => {
    const userId = await earnBadges(request)
    test.skip(!userId, 'demo cleaner not seeded')
    const cleanerId = await cleanerIdFor(request, userId)
    test.skip(!cleanerId, 'cleaner profile not listed')

    const badgeRes = await request.get(`${API_URL}/api/v1/verification/badges/${userId}`)
    const expected = (await badgeRes.json()).badges
    test.skip(!expected.length, 'no badges earned to display')

    await page.goto(`/cleaners/${cleanerId}`)

    // The strip is fetched client-side, so wait for an icon to appear.
    await expect(page.locator(`img[alt="${expected[0].name}"]`).first()).toBeVisible({
      timeout: 10_000,
    })
  })

  test('a badge exposes its meaning, not just an icon', async ({ page, request }) => {
    const userId = await earnBadges(request)
    test.skip(!userId, 'demo cleaner not seeded')
    const cleanerId = await cleanerIdFor(request, userId)
    test.skip(!cleanerId, 'cleaner profile not listed')

    const badgeRes = await request.get(`${API_URL}/api/v1/verification/badges/${userId}`)
    const expected = (await badgeRes.json()).badges
    test.skip(!expected.length, 'no badges earned to display')

    await page.goto(`/cleaners/${cleanerId}`)
    await expect(page.locator(`img[alt="${expected[0].name}"]`).first()).toBeVisible({
      timeout: 10_000,
    })

    // The name and description live in a hover tooltip. It is rendered in
    // the DOM (opacity-0 until hover), so assert both are present — a badge
    // should be explicable, not a mystery glyph.
    const body = page.locator('body')
    await expect(body).toContainText(expected[0].name)
    if (expected[0].description) {
      await expect(body).toContainText(expected[0].description)
    }
  })

  test('a cleaner sees their own achievements on the verification page', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'maria@demo.com')
    await page.fill('input[name="password"]', SEED_PASSWORD)
    await page.click('button[type="submit"]')
    await page.waitForURL(/\/(cleaner|dashboard)/, { timeout: 15_000 }).catch(() => {})

    await page.goto('/cleaner/verification')
    await expect(page.getByText('Achievements')).toBeVisible({ timeout: 10_000 })
  })
})
