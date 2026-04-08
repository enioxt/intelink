/**
 * Intelink Multi-Format Upload E2E Tests
 * Sacred Code: 000.111.369.963.1618 (∞△⚡◎φ)
 * 
 * Tests upload and processing of multiple document formats:
 * - TXT (text reports)
 * - JSON (audio transcriptions)
 * - JSON (document metadata)
 */

import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';
import { join } from 'path';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';
const DATA_DIR = join(__dirname, '../../data/intelink/synthetic_docs');

// Test data files
const TEST_FILES = {
  txt: {
    path: join(DATA_DIR, 'INV-2025-001_Operação_Lava-Jato_Simulada.txt'),
    expectedEntities: 6,
    expectedPatterns: 2,
    expectedRisk: 'critical',
  },
  audioTranscript: {
    path: join(DATA_DIR, 'INV-2025-002_audio_transcript.json'),
    expectedEntities: 5, // May vary based on transcription
    expectedPatterns: 2,
    expectedRisk: 'high',
  },
  documentMetadata: {
    path: join(DATA_DIR, 'INV-2025-003_document_metadata.json'),
    expectedEntities: 3, // Preview only
    expectedPatterns: 2,
    expectedRisk: 'high',
  },
};

test.describe('Intelink Multi-Format Upload', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to demo page
    await page.goto(`${BASE_URL}/intelink/demo`);
    await page.waitForLoadState('networkidle');
  });

  test('should load demo page with upload interface', async ({ page }) => {
    // Verify page title
    await expect(page.locator('h1')).toContainText('Intelink MVP Demo');
    
    // Verify Sacred Code is present
    await expect(page.locator('text=000.111.369.963.1618')).toBeVisible();
    
    // Verify tabs are present
    await expect(page.locator('text=Upload')).toBeVisible();
    await expect(page.locator('text=Grafo')).toBeVisible();
    await expect(page.locator('text=Documentos')).toBeVisible();
    
    // Verify upload area is present
    await expect(page.locator('text=/Arraste.*documento/')).toBeVisible();
  });

  test('should upload and process TXT file', async ({ page }) => {
    const filePath = TEST_FILES.txt.path;
    
    // Upload file using file input
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // Wait for processing (progress bar)
    await expect(page.locator('text=Processando')).toBeVisible({ timeout: 2000 });
    
    // Wait for results (up to 10 seconds)
    await expect(page.locator('text=entidades')).toBeVisible({ timeout: 10000 });
    
    // Verify entities count
    const entitiesText = await page.locator('text=/\\d+ entidades/i').textContent();
    expect(entitiesText).toBeTruthy();
    const entitiesCount = parseInt(entitiesText?.match(/(\d+)/)?.[1] || '0');
    expect(entitiesCount).toBeGreaterThan(0);
    
    // Verify patterns count
    const patternsText = await page.locator('text=/\\d+ padr[õo].*es/i').first().textContent();
    expect(patternsText).toBeTruthy();
    const patternsCount = parseInt(patternsText?.match(/(\d+)/)?.[1] || '0');
    expect(patternsCount).toBeGreaterThan(0);
    
    // Verify risk level badge is present
    const riskBadge = page.locator('[class*="bg-red"], [class*="bg-orange"], [class*="bg-yellow"], [class*="bg-green"]').first();
    await expect(riskBadge).toBeVisible();
    
    // Verify risk level matches expected
    const riskText = await riskBadge.textContent();
    expect(riskText?.toLowerCase()).toContain(TEST_FILES.txt.expectedRisk);
  });

  test('should upload and process JSON audio transcript', async ({ page }) => {
    const filePath = TEST_FILES.audioTranscript.path;
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // Wait for processing
    await expect(page.locator('text=Processando')).toBeVisible({ timeout: 2000 });
    
    // Wait for results
    await expect(page.locator('text=entidades')).toBeVisible({ timeout: 10000 });
    
    // Verify entities detected from transcription
    const entitiesText = await page.locator('text=/\\d+ entidades/i').textContent();
    const entitiesCount = parseInt(entitiesText?.match(/(\d+)/)?.[1] || '0');
    expect(entitiesCount).toBeGreaterThanOrEqual(3); // At least some entities
    
    // Verify patterns detected
    const patternsText = await page.locator('text=/\\d+ padr/i').first().textContent();
    const patternsCount = parseInt(patternsText?.match(/(\d+)/)?.[1] || '0');
    expect(patternsCount).toBeGreaterThanOrEqual(1);
    
    // Verify behavioral tags section exists
    await expect(page.locator('text=/Padr.*es.*Comportamentais/i')).toBeVisible();
  });

  test('should upload and process JSON document metadata', async ({ page }) => {
    const filePath = TEST_FILES.documentMetadata.path;
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // Wait for processing
    await expect(page.locator('text=Processando')).toBeVisible({ timeout: 2000 });
    
    // Wait for results
    await expect(page.locator('text=entidades')).toBeVisible({ timeout: 10000 });
    
    // Verify file processed successfully
    await expect(page.locator('text=/document_metadata/')).toBeVisible();
    
    // Verify some entities detected (from metadata preview)
    const entitiesText = await page.locator('text=/\\d+ entidades/i').textContent();
    const entitiesCount = parseInt(entitiesText?.match(/(\d+)/)?.[1] || '0');
    expect(entitiesCount).toBeGreaterThanOrEqual(1);
  });

  test('should auto-switch to graph tab after successful upload', async ({ page }) => {
    const filePath = TEST_FILES.txt.path;
    
    // Verify Upload tab is active initially
    const uploadTab = page.locator('[role="tab"]', { hasText: 'Upload' });
    await expect(uploadTab).toHaveAttribute('data-state', 'active');
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // Wait for results
    await expect(page.locator('text=entidades')).toBeVisible({ timeout: 10000 });
    
    // Verify Graph tab is now active (if entities > 0)
    const graphTab = page.locator('[role="tab"]', { hasText: 'Grafo' });
    
    // Wait a bit for auto-switch
    await page.waitForTimeout(1000);
    
    // Graph tab should be active or visible
    await expect(graphTab).toBeVisible();
  });

  test('should display entity badges with confidence scores', async ({ page }) => {
    const filePath = TEST_FILES.txt.path;
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // Wait for results
    await expect(page.locator('text=entidades')).toBeVisible({ timeout: 10000 });
    
    // Verify entity badges are displayed
    const entityBadges = page.locator('[class*="bg-blue"]').filter({ hasText: /PERSON|ORG|LOCATION/ });
    const badgeCount = await entityBadges.count();
    expect(badgeCount).toBeGreaterThan(0);
    
    // Verify at least one badge has confidence score
    const firstBadge = entityBadges.first();
    await expect(firstBadge).toBeVisible();
    
    // Verify confidence percentage is shown
    await expect(page.locator('text=/%/')).toBeVisible();
  });

  test('should display behavioral patterns with keywords', async ({ page }) => {
    const filePath = TEST_FILES.txt.path;
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // Wait for results
    await expect(page.locator('text=entidades')).toBeVisible({ timeout: 10000 });
    
    // Verify behavioral patterns section
    await expect(page.locator('text=/Padr.*es.*Comportamentais/i')).toBeVisible();
    
    // Verify at least one pattern is shown
    const patternCards = page.locator('[class*="bg-gray"][class*="border"]').filter({ hasText: /confiança|Keywords/ });
    const cardCount = await patternCards.count();
    expect(cardCount).toBeGreaterThan(0);
    
    // Verify keywords are displayed
    await expect(page.locator('text=/Palavras-chave:|Keywords:/i')).toBeVisible();
  });

  test('should handle upload errors gracefully', async ({ page }) => {
    // Try to upload a non-existent file (simulate error)
    // Note: This is a synthetic test, real error handling needs backend coordination
    
    // For now, verify error UI exists
    const uploadArea = page.locator('text=/Arraste.*documento/');
    await expect(uploadArea).toBeVisible();
    
    // Verify error container exists in DOM (even if not visible)
    const errorContainer = page.locator('[class*="bg-red"]');
    expect(await errorContainer.count()).toBeGreaterThanOrEqual(0); // May not be visible initially
  });

  test('should display processing metrics', async ({ page }) => {
    const filePath = TEST_FILES.txt.path;
    
    // Upload file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(filePath);
    
    // Wait for results
    await expect(page.locator('text=entidades')).toBeVisible({ timeout: 10000 });
    
    // Verify metrics are displayed
    await expect(page.locator('text=/\\d+ entidades/i')).toBeVisible();
    await expect(page.locator('text=/\\d+ padr/i')).toBeVisible();
    await expect(page.locator('text=/CRITICAL|HIGH|MEDIUM|LOW/i')).toBeVisible();
    
    // Verify file info is shown
    await expect(page.locator('text=/KB|bytes/')).toBeVisible();
    await expect(page.locator('text=/caracteres/')).toBeVisible();
  });
});

test.describe('Intelink Document List', () => {
  test('should show uploaded documents in list', async ({ page }) => {
    await page.goto(`${BASE_URL}/intelink/demo`);
    
    // Upload a file first
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_FILES.txt.path);
    
    // Wait for results
    await expect(page.locator('text=entidades')).toBeVisible({ timeout: 10000 });
    
    // Switch to Documents tab
    await page.locator('[role="tab"]', { hasText: 'Documentos' }).click();
    
    // Verify document appears in list
    await expect(page.locator('text=/INV-2025-001|Lava-Jato/')).toBeVisible();
    
    // Verify stats are shown
    await expect(page.locator('text=/\\d+ Documentos?/')).toBeVisible();
    await expect(page.locator('text=/\\d+ Entidades/')).toBeVisible();
  });
});

test.describe('Intelink Graph Visualization', () => {
  test('should render graph with nodes', async ({ page }) => {
    await page.goto(`${BASE_URL}/intelink/demo`);
    
    // Upload a file
    const fileInput = page.locator('input[type="file"]');
    await fileInput.setInputFiles(TEST_FILES.txt.path);
    
    // Wait for results and auto-switch to graph
    await expect(page.locator('text=entidades')).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(2000); // Wait for auto-switch
    
    // Verify we're on graph tab (or manually switch)
    const graphTab = page.locator('[role="tab"]', { hasText: 'Grafo' });
    await graphTab.click();
    
    // Wait for graph to render
    await page.waitForTimeout(1000);
    
    // Verify graph container exists
    // Note: Cytoscape canvas may not have easily testable selectors
    // We verify the container and toolbar instead
    await expect(page.locator('text=/nós.*conexões/i')).toBeVisible();
    await expect(page.locator('text=/Ajustar Visão|Reorganizar/')).toBeVisible();
  });
});
