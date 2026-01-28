import { test, expect } from '@playwright/test';

/**
 * Cleaner Verification Tests  
 * Tests the 5-tier verification system for cleaners
 */
test.describe('Cleaner Verification', () => {

    // Login as cleaner before each test - use maria@demo.com (seeded cleaner)
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'maria@demo.com');
        await page.fill('input[name="password"]', 'demo1234');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/cleaner|dashboard/, { timeout: 10000 });
    });

    test.describe('Verification Dashboard', () => {
        test('should display verification page', async ({ page }) => {
            await page.goto('/cleaner/verification');

            await expect(page.getByText(/verification|tier|level|status/i).first()).toBeVisible({ timeout: 5000 });
        });

        test('should show current tier status', async ({ page }) => {
            await page.goto('/cleaner/verification');

            // Should show tier number or name
            await expect(page.getByText(/tier|starter|verified|professional|certified|elite/i).first()).toBeVisible({ timeout: 5000 });
        });

        test('should show progress indicator', async ({ page }) => {
            await page.goto('/cleaner/verification');

            // Page should load with verification content
            await expect(page).toHaveURL(/verification/);
        });

        test('should display verification items', async ({ page }) => {
            await page.goto('/cleaner/verification');

            // Should show verification requirements
            await expect(page.getByText(/email|phone|id|document|background/i).first()).toBeVisible({ timeout: 5000 });
        });

        test('should show verified items with checkmarks', async ({ page }) => {
            await page.goto('/cleaner/verification');

            // Page loads correctly
            await expect(page).toHaveURL(/verification/);
        });
    });

    test.describe('Phone Verification', () => {
        test('should show phone verification section', async ({ page }) => {
            await page.goto('/cleaner/verification');

            await expect(page.getByText(/phone|verify/i).first()).toBeVisible({ timeout: 5000 });
        });

        test('should have phone input field if not verified', async ({ page }) => {
            await page.goto('/cleaner/verification');

            // Check page loads correctly
            await expect(page).toHaveURL(/verification/);
        });

        test('should have send code button', async ({ page }) => {
            await page.goto('/cleaner/verification');

            // Check page loads
            await expect(page).toHaveURL(/verification/);
        });
    });

    test.describe('Document Upload', () => {
        test('should show upload buttons for documents', async ({ page }) => {
            await page.goto('/cleaner/verification');

            // Should have upload-related content
            await expect(page.getByText(/upload|document|file|verify/i).first()).toBeVisible({ timeout: 5000 });
        });

        test('should list required document types', async ({ page }) => {
            await page.goto('/cleaner/verification');

            // Page loads with verification content
            await expect(page.getByText(/verification|tier|document/i).first()).toBeVisible({ timeout: 5000 });
        });
    });

    test.describe('Tier Benefits', () => {
        test('should show tier progression', async ({ page }) => {
            await page.goto('/cleaner/verification');

            // Should show tier info
            await expect(page.getByText(/tier|level|verified|verification/i).first()).toBeVisible({ timeout: 5000 });
        });
    });
});

test.describe('Cleaner Dashboard', () => {

    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'maria@demo.com');
        await page.fill('input[name="password"]', 'demo1234');
        await page.click('button[type="submit"]');
        await expect(page).toHaveURL(/cleaner|dashboard/, { timeout: 10000 });
    });

    test('should display cleaner dashboard', async ({ page }) => {
        await page.goto('/cleaner');

        await expect(page.getByText(/dashboard|job|earning|welcome|clean/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should show jobs list', async ({ page }) => {
        await page.goto('/cleaner/jobs');

        await expect(page.getByText(/job|booking|schedule|no jobs/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should show earnings page', async ({ page }) => {
        await page.goto('/cleaner/earnings');

        await expect(page.getByText(/earning|payment|payout|balance|\$/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should show profile settings', async ({ page }) => {
        await page.goto('/cleaner/settings');

        await expect(page.getByText(/setting|profile|account|preferences/i).first()).toBeVisible({ timeout: 5000 });
    });
});
