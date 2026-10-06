import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test('USER GUI: program statistics renders the API-backed program data', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');

  const responsePromise = page.waitForResponse((r) =>
    r.request().method() === 'GET' && r.url().includes(API_ENDPOINTS.statistics.userProgram),
  );
  await navigateSpa(page, '/user/program-statistics');

  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(Array.isArray(body.data?.programs)).toBe(true);
  const data = body.data.programs;
  const surface = page.locator('app-user-program-statistics');

  if (data.length > 0) {
    await expect(surface.getByTestId('statistics-program').first()).toBeVisible();
  } else {
    await expect(surface.locator('app-message')).toBeVisible();
  }
});
