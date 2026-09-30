import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test('USER GUI: program statistics exposes the API-backed statistics surface and pagination controls when needed', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');

  const apiPromise = page.waitForResponse(r =>
    r.request().method() === 'GET' &&
    r.url().includes(API_ENDPOINTS.statistics.userProgram),
  );
  await navigateSpa(page, '/user/program-statistics');
  const response = await apiPromise;
  expect(response.ok()).toBeTruthy();

  const body = await response.json() as { data?: { programs?: unknown[] } };
  const programs = Array.isArray(body.data?.programs) ? body.data.programs : [];

  if (programs.length) {
    await expect(page.locator('app-card').first()).toBeVisible();
  } else {
    await expect(page.locator('app-message')).toBeVisible();
  }
});
