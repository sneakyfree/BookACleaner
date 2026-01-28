import { test, expect } from '@playwright/test';

/**
 * API Integration Tests
 * Tests API endpoints directly using Playwright's request context
 */
test.describe('API Integration', () => {

    const API_URL = process.env.API_URL || 'http://localhost:8002';

    test.describe('Health Check', () => {
        test('should return healthy status', async ({ request }) => {
            const response = await request.get(`${API_URL}/health`);

            expect(response.ok()).toBeTruthy();

            const data = await response.json();
            expect(data.status).toBe('healthy');
        });
    });

    test.describe('Cleaners API', () => {
        test('should return list of cleaners', async ({ request }) => {
            const response = await request.get(`${API_URL}/api/v1/cleaners/`);

            expect(response.ok()).toBeTruthy();

            const data = await response.json();
            expect(data.cleaners).toBeDefined();
            expect(Array.isArray(data.cleaners)).toBeTruthy();
            expect(data.cleaners.length).toBeGreaterThan(0);
        });

        test('should return cleaner with expected fields', async ({ request }) => {
            const response = await request.get(`${API_URL}/api/v1/cleaners/`);
            const data = await response.json();

            const cleaner = data.cleaners[0];
            expect(cleaner.id).toBeDefined();
            expect(cleaner.businessName).toBeDefined();
            expect(cleaner.verificationTier).toBeDefined();
            expect(cleaner.overallRating).toBeDefined();
        });
    });

    test.describe('Verification Types API', () => {
        test('should return verification types', async ({ request }) => {
            const response = await request.get(`${API_URL}/api/v1/verification/types`);

            expect(response.ok()).toBeTruthy();

            const data = await response.json();
            expect(data.types).toBeDefined();
            expect(data.tiers).toBeDefined();
        });

        test('should have 5 tiers defined', async ({ request }) => {
            const response = await request.get(`${API_URL}/api/v1/verification/types`);
            const data = await response.json();

            expect(Object.keys(data.tiers).length).toBe(5);
        });
    });

    test.describe('Jobs Estimate API', () => {
        test('should calculate job estimate', async ({ request }) => {
            const response = await request.post(`${API_URL}/api/v1/jobs/estimate`, {
                data: {
                    property_id: 'prop-1',
                    services: ['standard', 'deep'],
                    add_ons: []
                }
            });

            expect(response.ok()).toBeTruthy();

            const data = await response.json();
            expect(data.estimated).toBe(true);
            expect(data.total).toBeGreaterThan(0);
            expect(data.estimated_hours).toBeGreaterThan(0);
        });

        test('should return estimate breakdown', async ({ request }) => {
            const response = await request.post(`${API_URL}/api/v1/jobs/estimate`, {
                data: {
                    property_id: 'prop-1',
                    services: ['standard'],
                    add_ons: ['carpet']
                }
            });

            const data = await response.json();
            expect(data.estimates).toBeDefined();
            expect(data.estimates.standard).toBeDefined();
        });
    });

    test.describe('Authentication API', () => {
        test('should reject login with invalid credentials', async ({ request }) => {
            const response = await request.post(`${API_URL}/api/v1/auth/login`, {
                data: {
                    email: 'invalid@example.com',
                    password: 'wrongpassword'
                }
            });

            expect(response.status()).toBe(401);
        });

        test('should return token on valid login', async ({ request }) => {
            const response = await request.post(`${API_URL}/api/v1/auth/login`, {
                data: {
                    email: 'client@demo.com',
                    password: 'demo1234'
                }
            });

            expect(response.ok()).toBeTruthy();

            const data = await response.json();
            expect(data.access_token).toBeDefined();
            expect(data.token_type).toBe('bearer');
        });
    });

    test.describe('Protected Endpoints', () => {
        let authToken: string;

        test.beforeAll(async ({ request }) => {
            const response = await request.post(`${API_URL}/api/v1/auth/login`, {
                data: {
                    email: 'client@demo.com',
                    password: 'demo1234'
                }
            });
            const data = await response.json();
            authToken = data.access_token;
        });

        test('should require auth for verification status', async ({ request }) => {
            const response = await request.get(`${API_URL}/api/v1/verification/status`);

            expect(response.status()).toBe(401);
        });

        test('should access verification with auth', async ({ request }) => {
            const response = await request.get(`${API_URL}/api/v1/verification/status`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            expect(response.ok()).toBeTruthy();
        });

        test('should access properties with auth', async ({ request }) => {
            const response = await request.get(`${API_URL}/api/v1/properties/`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });

            expect(response.ok()).toBeTruthy();
        });
    });
});
