import { defineConfig, devices } from '@playwright/test';

/**
 * BookACleaner E2E Test Configuration
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
    testDir: './tests',

    /* Run tests in files in parallel */
    fullyParallel: true,

    /* Fail the build on CI if you accidentally left test.only in the source code */
    forbidOnly: !!process.env.CI,

    /* Retry on CI only */
    retries: process.env.CI ? 2 : 0,

    /* Opt out of parallel tests on CI */
    workers: process.env.CI ? 1 : undefined,

    /* Reporter to use */
    reporter: [
        ['html', { open: 'never' }],
        ['list'],
    ],

    /* Shared settings for all the projects below */
    use: {
        /* Base URL to use in actions like `await page.goto('/')` */
        baseURL: process.env.BASE_URL || 'http://localhost:3002',

        /* Collect trace when retrying the failed test */
        trace: 'on-first-retry',

        /* Screenshot on failure */
        screenshot: 'only-on-failure',

        /* Video on failure */
        video: 'on-first-retry',
    },

    /* Configure projects for major browsers */
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        // Uncomment for additional browser testing
        // {
        //   name: 'firefox',
        //   use: { ...devices['Desktop Firefox'] },
        // },
        // {
        //   name: 'webkit',
        //   use: { ...devices['Desktop Safari'] },
        // },
    ],

    /* Run your local dev servers before starting the tests */
    webServer: [
        {
            command: 'npm run dev',
            url: 'http://localhost:3002',
            cwd: '../apps/web',
            reuseExistingServer: !process.env.CI,
            timeout: 120 * 1000,
        },
        {
            command: 'bash -c "source venv/bin/activate && uvicorn app.main:app --reload --port 8002"',
            url: 'http://localhost:8002/health',
            cwd: '../apps/api',
            reuseExistingServer: !process.env.CI,
            timeout: 120 * 1000,
        },
    ],

    /* Global timeout */
    timeout: 30 * 1000,

    /* Expect timeout */
    expect: {
        timeout: 5 * 1000,
    },
});
