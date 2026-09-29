import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../../helpers/read-only';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('USER MOBILE GUI: exercise list loads the selected user-workout API data', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');

  const scheduledPromise = page.waitForResponse(r =>
    r.request().method() === 'GET' &&
    r.url().includes('/api/user-workout-exercises/scheduled'),
  );
  await navigateSpa(page, '/user/workouts');
  const scheduled = await scheduledPromise;
  expect(scheduled.ok()).toBeTruthy();

  const scheduledBody = await scheduled.json() as { data?: Array<Record<string, unknown>> };
  const items = Array.isArray(scheduledBody.data) ? scheduledBody.data : [];
  expect(items.length).toBeGreaterThan(0);

  const item = items.find((candidate) =>
    Number(candidate.user_workout_id ?? candidate.userWorkoutId) > 0 &&
    Number(candidate.workoutId ?? candidate.workout_id) > 0 &&
    Number(candidate.programId ?? candidate.program_id) > 0 &&
    Number(candidate.programWorkoutId ?? candidate.program_workout_id) > 0,
  );
  expect(item).toBeTruthy();

  const userWorkoutId = Number(item!.user_workout_id ?? item!.userWorkoutId);
  const workoutId = Number(item!.workoutId ?? item!.workout_id);
  const programId = Number(item!.programId ?? item!.program_id);
  const programWorkoutId = Number(item!.programWorkoutId ?? item!.program_workout_id);

  const exercisesPromise = page.waitForResponse(r =>
    r.request().method() === 'GET' &&
    r.url().includes(`/api/exercises/my-workout/user-workout/${userWorkoutId}`),
  );

  await navigateSpa(
    page,
    `/user/workouts/${workoutId}/exercises?programId=${programId}&programWorkoutId=${programWorkoutId}&userWorkoutId=${userWorkoutId}`,
  );

  const exercises = await exercisesPromise;
  expect(exercises.ok()).toBeTruthy();

  const body = await exercises.json() as { data?: { exercises?: unknown[] } };
  expect(Array.isArray(body.data?.exercises)).toBeTruthy();
  await expect(page.locator('app-user-exercises')).toBeVisible({ timeout: 15000 });
  expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(391);
});
