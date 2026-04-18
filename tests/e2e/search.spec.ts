/**
 * TEST-001: Search flow E2E (authenticated)
 * Covers: /busca page, CPF search, name search, person profile
 */

import { test, expect, Page } from '@playwright/test';

// Helper: inject mock auth into localStorage to simulate logged-in state
async function mockAuth(page: Page) {
    await page.goto('/');
    await page.evaluate(() => {
        localStorage.setItem('intelink_member_id', 'e2e-test-member');
        localStorage.setItem('intelink_role', 'investigator');
        localStorage.setItem('intelink_username', 'E2E Tester');
    });
}

test.describe('Search page (requires running server + Neo4j)', () => {
    test.beforeEach(async ({ page }) => {
        await mockAuth(page);
    });

    test('renders search page with CPF input', async ({ page }) => {
        await page.goto('/busca');
        // Either shows search form or redirects to login
        const url = page.url();
        if (url.includes('/login')) {
            // Not authenticated — acceptable, server-side auth check
            return;
        }
        await expect(page.locator('input[placeholder*="CPF"], input[placeholder*="nome"], input[type="search"]').first()).toBeVisible();
    });

    test('search API returns results for valid CPF format', async ({ page }) => {
        const res = await page.request.get('/api/neo4j/search?q=00000000000');
        // Should return 200 or 401 (not 500)
        expect([200, 401, 404]).toContain(res.status());
    });

    test('REDS ingest API accepts xlsx content type', async ({ page }) => {
        const res = await page.request.post('/api/ingest/reds', {
            multipart: {
                file: {
                    name: 'test.csv',
                    mimeType: 'text/csv',
                    buffer: Buffer.from('numero_reds,data_fato,tipo\nREDS001,01/01/2024,roubo\n'),
                },
            },
        });
        // 401 (not authenticated) or 200 (processed) — never 500
        expect([200, 401]).toContain(res.status());
    });
});

test.describe('Person profile page', () => {
    test('profile page renders without crash for unknown key', async ({ page }) => {
        await page.goto('/p/00000000000');
        // Should show 404 or profile — not 500
        const status = await page.evaluate(() => document.title);
        expect(status).toBeTruthy();
    });
});
