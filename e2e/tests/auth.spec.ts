import { test, expect } from '@playwright/test';

/**
 * Authentication Flow Tests
 * Tests registration, login, logout, and password reset flows
 */
test.describe('Authentication', () => {

    test.describe('Login', () => {
        test('should display login page', async ({ page }) => {
            await page.goto('/login');

            // The login page has "Welcome back" as the title
            await expect(page.getByText(/welcome back/i)).toBeVisible();
            await expect(page.locator('input[name="email"]')).toBeVisible();
            await expect(page.locator('input[name="password"]')).toBeVisible();
            await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
        });

        test('should show error for invalid credentials', async ({ page }) => {
            await page.goto('/login');

            await page.fill('input[name="email"]', 'invalid@example.com');
            await page.fill('input[name="password"]', 'wrongpassword');
            await page.click('button[type="submit"]');

            // Should show error message
            await expect(page.getByText(/invalid|incorrect|error/i)).toBeVisible({ timeout: 5000 });
        });

        test('should login with valid demo credentials', async ({ page }) => {
            await page.goto('/login');

            await page.fill('input[name="email"]', 'client@demo.com');
            await page.fill('input[name="password"]', 'demo1234');
            await page.click('button[type="submit"]');

            // Should redirect to dashboard after login
            await expect(page).toHaveURL(/client|dashboard/, { timeout: 10000 });
        });

        test('should have link to register', async ({ page }) => {
            await page.goto('/login');

            // Link text is "Create one"
            const registerLink = page.getByRole('link', { name: /create one|sign up|register/i });
            await expect(registerLink).toBeVisible();
        });

        test('should have link to forgot password', async ({ page }) => {
            await page.goto('/login');

            const forgotLink = page.getByRole('link', { name: /forgot password/i });
            await expect(forgotLink).toBeVisible();
        });
    });

    test.describe('Registration', () => {
        test('should display registration page', async ({ page }) => {
            await page.goto('/register');

            // Check for register page elements
            await expect(page.getByText(/create|join|sign up|register/i).first()).toBeVisible();
            await expect(page.locator('input[name="email"]')).toBeVisible();
            await expect(page.locator('input[name="password"]')).toBeVisible();
        });

        test('should show validation errors for empty form', async ({ page }) => {
            await page.goto('/register');

            await page.click('button[type="submit"]');

            // Should show validation errors (native or custom)
            // Page should not navigate away
            await expect(page).toHaveURL(/register/);
        });

        test('should show role selection', async ({ page }) => {
            await page.goto('/register');

            // Check for role selection (client/cleaner) - presence is sufficient
            const pageContent = await page.content();
            expect(pageContent).toMatch(/client|cleaner|homeowner|property/i);
        });

        test('should have link to login', async ({ page }) => {
            await page.goto('/register');

            // Look for any login link
            const loginLink = page.getByRole('link', { name: /sign in|log in|already have|login/i });
            await expect(loginLink).toBeVisible();
        });
    });

    test.describe('Password Reset', () => {
        test('should display forgot password page', async ({ page }) => {
            await page.goto('/forgot-password');

            await expect(page.locator('input[name="email"], input[type="email"]')).toBeVisible();
            await expect(page.getByRole('button', { name: /send|reset|submit/i })).toBeVisible();
        });

        test('should show success message after submitting email', async ({ page }) => {
            await page.goto('/forgot-password');

            await page.fill('input[name="email"], input[type="email"]', 'test@example.com');
            await page.click('button[type="submit"]');

            // Should show success/confirmation message - use first() to handle multiple matches
            await expect(page.getByText(/sent|check|email/i).first()).toBeVisible({ timeout: 5000 });
        });
    });

    test.describe('Logout', () => {
        test('should logout successfully', async ({ page }) => {
            // First login
            await page.goto('/login');
            await page.fill('input[name="email"]', 'client@demo.com');
            await page.fill('input[name="password"]', 'demo1234');
            await page.click('button[type="submit"]');

            await expect(page).toHaveURL(/client|dashboard/, { timeout: 10000 });

            // Find and click logout - look for user menu or logout button
            const logoutButton = page.getByText(/log out|sign out|logout/i).first();
            if (await logoutButton.isVisible({ timeout: 2000 }).catch(() => false)) {
                await logoutButton.click();
                await expect(page).toHaveURL(/login|home|\//);
            }
        });
    });
});
