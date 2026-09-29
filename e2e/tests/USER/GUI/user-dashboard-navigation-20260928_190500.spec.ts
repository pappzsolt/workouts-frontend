import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test.describe('USER GUI: dashboard navigation', () => {
  test('all dashboard cards navigate to their exact user surfaces', async ({ page }) => {
    await setTestLanguage(page);
    await loginAs(
      page,
      process.env.E2E_USER_USERNAME,
      process.env.E2E_USER_PASSWORD,
      '/user/dashboard',
    );

    const actions = page.locator('app-dashboard-action');
    await expect(actions).toHaveCount(3);

    const expectedRoutes = ['/user/my-programs', '/user/program-statistics', '/user/workouts'];
    for (let index = 0; index < expectedRoutes.length; index++) {
      await actions.nth(index).locator('button').click();
      await expect(page).toHaveURL(new RegExp(`${expectedRoutes[index].replaceAll('/', '\\/')}$`));
      await navigateSpa(page, '/user/dashboard');
      await expect(actions).toHaveCount(3);
    }
  });
});
