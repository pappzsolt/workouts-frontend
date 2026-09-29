import { expect, test } from '@playwright/test';
import { loginAs, setTestLanguage } from '../../helpers/read-only';

test.describe('INTEGRITY GUI: role route protection', () => {
  test('USER is redirected to the user dashboard when opening the coach dashboard route', async ({ page }) => {
    await setTestLanguage(page);
    await loginAs(
      page,
      process.env.E2E_USER_USERNAME,
      process.env.E2E_USER_PASSWORD,
      '/user/dashboard',
    );

    await page.goto('/coach/dashboard');

    await expect(page).not.toHaveURL(/\/coach\/dashboard$/);
    await expect(page).toHaveURL(/\/user\/dashboard$/);
    await expect(page.locator('app-user-dashboard')).toBeVisible();
    await expect(page.locator('app-dashboard-action')).toHaveCount(3);
  });
});
