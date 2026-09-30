import { API_ENDPOINTS } from '../../../helpers/api-endpoints';
import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../../helpers/read-only';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('USER MOBILE GUI: my programs uses the assigned-program API and renders one mobile card per page', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');
  const api = page.waitForResponse(r => r.request().method() === 'GET' && r.url().includes(API_ENDPOINTS.programs.assigned) && !r.url().includes('/progress'));
  await navigateSpa(page, '/user/my-programs');
  const response = await api;
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as { data?: unknown };
  const programs = Array.isArray(body.data) ? body.data : [];
  expect(programs.length).toBeGreaterThan(0);
  const cards = page.locator('app-card').filter({ has: page.locator('h3') });
  await expect(cards).toHaveCount(1);
  await expect(cards.first()).toBeVisible();
  const width = await cards.first().evaluate(el => el.getBoundingClientRect().width);
  expect(width).toBeLessThanOrEqual(390);
});
