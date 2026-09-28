import { expect, test } from '@playwright/test';
import { loginAs, setTestLanguage } from '../../helpers/read-only';

test.describe('USER GUI: dashboard navigation', () => {
  test('dashboard cards navigate to my programs, statistics and workouts', async ({ page }) => {
    await setTestLanguage(page);

    await loginAs(
      page,
      process.env.E2E_USER_USERNAME,
      process.env.E2E_USER_PASSWORD,
      '/user/dashboard',
    );

    const actions = page.locator('app-dashboard-action');
    await expect(actions).toHaveCount(3);

    await actions.nth(0).locator('button').click();
    await expect(page).toHaveURL(/\/user\/my-programs$/);

    await page.goto('/user/dashboard');
    await expect(actions.nth(1).locator('button')).toBeVisible();
    await actions.nth(1).locator('button').click();
    await expect(page).toHaveURL(/\/user\/program-statistics$/);

    await page.goto('/user/dashboard');
    await actions.nth(2).locator('button').click();
    await expect(page).toHaveURL(/\/user\/workouts$/);
  });
});
