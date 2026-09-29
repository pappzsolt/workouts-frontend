import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test('USER GUI: workout calendar loads scheduled occurrences from API', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');

  const responsePromise = page.waitForResponse((r) =>
    r.request().method() === 'GET' && r.url().includes('/user-workout-exercises/scheduled-workouts'),
  );
  await navigateSpa(page, '/user/workouts');

  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
  const body = await response.json() as { data?: unknown };
  const items = Array.isArray(body.data) ? body.data as Array<Record<string, unknown>> : [];

  await expect(page.locator('h2')).toBeVisible();
  if (items.length > 0) {
    const first = items[0];
    expect(Number(first.user_workout_id ?? first.userWorkoutId)).toBeGreaterThan(0);
    expect(Number(first.workoutId ?? first.workout_id)).toBeGreaterThan(0);
  }
});
