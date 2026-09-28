import { expect, test } from '@playwright/test';
import { loginAs, setTestLanguage } from '../../helpers/read-only';

test.describe('COACH GUI: dashboard actions', () => {
  test.beforeEach(async ({ page }) => {
    await setTestLanguage(page);
  });

  test('dashboard action cards open the corresponding coach surfaces', async ({ page }) => {
    await loginAs(
      page,
      process.env.E2E_COACH_USERNAME,
      process.env.E2E_COACH_PASSWORD,
      '/coach/dashboard',
    );

    const actions = page.locator('app-dashboard-action');
    await expect(actions).toHaveCount(5);

    await actions.nth(0).locator('button').click();
    await expect(page.locator('app-coach-program')).toBeVisible({ timeout: 15_000 });

    await actions.nth(2).locator('button').click();
    await expect(page.locator('app-exercise-controller')).toBeVisible({ timeout: 15_000 });
  });
});
