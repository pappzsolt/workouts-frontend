import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../../helpers/read-only';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('USER MOBILE GUI: profile username matches the authenticated member API', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');

  const profilePromise = page.waitForResponse(r => {
    if (r.request().method() !== 'GET') return false;
    const url = new URL(r.url());
    return /^\/api\/members\/users\/\d+$/.test(url.pathname);
  });

  await navigateSpa(page, '/user/profile');
  const profile = await profilePromise;
  expect(profile.ok()).toBeTruthy();

  const body = await profile.json() as { data?: { usernameOrName?: string; email?: string } };
  const username = String(body.data?.usernameOrName ?? '');
  expect(username).not.toBe('');

  await expect(page.locator('#username')).toBeVisible({ timeout: 15000 });
  await expect(page.locator('#username')).toHaveValue(username);
  await expect(page.locator('#email')).toBeVisible();
  expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(391);
});
