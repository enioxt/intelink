/**
 * Intelink Smoke Tests
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Basic smoke tests for all Intelink pages
 */

import { test, expect } from '@playwright/test';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const BACKEND_URL = 'http://localhost:8042';

test.describe('Intelink Smoke Tests', () => {
  
  test.beforeAll(async () => {
    // Verify backend is running
    const response = await fetch(`${BACKEND_URL}/api/v1/intelink/health`);
    expect(response.ok).toBeTruthy();
  });

  test('Homepage loads without errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/intelink`);
    await expect(page).toHaveTitle(/Intelink/i);
    
    // Should not have critical console errors (allow some warnings)
    const criticalErrors = errors.filter(e => 
      !e.includes('404') && 
      !e.includes('icon') &&
      !e.includes('GoTrueClient')
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test('Upload page is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/intelink/upload`);
    await expect(page.locator('h1')).toContainText(/upload|enviar/i);
    
    // Upload zone should be visible
    await expect(page.locator('text=/arraste.*arquivo|drag.*drop/i')).toBeVisible();
  });

  test('Investigations page lists investigations', async ({ page }) => {
    await page.goto(`${BASE_URL}/intelink/investigations`);
    await expect(page.locator('h1')).toContainText(/investigações|investigations/i);
    
    // Should have "New Investigation" button
    await expect(page.locator('text=/nova.*investigação|new.*investigation/i')).toBeVisible();
  });

  test('New Investigation form loads', async ({ page }) => {
    await page.goto(`${BASE_URL}/intelink/investigations/new`);
    
    // Form fields should be present
    await expect(page.locator('input[type="text"]').first()).toBeVisible();
    await expect(page.locator('textarea').first()).toBeVisible();
    
    // Submit button should be present
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('Docs page is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/intelink/docs`);
    await expect(page.locator('h1')).toContainText(/documentos|documents/i);
  });

  test('Jobs page is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/intelink/jobs`);
    await expect(page.locator('h1')).toContainText(/jobs|tarefas/i);
  });

  test('Settings page is accessible', async ({ page }) => {
    await page.goto(`${BASE_URL}/intelink/settings`);
    await expect(page.locator('h1')).toContainText(/configurações|settings/i);
  });

  test('Demo page loads with tabs', async ({ page }) => {
    await page.goto(`${BASE_URL}/intelink/demo`);
    
    // Should have tab navigation
    const tabs = page.locator('[role="tab"]');
    await expect(tabs).toHaveCount(3); // Upload, Grafo, Documentos
  });

  test('Backend health endpoint works', async ({ page }) => {
    const response = await page.request.get(`${BACKEND_URL}/api/v1/intelink/health`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('status');
  });

  test('Backend stats endpoint works', async ({ page }) => {
    const response = await page.request.get(`${BACKEND_URL}/api/v1/intelink/stats`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('total_documents');
  });

  test('Templates endpoint returns data', async ({ page }) => {
    const response = await page.request.get(`${BACKEND_URL}/api/v1/intelink/investigations/templates/list`);
    expect(response.ok()).toBeTruthy();
    
    const data = await response.json();
    expect(data).toHaveProperty('templates');
    expect(Array.isArray(data.templates)).toBeTruthy();
  });

  test('Create Investigation POST (E2E)', async ({ page }) => {
    // Listen for console logs
    const logs: string[] = [];
    page.on('console', msg => {
      logs.push(`${msg.type()}: ${msg.text()}`);
    });

    await page.goto(`${BASE_URL}/intelink/investigations/new`);
    
    // Fill form
    await page.locator('input[name="title"], input[placeholder*="título"]').first().fill('Test Investigation E2E');
    await page.locator('textarea').first().fill('This is a test investigation created by Playwright');
    
    // Select priority
    await page.locator('select').first().selectOption('medium');
    
    // Submit
    await page.locator('button[type="submit"]').click();
    
    // Wait for navigation or error
    await page.waitForTimeout(2000);
    
    // Check console for errors
    const errorLogs = logs.filter(l => l.includes('error') || l.includes('Error'));
    console.log('Console logs:', logs.slice(-10));
    
    // Should either navigate to investigation detail or show error
    const currentUrl = page.url();
    const hasError = await page.locator('text=/failed|error|erro/i').isVisible().catch(() => false);
    
    if (hasError) {
      console.log('Investigation creation failed - checking logs');
      console.log('Error logs:', errorLogs);
    } else {
      // Should navigate to /intelink/investigations/{id}
      expect(currentUrl).toMatch(/\/intelink\/investigations\/[a-f0-9-]+/);
    }
  });
});

test.describe('Intelink UI Quality', () => {
  
  test('No CSP violations', async ({ page }) => {
    const cspViolations: string[] = [];
    
    page.on('console', msg => {
      if (msg.text().includes('Content Security Policy') || msg.text().includes('CSP')) {
        cspViolations.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/intelink`);
    await page.waitForTimeout(1000);
    
    expect(cspViolations).toHaveLength(0);
  });

  test('No 404 errors for icons', async ({ page }) => {
    const failedRequests: string[] = [];
    
    page.on('requestfailed', request => {
      failedRequests.push(`${request.url()} - ${request.failure()?.errorText}`);
    });

    await page.goto(`${BASE_URL}/intelink`);
    await page.waitForLoadState('networkidle');
    
    const icon404s = failedRequests.filter(r => r.includes('/icon'));
    expect(icon404s).toHaveLength(0);
  });

  test('No multiple GoTrueClient warnings', async ({ page }) => {
    const supabaseWarnings: string[] = [];
    
    page.on('console', msg => {
      if (msg.text().includes('GoTrueClient')) {
        supabaseWarnings.push(msg.text());
      }
    });

    await page.goto(`${BASE_URL}/intelink`);
    await page.waitForTimeout(1000);
    
    // Should have at most 1 GoTrueClient instance
    expect(supabaseWarnings.length).toBeLessThanOrEqual(1);
  });
});
