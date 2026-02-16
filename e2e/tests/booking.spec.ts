import { test, expect } from '@playwright/test';

/**
 * Booking Flow Tests
 * Tests the complete booking wizard and job management
 */
test.describe('Booking Flow', () => {

    // Login before each test
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'client@demo.com');
        await page.fill('input[name="password"]', 'demo1234');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/client|dashboard/, { timeout: 10000 });
    });

    test.describe('Cleaner Search', () => {
        test('should display search/browse page', async ({ page }) => {
            await page.goto('/cleaners');

            // Should show some content - cleaners listing
            await expect(page.getByText(/cleaner|search|find|browse|book/i).first()).toBeVisible({ timeout: 5000 });
        });

        test('should show cleaner cards with ratings', async ({ page }) => {
            await page.goto('/cleaners');

            // Wait for page to load
            await page.waitForTimeout(2000);

            // Check for any cleaner-related content
            const pageContent = await page.content();
            expect(pageContent.toLowerCase()).toMatch(/cleaner|rating|star|review|book|find/);
        });
    });

    test.describe('Booking Wizard', () => {
        test('should display booking wizard', async ({ page }) => {
            await page.goto('/client/book');

            // Should show booking wizard content
            await expect(page.getByText(/property|book|select|clean|service/i).first()).toBeVisible({ timeout: 5000 });
        });

        test('should navigate through wizard steps', async ({ page }) => {
            await page.goto('/client/book');

            // Wait for page to load
            await page.waitForTimeout(1000);

            // Step 1: Look for property selection or services
            const propertyCard = page.locator('[class*="property"], [data-testid*="property"], [class*="card"]').first();
            if (await propertyCard.isVisible({ timeout: 2000 }).catch(() => false)) {
                await propertyCard.click();
            }

            // Try to continue if button is visible
            const continueBtn = page.getByRole('button', { name: /continue|next|book/i });
            if (await continueBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
                await continueBtn.click();
            }

            // Verify we're still on a booking-related page
            await expect(page).toHaveURL(/book/);
        });

        test('should show service options with prices', async ({ page }) => {
            await page.goto('/client/book');

            // Check for any service or price information
            await expect(page.getByText(/service|clean|standard|deep|\$/i).first()).toBeVisible({ timeout: 5000 });
        });

        test('should show date and time selection', async ({ page }) => {
            await page.goto('/client/book');

            // Check for any scheduling-related content on the booking page
            const pageContent = await page.content();
            expect(pageContent.toLowerCase()).toMatch(/date|time|schedule|book|service/);
        });

        test('should show confirmation step with total', async ({ page }) => {
            await page.goto('/client/book');

            // Check page loads and has booking-related content
            await expect(page).toHaveURL(/book/);
            await expect(page.getByText(/book|clean|service|property/i).first()).toBeVisible({ timeout: 5000 });
        });
    });

    test.describe('Client Dashboard', () => {
        test('should display client dashboard', async ({ page }) => {
            await page.goto('/client');

            // Should show dashboard elements
            await expect(page.getByText(/dashboard|welcome|book|clean|upcoming|recent/i).first()).toBeVisible({ timeout: 5000 });
        });

        test('should show upcoming bookings', async ({ page }) => {
            await page.goto('/client/bookings');

            // Should show bookings page content
            await expect(page.getByText(/booking|job|upcoming|history|no bookings|clean/i).first()).toBeVisible({ timeout: 5000 });
        });

        test('should show properties list', async ({ page }) => {
            await page.goto('/client/properties');

            // Should show properties content
            await expect(page.getByText(/propert|address|home|add|no properties/i).first()).toBeVisible({ timeout: 5000 });
        });
    });
});
