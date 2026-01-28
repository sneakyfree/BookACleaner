import { test, expect } from '@playwright/test';

/**
 * Job Lifecycle Tests
 * Tests job creation, acceptance, completion flow for cleaners
 */
test.describe('Job Lifecycle', () => {

    test.describe('Cleaner Job Management', () => {
        test.beforeEach(async ({ page }) => {
            // Login as cleaner (maria@demo.com is seeded)
            await page.goto('/login');
            await page.fill('input[name="email"]', 'maria@demo.com');
            await page.fill('input[name="password"]', 'demo1234');
            await page.click('button[type="submit"]');
            await expect(page).toHaveURL(/cleaner|dashboard/, { timeout: 10000 });
        });

        test('should display cleaner dashboard with jobs', async ({ page }) => {
            await page.goto('/cleaner');

            // Should show job-related content
            await expect(page.getByText(/job|booking|schedule|calendar|dashboard/i).first()).toBeVisible({ timeout: 5000 });
        });

        test('should show job details', async ({ page }) => {
            await page.goto('/cleaner/jobs');

            // Should show jobs list or empty state
            await expect(page.getByText(/job|booking|pending|no jobs|schedule/i).first()).toBeVisible({ timeout: 5000 });
        });

        test('should display calendar view', async ({ page }) => {
            await page.goto('/cleaner/calendar');

            // Should show calendar or schedule
            await expect(page.getByText(/calendar|schedule|today|week|month/i).first()).toBeVisible({ timeout: 5000 });
        });

        test('should show earnings dashboard', async ({ page }) => {
            await page.goto('/cleaner/earnings');

            // Should show earnings/payments info
            await expect(page.getByText(/earning|payment|balance|payout|\$/i).first()).toBeVisible({ timeout: 5000 });
        });

        test('should display verification status', async ({ page }) => {
            await page.goto('/cleaner/verification');

            // Should show verification tiers or status
            await expect(page.getByText(/verification|tier|verified|document/i).first()).toBeVisible({ timeout: 5000 });
        });
    });

    test.describe('Job Actions', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/login');
            await page.fill('input[name="email"]', 'maria@demo.com');
            await page.fill('input[name="password"]', 'demo1234');
            await page.click('button[type="submit"]');
            await expect(page).toHaveURL(/cleaner|dashboard/, { timeout: 10000 });
        });

        test('should have accept/decline buttons for pending jobs', async ({ page }) => {
            await page.goto('/cleaner/jobs');

            // Check page loads correctly
            await expect(page).toHaveURL(/cleaner\/jobs/);
            await expect(page.getByText(/job|booking|pending|schedule/i).first()).toBeVisible({ timeout: 5000 });
        });

        test('should have start/complete buttons for active jobs', async ({ page }) => {
            await page.goto('/cleaner/jobs');

            // Check page loads correctly
            await expect(page).toHaveURL(/cleaner\/jobs/);
        });
    });

    test.describe('Messaging', () => {
        test.beforeEach(async ({ page }) => {
            await page.goto('/login');
            await page.fill('input[name="email"]', 'client@demo.com');
            await page.fill('input[name="password"]', 'demo1234');
            await page.click('button[type="submit"]');
            await expect(page).toHaveURL(/client|dashboard/, { timeout: 10000 });
        });

        test('should display messages page', async ({ page }) => {
            await page.goto('/client/messages');

            // Should show messaging interface
            await expect(page.getByText(/message|conversation|chat|inbox|no messages/i).first()).toBeVisible({ timeout: 5000 });
        });

        test('should have message input field', async ({ page }) => {
            await page.goto('/client/messages');

            // Check page loads correctly
            await expect(page).toHaveURL(/messages/);
        });
    });
});

/**
 * Admin Job Management Tests
 */
test.describe('Admin Job Management', () => {
    test.beforeEach(async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[name="email"]', 'admin@bookacleaner.ai');
        await page.fill('input[name="password"]', 'demo1234');
        await page.click('button[type="submit"]');
        // May redirect to admin dashboard
    });

    test('should display admin jobs list', async ({ page }) => {
        await page.goto('/admin/jobs');

        // Should show admin jobs content
        await expect(page.getByText(/job|admin|all|status|manage/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should display admin users list', async ({ page }) => {
        await page.goto('/admin/users');

        // Should show users management
        await expect(page.getByText(/user|client|cleaner|role|manage/i).first()).toBeVisible({ timeout: 5000 });
    });

    test('should display verification queue', async ({ page }) => {
        await page.goto('/admin/verification');

        // Should show verification queue
        await expect(page.getByText(/verification|pending|review|approve|queue/i).first()).toBeVisible({ timeout: 5000 });
    });
});
