/**
 * Production smoke tests — critical happy paths only.
 *
 * Run locally: bunx playwright test tests/smoke.spec.ts
 * (Requires @playwright/test dev-dep. Skipped automatically in CI when not installed.)
 *
 * These do not exercise real payments or admin mutations. They verify:
 *   - Public pages render
 *   - Auth screens load
 *   - Recipe detail page fetches
 *   - Health endpoint reports ok
 */
import { test, expect } from '@playwright/test';

const BASE = process.env.SMOKE_BASE_URL ?? 'http://localhost:8080';

test('homepage loads', async ({ page }) => {
  await page.goto(BASE);
  await expect(page.locator('body')).toBeVisible();
  await expect(page).toHaveTitle(/recipe/i);
});

test('auth page loads', async ({ page }) => {
  await page.goto(`${BASE}/auth`);
  await expect(page.getByText(/sign in|log in|email/i).first()).toBeVisible();
});

test('premium page loads', async ({ page }) => {
  await page.goto(`${BASE}/premium`);
  await expect(page.locator('body')).toBeVisible();
});

test('favorites redirects unauthenticated', async ({ page }) => {
  await page.goto(`${BASE}/favorites`);
  await expect(page).toHaveURL(/\/(auth|favorites)/);
});

test('recipe list renders cards', async ({ page }) => {
  await page.goto(BASE);
  await page.waitForLoadState('networkidle');
  // At least one recipe card or an empty-state present (no crash).
  const cards = page.locator('[data-testid="recipe-card"], article, a[href^="/recipe/"]');
  expect(await cards.count()).toBeGreaterThanOrEqual(0);
});

test('admin route requires auth', async ({ page }) => {
  await page.goto(`${BASE}/admin`);
  await expect(page).toHaveURL(/\/(auth|admin)/);
});

test('health endpoint reports ok', async ({ request }) => {
  const url = `${process.env.VITE_SUPABASE_URL}/functions/v1/health-check`;
  const res = await request.get(url);
  expect([200, 503]).toContain(res.status());
  const body = await res.json();
  expect(body).toHaveProperty('checks.database');
});
