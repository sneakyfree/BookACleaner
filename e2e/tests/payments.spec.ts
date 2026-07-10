import { test, expect } from '@playwright/test'

/**
 * Payments Flow E2E Tests
 * Tests subscription page, payment elements
 */
test.describe('Payments', () => {
  test('should display subscription page with pricing tiers', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'cleaner@demo.com')
    await page.fill('input[name="password"]', 'demo1234')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/cleaner|dashboard/, { timeout: 10000 })

    await page.goto('/cleaner/subscription')
    await page.waitForLoadState('networkidle')

    // Should show pricing tiers (Starter / Pay As You Go / Weekly Clean / Host Pro)
    await expect(page.getByText(/starter|free/i).first()).toBeVisible({ timeout: 5000 })
    await expect(page.getByText(/pay as you go/i).first()).toBeVisible()
    await expect(page.getByText(/weekly clean/i).first()).toBeVisible()
    await expect(page.getByText(/host pro/i).first()).toBeVisible()
  })

  test('should show pricing amounts', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'cleaner@demo.com')
    await page.fill('input[name="password"]', 'demo1234')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/cleaner|dashboard/, { timeout: 10000 })

    await page.goto('/cleaner/subscription')
    await page.waitForLoadState('networkidle')

    // Check for price amounts ($0 Starter, $89 Pay As You Go, $69 Weekly Clean, $149 Host Pro)
    await expect(page.getByText('$0').first()).toBeVisible()
    await expect(page.getByText('$89').first()).toBeVisible()
    await expect(page.getByText('$69').first()).toBeVisible()
    await expect(page.getByText('$149').first()).toBeVisible()
  })

  test('should display FAQ section', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'cleaner@demo.com')
    await page.fill('input[name="password"]', 'demo1234')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/cleaner|dashboard/, { timeout: 10000 })

    await page.goto('/cleaner/subscription')
    await page.waitForLoadState('networkidle')

    await expect(page.getByText(/frequently asked/i)).toBeVisible()
    await expect(page.getByText(/cancel anytime/i).first()).toBeVisible()
  })

  test('should display cleaner earnings page', async ({ page }) => {
    await page.goto('/login')
    await page.fill('input[name="email"]', 'cleaner@demo.com')
    await page.fill('input[name="password"]', 'demo1234')
    await page.click('button[type="submit"]')
    await expect(page).toHaveURL(/cleaner|dashboard/, { timeout: 10000 })

    await page.goto('/cleaner/earnings')
    await page.waitForLoadState('networkidle')

    const content = await page.content()
    expect(content).toMatch(/earning|payout|balance|revenue/i)
  })
})
