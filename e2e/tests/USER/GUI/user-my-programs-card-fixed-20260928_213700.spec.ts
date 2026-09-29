import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test('USER GUI: my programs opens the selected workout occurrence with its userWorkoutId', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');

  const assignedPromise = page.waitForResponse(r =>
    r.request().method() === 'GET' &&
    r.url().includes('/api/programs/my/assigned') &&
    !r.url().includes('/progress'),
  );
  await navigateSpa(page, '/user/my-programs');
  const assigned = await assignedPromise;
  expect(assigned.ok()).toBeTruthy();

  const assignedBody = await assigned.json() as { data?: Array<Record<string, unknown>> };
  const programs = Array.isArray(assignedBody.data) ? assignedBody.data : [];
  expect(programs.length).toBeGreaterThan(0);

  const card = page.locator('app-card').filter({ has: page.locator('h3') }).first();
  await expect(card).toBeVisible({ timeout: 15000 });

  const workoutsPromise = page.waitForResponse(r =>
    r.request().method() === 'GET' &&
    r.url().includes('/api/workouts/program/'),
  );
  await card.click();

  await expect(page).toHaveURL(/\/user\/programs\/\d+\/workouts(?:\?.*)?$/);
  const workoutsResponse = await workoutsPromise;
  expect(workoutsResponse.ok()).toBeTruthy();

  const workoutsBody = await workoutsResponse.json() as { data?: Array<Record<string, unknown>> };
  const workouts = Array.isArray(workoutsBody.data) ? workoutsBody.data : [];
  expect(workouts.length).toBeGreaterThan(0);

  const first = workouts.find((item) =>
    Number(item.workoutId ?? item.workout_id) > 0 &&
    Number(item.userWorkoutId ?? item.user_workout_id) > 0,
  );
  expect(first, 'The selected program must contain a workout occurrence with userWorkoutId.').toBeTruthy();

  const workoutId = Number(first!.workoutId ?? first!.workout_id);
  const userWorkoutId = Number(first!.userWorkoutId ?? first!.user_workout_id);
  const completed = first!.completed === true || first!.completed === 'true';

  expect(workoutId).toBeGreaterThan(0);
  expect(userWorkoutId).toBeGreaterThan(0);

  if (completed) {
    const completedTab = page.getByRole('tab').nth(1);
    await expect(completedTab).toBeVisible({ timeout: 15000 });
    await completedTab.click();
    await expect(completedTab).toHaveAttribute('aria-selected', 'true');
  } else {
    const pendingTab = page.getByRole('tab').nth(0);
    await expect(pendingTab).toBeVisible({ timeout: 15000 });
    await expect(pendingTab).toHaveAttribute('aria-selected', 'true');
  }

  const workoutName = String(first!.workoutName ?? first!.workout_name ?? '');
  expect(workoutName).not.toBe('');

  const workoutCard = page.locator('app-workouts app-card').filter({
    has: page.locator('h4').filter({ hasText: workoutName }),
  }).first();
  await expect(workoutCard).toBeVisible({ timeout: 15000 });

  const expectedWorkoutId = workoutId;
  const exercisesResponsePromise = page.waitForResponse((response) =>
    response.request().method() === 'GET' &&
    response.url().includes(`/api/exercises/my-workout/user-workout/${userWorkoutId}`),
  );

  await workoutCard.click();

  await expect(page).toHaveURL(
    new RegExp(`/user/workouts/${expectedWorkoutId}/exercises\?.*userWorkoutId=${userWorkoutId}`),
  );

  const exercisesResponse = await exercisesResponsePromise;
  expect(exercisesResponse.ok()).toBeTruthy();
  await expect(page.locator('app-user-exercises')).toBeVisible({ timeout: 15000 });
});
