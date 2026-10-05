import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test('USER GUI: profile screen renders the authenticated profile API response', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');

  const responsePromise = page.waitForResponse((r) =>
    r.request().method() === 'GET' && /^\/api\/members\/users\/\d+$/.test(new URL(r.url()).pathname),
  );
  await navigateSpa(page, '/user/profile');

  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as { data?: Record<string, unknown> };
  expect(body.data).toBeTruthy();

  await expect(page.locator('#username')).toHaveValue(String(body.data?.usernameOrName ?? ''));
});
