import { API_ENDPOINTS } from '../../../helpers/api-endpoints';
import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../../helpers/read-only';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('USER MOBILE GUI: workout calendar switches to the mobile month agenda and loads scheduled API data', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');
  const api = page.waitForResponse(r => r.request().method() === 'GET' && r.url().includes(API_ENDPOINTS.userWorkoutExercises.scheduled));
  await navigateSpa(page, '/user/workouts');
  const response = await api;
  expect(response.ok()).toBeTruthy();
  await expect(page.locator('[aria-label*="month" i], [aria-label*="hónap" i]').first()).toBeVisible();
  const agenda = page.locator('section.sm\\:hidden').first();
  await expect(agenda).toBeVisible();
  expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(391);
});
