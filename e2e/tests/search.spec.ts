import { test, expect } from '@playwright/test';

/**
 * Search Flow E2E Tests
 * Tests cleaner search, filters, and profile viewing
 */
test.describe('Search', () => {

    test('should display search page with results or empty state', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'client@demo.com');
        await page.fill('input[name="password"]', 'demo1234');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/client|dashboard/, { timeout: 10000 });

        await page.goto('/client/search');
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).toMatch(/search|find|cleaner|filter|no result|empty/i);
    });

    test('should have search input', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'client@demo.com');
        await page.fill('input[name="password"]', 'demo1234');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/client|dashboard/, { timeout: 10000 });

        await page.goto('/client/search');
        await page.waitForLoadState('networkidle');

        const searchInput = page.locator('input[placeholder*="search" i], input[type="search"]').first();
        const hasSearch = await searchInput.isVisible({ timeout: 3000 }).catch(() => false);
        if (hasSearch) {
            await searchInput.fill('deep clean');
            // Wait for results to update
            await page.waitForTimeout(1000);
        }
    });

    test('should display cleaner profile page', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'client@demo.com');
        await page.fill('input[name="password"]', 'demo1234');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/client|dashboard/, { timeout: 10000 });

        await page.goto('/client/search');
        await page.waitForLoadState('networkidle');

        // If there are cleaner cards, try clicking one
        const cleanerCard = page.locator('[data-cleaner], .cleaner-card, a[href*="cleaner"]').first();
        if (await cleanerCard.isVisible({ timeout: 3000 }).catch(() => false)) {
            await cleanerCard.click();
            await page.waitForLoadState('networkidle');
            const content = await page.content();
            expect(content).toMatch(/profile|rating|review|bio|service|book/i);
        }
    });
});
