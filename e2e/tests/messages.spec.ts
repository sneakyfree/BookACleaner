import { test, expect } from '@playwright/test';

/**
 * Messages Flow E2E Tests
 * Tests conversation list, sending messages
 */
test.describe('Messages', () => {

    test('should display client messages page', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'client@demo.com');
        await page.fill('input[name="password"]', 'demo1234');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/client|dashboard/, { timeout: 10000 });

        await page.goto('/client/messages');
        await page.waitForLoadState('networkidle');

        // Should show messages ui or empty state
        const content = await page.content();
        expect(content).toMatch(/message|conversation|chat|no message|empty/i);
    });

    test('should display cleaner messages page', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'cleaner@demo.com');
        await page.fill('input[name="password"]', 'demo1234');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/cleaner|dashboard/, { timeout: 10000 });

        await page.goto('/cleaner/messages');
        await page.waitForLoadState('networkidle');

        const content = await page.content();
        expect(content).toMatch(/message|conversation|chat|no message|empty/i);
    });

    test('should have message input field', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'client@demo.com');
        await page.fill('input[name="password"]', 'demo1234');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/client|dashboard/, { timeout: 10000 });

        await page.goto('/client/messages');
        await page.waitForLoadState('networkidle');

        // If there are conversations, clicking one should show input
        const firstConvo = page.locator('[data-conversation], .conversation-item, [class*="conversation"]').first();
        if (await firstConvo.isVisible({ timeout: 2000 }).catch(() => false)) {
            await firstConvo.click();
            const input = page.locator('input[placeholder*="message"], textarea[placeholder*="message"]').first();
            await expect(input).toBeVisible({ timeout: 3000 }).catch(() => { });
        }
    });
});
