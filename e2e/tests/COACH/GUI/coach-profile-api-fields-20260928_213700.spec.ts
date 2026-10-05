import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test('COACH GUI: profile page renders after the authenticated coach profile API completes', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_COACH_USERNAME, process.env.E2E_COACH_PASSWORD, '/coach/dashboard');

  const apiPromise = page.waitForResponse(r =>
    r.request().method() === 'GET' &&
    /^\/api\/members\/coaches\/\d+$/.test(new URL(r.url()).pathname),
  );
  await navigateSpa(page, '/coach/profile');
  const response = await apiPromise;
  expect(response.ok()).toBeTruthy();

  await expect(page.locator('form')).toBeVisible();
  const inputs = page.locator('form input');
  await expect(inputs.first()).toBeVisible();
});
