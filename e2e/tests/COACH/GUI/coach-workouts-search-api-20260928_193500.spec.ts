import { test } from '@playwright/test';
import { loginAs, setTestLanguage } from '../../helpers/read-only';
import { assertWorkoutListSearch } from '../../helpers/workout-list-search';

test('COACH GUI: workout search filters the loaded dashboard list and clearing restores it', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_COACH_USERNAME, process.env.E2E_COACH_PASSWORD, '/coach/dashboard');
  await assertWorkoutListSearch(page, async () => {
    await page.locator('app-dashboard-action').getByRole('button', {
      name: /^(edzések|workouts|trainings)$/i,
    }).click();
  });
});
