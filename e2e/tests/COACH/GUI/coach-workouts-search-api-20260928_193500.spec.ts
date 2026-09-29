import { expect, test } from '@playwright/test';
import { loginAs, setTestLanguage } from '../../helpers/read-only';

test('COACH GUI: workout search filters the dashboard workout list locally', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_COACH_USERNAME, process.env.E2E_COACH_PASSWORD, '/coach/dashboard');

  const workoutsAction = page
    .locator('app-dashboard-action')
    .filter({ hasText: /workouts|edzés/i })
    .first();
  await expect(workoutsAction).toBeVisible();
  await workoutsAction.click();

  const search = page.locator('#workoutSearch');
  await expect(search).toBeVisible({ timeout: 15000 });

  const cards = page.locator('app-coach-workouts app-card');
  const before = await cards.count();

  await search.fill('zzzz-no-match');
  await expect(cards).toHaveCount(0);

  await search.fill('');
  if (before > 0) {
    await expect(cards.first()).toBeVisible();
  }
});
