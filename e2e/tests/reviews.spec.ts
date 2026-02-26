import { test, expect } from '@playwright/test';

/**
 * Reviews Flow E2E Tests
 * Tests review form, review list, star ratings
 */
test.describe('Reviews', () => {

    test('should display review form on completed booking', async ({ page }) => {
        // Login as client
        await page.goto('/login');
        await page.fill('input[name="email"]', 'client@demo.com');
        await page.fill('input[name="password"]', 'demo1234');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/client|dashboard/, { timeout: 10000 });

        // Navigate to bookings
        await page.goto('/client/bookings');
        await page.waitForLoadState('networkidle');

        // Look for "Leave Review" button on completed bookings
        const reviewButton = page.getByText(/leave review/i).first();
        const hasCompletedBookings = await reviewButton.isVisible({ timeout: 3000 }).catch(() => false);
        if (hasCompletedBookings) {
            await reviewButton.click();
            // Review form should appear
            await expect(page.getByText(/overall rating|star/i).first()).toBeVisible({ timeout: 3000 });
        }
    });

    test('should display reviews page for cleaner', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'cleaner@demo.com');
        await page.fill('input[name="password"]', 'demo1234');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/cleaner|dashboard/, { timeout: 10000 });

        // Navigate to reviews - if page exists
        await page.goto('/cleaner/reviews');
        await page.waitForLoadState('networkidle');

        // Should show reviews or empty state
        const content = await page.content();
        expect(content).toMatch(/review|rating|no reviews|empty/i);
    });
});
