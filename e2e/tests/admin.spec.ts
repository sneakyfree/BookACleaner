import { test, expect } from '@playwright/test';

/**
 * Admin Dashboard E2E Tests
 * Tests admin pages for analytics, users, verifications, disputes
 */
test.describe('Admin', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'admin@demo.com');
        await page.fill('input[name="password"]', 'demo1234');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/admin|dashboard/, { timeout: 10000 });
    });

    test('should display admin analytics page', async ({ page }) => {
        await page.goto('/admin/analytics');
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).toMatch(/analytic|revenue|user|stat|chart/i);
    });

    test('should display admin users page', async ({ page }) => {
        await page.goto('/admin/users');
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).toMatch(/user|email|role|manage/i);
    });

    test('should display admin verifications page', async ({ page }) => {
        await page.goto('/admin/verifications');
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).toMatch(/verification|pending|approve|document/i);
    });

    test('should display admin disputes page', async ({ page }) => {
        await page.goto('/admin/disputes');
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).toMatch(/dispute|resolution|case|status/i);
    });
});
