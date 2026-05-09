import { test, expect } from '@playwright/test';

test.describe('TokenLens Dashboard', () => {
  test('health API returns ok status', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json.status).toBe('ok');
    expect(json.service).toBe('tokenlens');
  });

  test('providers API returns JSON',async ({ request }) => {
    const res = await request.get('/api/providers');
    expect(res.ok()).toBeTruthy();
    const json = await res.json();
    expect(json).toHaveProperty('data');
    expect(json).toHaveProperty('meta');
  });

  test('homepage serves HTML', async ({ page }) => {
    const response = await page.goto('/');
    expect(response?.status()).toBeLessThan(400);
    const content= await page.content();
    expect(content).toContain('TokenLens');
  });

  test('homepage shows heading text', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');
const body = await page.locator('body').textContent();
    expect(body).toContain('TokenLens');
  });
});
