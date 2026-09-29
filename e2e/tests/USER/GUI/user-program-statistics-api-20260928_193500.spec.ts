import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test('USER GUI: program statistics renders the API-backed program data', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');

  const responsePromise = page.waitForResponse((r) =>
    r.request().method() === 'GET' && r.url().includes('/api/user/program-statistics'),
  );
  await navigateSpa(page, '/user/program-statistics');

  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as { data?: unknown };
  const data = Array.isArray((body.data as any)?.programs) ? (body.data as any).programs : [];

  if (data.length > 0) {
    await expect(page.locator('app-card').filter({ has: page.locator('h3') }).first()).toBeVisible();
  } else {
    await expect(page.locator('app-message')).toBeVisible();
  }
});
