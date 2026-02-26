import { test, expect } from '@playwright/test';

/**
 * Payments Flow E2E Tests
 * Tests subscription page, payment elements
 */
test.describe('Payments', () => {

    test('should display subscription page with pricing tiers', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'cleaner@demo.com');
        await page.fill('input[name="password"]', 'demo1234');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/cleaner|dashboard/, { timeout: 10000 });

        await page.goto('/cleaner/subscription');
        await page.waitForLoadState('networkidle');

        // Should show pricing tiers
        await expect(page.getByText(/starter|free/i).first()).toBeVisible({ timeout: 5000 });
        await expect(page.getByText(/pro/i).first()).toBeVisible();
        await expect(page.getByText(/premium/i).first()).toBeVisible();
    });

    test('should show pricing amounts', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'cleaner@demo.com');
        await page.fill('input[name="password"]', 'demo1234');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/cleaner|dashboard/, { timeout: 10000 });

        await page.goto('/cleaner/subscription');
        await page.waitForLoadState('networkidle');

        // Check for price amounts
        await expect(page.getByText('$0')).toBeVisible();
        await expect(page.getByText('$29')).toBeVisible();
        await expect(page.getByText('$79')).toBeVisible();
    });

    test('should display FAQ section', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'cleaner@demo.com');
        await page.fill('input[name="password"]', 'demo1234');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/cleaner|dashboard/, { timeout: 10000 });

        await page.goto('/cleaner/subscription');
        await page.waitForLoadState('networkidle');

        await expect(page.getByText(/frequently asked/i)).toBeVisible();
        await expect(page.getByText(/cancel anytime/i)).toBeVisible();
    });

    test('should display cleaner earnings page', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'cleaner@demo.com');
        await page.fill('input[name="password"]', 'demo1234');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/cleaner|dashboard/, { timeout: 10000 });

        await page.goto('/cleaner/earnings');
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).toMatch(/earning|payout|balance|revenue/i);
    });
});
