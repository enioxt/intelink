import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: false,
    retries: process.env.CI ? 1 : 0,
    reporter: 'list',
    timeout: 30_000,
    use: {
        baseURL: process.env.E2E_BASE_URL || 'http://localhost:3001',
        trace: 'on-first-retry',
        screenshot: 'only-on-failure',
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
    ],
    // Do not start dev server automatically — point to running instance
});
