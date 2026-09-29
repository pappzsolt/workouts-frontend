import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test('USER GUI: exercise detail loads the selected user-workout exercise from API', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');

  const scheduledPromise = page.waitForResponse((r) =>
    r.request().method() === 'GET' && r.url().includes('/user-workout-exercises/scheduled-workouts'),
  );
  await navigateSpa(page, '/user/workouts');
  const scheduled = await scheduledPromise;
  expect(scheduled.ok()).toBeTruthy();
  const body = await scheduled.json() as { data?: Array<Record<string, unknown>> };
  const items = Array.isArray(body.data) ? body.data : [];
  expect(items.length, 'The configured E2E user must have a scheduled workout occurrence.').toBeGreaterThan(0);

  const item = items[0];
  const userWorkoutId = Number(item.user_workout_id ?? item.userWorkoutId);
  const workoutId = Number(item.workoutId ?? item.workout_id);
  const programId = Number(item.programId ?? item.program_id);
  const programWorkoutId = Number(item.programWorkoutId ?? item.program_workout_id);
  expect(programId).toBeGreaterThan(0);
  expect(programWorkoutId).toBeGreaterThan(0);
  expect(userWorkoutId).toBeGreaterThan(0);
  expect(workoutId).toBeGreaterThan(0);

  const exercisesPromise = page.waitForResponse((r) =>
    r.request().method() === 'GET' && r.url().includes(`/api/exercises/my-workout/user-workout/${userWorkoutId}`),
  );
  await navigateSpa(page, `/user/workouts/${workoutId}/exercises?programId=${programId}&programWorkoutId=${programWorkoutId}&userWorkoutId=${userWorkoutId}`);

  const exercises = await exercisesPromise;
  expect(exercises.ok()).toBeTruthy();
  await expect(page.locator('app-user-exercises')).toBeVisible();
});
