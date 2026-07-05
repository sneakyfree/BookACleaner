import { defineConfig, devices } from '@playwright/test';

/**
 * Dedicated config for the link-crawl guard.
 *
 * Unlike playwright.config.ts this does NOT boot a dev server — CI (and the
 * local proof harness) boot a PRODUCTION build + the API themselves and pass
 * the URL via BASE_URL. The dev server emits false 500s on cold chunks, so the
 * crawl must run against the standalone production output.
 */
export default defineConfig({
    testDir: './tests',
    testMatch: 'link-crawl.spec.ts',

    fullyParallel: false,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 1,
    workers: 1,

    reporter: [
        ['html', { open: 'never', outputFolder: 'playwright-report' }],
        ['list'],
    ],

    use: {
        baseURL: process.env.BASE_URL || 'http://localhost:3002',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
        video: 'off',
    },

    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],

    // Whole-suite guard; individual tests raise their own budget.
    timeout: 8 * 60 * 1000,
    expect: {
        timeout: 8 * 1000,
    },
});
