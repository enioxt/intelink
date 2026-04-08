/**
 * VoiceRecorder Visual Regression Tests (Playwright)
 * Sacred Code: 000.369.963.144.1618 (∞△⚡◎φ)
 * Sprint 2: Voice Integration - E2E Testing
 */

import { test, expect } from '@playwright/test';

test.describe('VoiceRecorder Visual Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to upload page with VoiceRecorder
    await page.goto('/intelink/upload');
    
    // Grant microphone permissions (mock)
    await page.context().grantPermissions(['microphone']);
  });

  test('should render in idle state', async ({ page }) => {
    // Find the voice recorder section
    const voiceSection = page.locator('text=Ou Grave sua Narração').locator('..');
    
    // Should show idle message
    await expect(voiceSection.getByText(/pronto para gravar/i)).toBeVisible();
    
    // Should show start button
    await expect(voiceSection.getByRole('button', { name: /iniciar gravação/i })).toBeVisible();
    
    // Visual snapshot
    await expect(voiceSection).toHaveScreenshot('voice-recorder-idle.png');
  });

  test('should show recording state', async ({ page }) => {
    const voiceSection = page.locator('text=Ou Grave sua Narração').locator('..');
    
    // Start recording
    await voiceSection.getByRole('button', { name: /iniciar gravação/i }).click();
    
    // Should show recording indicator
    await expect(voiceSection.getByText(/gravando/i)).toBeVisible();
    
    // Should show stop button
    await expect(voiceSection.getByRole('button', { name: /parar/i })).toBeVisible();
    
    // Should show timer
    await expect(voiceSection.locator('text=/0:\\d+/')).toBeVisible();
    
    // Visual snapshot
    await expect(voiceSection).toHaveScreenshot('voice-recorder-recording.png');
  });

  test('should show recorded state with controls', async ({ page }) => {
    const voiceSection = page.locator('text=Ou Grave sua Narração').locator('..');
    
    // Record for a moment
    await voiceSection.getByRole('button', { name: /iniciar gravação/i }).click();
    await page.waitForTimeout(1000);
    await voiceSection.getByRole('button', { name: /parar/i }).click();
    
    // Should show transcribe button
    await expect(voiceSection.getByRole('button', { name: /transcrever/i })).toBeVisible();
    
    // Should show reset button
    await expect(voiceSection.getByRole('button', { name: /nova gravação/i })).toBeVisible();
    
    // Should show audio player
    await expect(voiceSection.locator('audio')).toBeVisible();
    
    // Visual snapshot
    await expect(voiceSection).toHaveScreenshot('voice-recorder-recorded.png');
  });

  test('should show dark mode correctly', async ({ page }) => {
    // Enable dark mode
    await page.emulateMedia({ colorScheme: 'dark' });
    
    await page.goto('/intelink/upload');
    
    const voiceSection = page.locator('text=Ou Grave sua Narração').locator('..');
    
    // Visual snapshot in dark mode
    await expect(voiceSection).toHaveScreenshot('voice-recorder-dark-mode.png');
  });

  test('should show mobile responsive layout', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    
    await page.goto('/intelink/upload');
    
    const voiceSection = page.locator('text=Ou Grave sua Narração').locator('..');
    
    // Visual snapshot on mobile
    await expect(voiceSection).toHaveScreenshot('voice-recorder-mobile.png');
  });
});

test.describe('VoiceRecorder Interaction Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/intelink/upload');
    await page.context().grantPermissions(['microphone']);
  });

  test('full recording flow', async ({ page }) => {
    const voiceSection = page.locator('text=Ou Grave sua Narração').locator('..');
    
    // 1. Start recording
    await voiceSection.getByRole('button', { name: /iniciar gravação/i }).click();
    await expect(voiceSection.getByText(/gravando/i)).toBeVisible();
    
    // 2. Record for 2 seconds
    await page.waitForTimeout(2000);
    
    // 3. Stop recording
    await voiceSection.getByRole('button', { name: /parar/i }).click();
    await expect(voiceSection.getByRole('button', { name: /transcrever/i })).toBeVisible();
    
    // 4. Mock transcription API
    await page.route('**/api/whisper/transcribe', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'Test transcription result',
          language: 'pt',
          duration: 2.0,
          model_used: 'base',
          segments: [],
        }),
      });
    });
    
    // 5. Transcribe
    await voiceSection.getByRole('button', { name: /transcrever/i }).click();
    
    // 6. Should show processing
    await expect(voiceSection.getByText(/transcrevendo/i)).toBeVisible();
    
    // 7. Should show result
    await expect(voiceSection.getByText('Test transcription result')).toBeVisible();
    
    // 8. Should show success state
    await expect(voiceSection.getByText(/transcrição concluída/i)).toBeVisible();
  });

  test('error handling - transcription fails', async ({ page }) => {
    const voiceSection = page.locator('text=Ou Grave sua Narração').locator('..');
    
    // Record
    await voiceSection.getByRole('button', { name: /iniciar gravação/i }).click();
    await page.waitForTimeout(1000);
    await voiceSection.getByRole('button', { name: /parar/i }).click();
    
    // Mock failed transcription
    await page.route('**/api/whisper/transcribe', async route => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Transcription failed' }),
      });
    });
    
    // Try to transcribe
    await voiceSection.getByRole('button', { name: /transcrever/i }).click();
    
    // Should show error
    await expect(voiceSection.getByText(/transcription failed/i)).toBeVisible();
  });

  test('reset functionality', async ({ page }) => {
    const voiceSection = page.locator('text=Ou Grave sua Narração').locator('..');
    
    // Record
    await voiceSection.getByRole('button', { name: /iniciar gravação/i }).click();
    await page.waitForTimeout(500);
    await voiceSection.getByRole('button', { name: /parar/i }).click();
    
    // Reset
    await voiceSection.getByRole('button', { name: /nova gravação/i }).click();
    
    // Should be back to idle state
    await expect(voiceSection.getByText(/pronto para gravar/i)).toBeVisible();
    await expect(voiceSection.getByRole('button', { name: /iniciar gravação/i })).toBeVisible();
  });

  test('transcription populates description field', async ({ page }) => {
    const voiceSection = page.locator('text=Ou Grave sua Narração').locator('..');
    const descriptionField = page.locator('textarea[placeholder*="descrição"]');
    
    // Record
    await voiceSection.getByRole('button', { name: /iniciar gravação/i }).click();
    await page.waitForTimeout(500);
    await voiceSection.getByRole('button', { name: /parar/i }).click();
    
    // Mock transcription
    await page.route('**/api/whisper/transcribe', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          text: 'This is a test transcription',
          language: 'en',
          duration: 1.5,
          model_used: 'base',
          segments: [],
        }),
      });
    });
    
    // Transcribe
    await voiceSection.getByRole('button', { name: /transcrever/i }).click();
    await page.waitForTimeout(1000);
    
    // Description field should be populated
    await expect(descriptionField).toHaveValue(/this is a test transcription/i);
  });
});
