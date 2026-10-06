import { API_ENDPOINTS } from '../../../helpers/api-endpoints';
import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../../helpers/read-only';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('USER MOBILE GUI: program statistics renders the API response without page overflow', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');

  const apiPromise = page.waitForResponse(r =>
    r.request().method() === 'GET' &&
    new URL(r.url()).pathname === API_ENDPOINTS.statistics.userProgram,
  );
  await navigateSpa(page, '/user/program-statistics');
  const response = await apiPromise;
  expect(response.ok()).toBeTruthy();

  const body = await response.json();
  expect(body.success).toBe(true);
  expect(Array.isArray(body.data?.programs)).toBe(true);
  const programs = body.data.programs;
  const surface = page.locator('app-user-program-statistics');

  if (programs.length > 0) {
    await expect(surface.getByTestId('statistics-program').first()).toBeVisible({ timeout: 15000 });
  } else {
    await expect(surface.locator('app-message')).toBeVisible({ timeout: 15000 });
  }

  expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(391);
});
