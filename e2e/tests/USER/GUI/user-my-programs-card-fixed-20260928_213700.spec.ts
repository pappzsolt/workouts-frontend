import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';
import { findAssignedProgramWithWorkouts, readUserWorkoutId } from '../../helpers/user-workout-fixture';

test('USER GUI: my programs opens the selected workout occurrence with its userWorkoutId', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');

  const assignedPromise = page.waitForResponse(r => {
    const url = new URL(r.url());
    return r.request().method() === 'GET' &&
      url.pathname === API_ENDPOINTS.programs.assigned;
  });
  await navigateSpa(page, '/user/my-programs');
  const assigned = await assignedPromise;
  expect(assigned.ok()).toBeTruthy();

  const assignedBody = await assigned.json() as { data?: Array<Record<string, unknown>> };
  const programs = Array.isArray(assignedBody.data) ? assignedBody.data : [];
  expect(programs.length).toBeGreaterThan(0);

  const { programId, programIndex, workouts } = await findAssignedProgramWithWorkouts(
    page,
    programs,
    { requireUserWorkoutId: true },
  );

  const selectedProgram = programs[programIndex];
  expect(Number(selectedProgram.id ?? selectedProgram.programId ?? selectedProgram.program_id)).toBe(programId);

  const programsPagination = page.locator('app-user-my-programs app-side-pagination');
  for (let pageIndex = 0; pageIndex < programIndex; pageIndex += 1) {
    const nextButton = programsPagination.locator('button').nth(1);
    await expect(nextButton).toBeEnabled();
    await nextButton.click();
  }

  const card = page.locator('app-user-my-programs app-card').filter({ has: page.locator('h3') }).first();
  await expect(card).toBeVisible({ timeout: 15000 });
  await expect(card.locator('h3')).toContainText(String(selectedProgram.name ?? ''));

  const workoutsPromise = page.waitForResponse(r => {
    const url = new URL(r.url());
    return r.request().method() === 'GET' &&
      url.pathname === API_ENDPOINTS.workouts.byProgram(programId);
  });
  await card.click();

  await expect(page).toHaveURL(new RegExp(`/user/programs/${programId}/workouts(?:\\?.*)?$`));
  const workoutsResponse = await workoutsPromise;
  expect(workoutsResponse.ok()).toBeTruthy();

  const workoutsBody = await workoutsResponse.json() as { data?: Array<Record<string, unknown>> };
  const uiWorkouts = Array.isArray(workoutsBody.data) ? workoutsBody.data : [];
  expect(uiWorkouts.length).toBe(workouts.length);

  const targetIndex = uiWorkouts.findIndex((item) => readUserWorkoutId(item) != null);
  expect(targetIndex).toBeGreaterThanOrEqual(0);

  const target = uiWorkouts[targetIndex];
  const workoutId = Number(target.workoutId ?? target.workout_id);
  const userWorkoutId = readUserWorkoutId(target)!;
  const completed = target.completed === true || target.completed === 'true';

  expect(workoutId).toBeGreaterThan(0);
  expect(userWorkoutId).toBeGreaterThan(0);

  const categoryWorkouts = uiWorkouts.filter((item) => {
    const itemCompleted = item.completed === true || item.completed === 'true';
    return itemCompleted === completed;
  });
  const categoryIndex = categoryWorkouts.indexOf(target);
  expect(categoryIndex).toBeGreaterThanOrEqual(0);

  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveCount(2, { timeout: 15000 });
  const activeTab = completed ? tabs.nth(1) : tabs.nth(0);
  await activeTab.click();
  await expect(activeTab).toHaveAttribute('aria-selected', 'true');

  const workoutPagination = page.locator('app-workouts app-side-pagination');
  for (let pageIndex = 0; pageIndex < categoryIndex; pageIndex += 1) {
    const nextButton = workoutPagination.locator('button').nth(1);
    await expect(nextButton).toBeEnabled();
    await nextButton.click();
  }

  const workoutName = String(target.workoutName ?? target.workout_name ?? '');
  expect(workoutName).not.toBe('');

  const workoutCard = page.locator('app-workouts app-card').filter({
    has: page.locator('h4').filter({ hasText: workoutName }),
  }).first();
  await expect(workoutCard).toBeVisible({ timeout: 15000 });

  const exercisesResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());
    return response.request().method() === 'GET' &&
      url.pathname === API_ENDPOINTS.exercises.userWorkout(userWorkoutId);
  });

  await workoutCard.click();

  await expect(page).toHaveURL(
    new RegExp(`/user/workouts/${workoutId}/exercises\\?.*userWorkoutId=${userWorkoutId}(?:&|$)`),
  );

  const exercisesResponse = await exercisesResponsePromise;
  expect(exercisesResponse.ok()).toBeTruthy();
  await expect(page.locator('app-user-exercises')).toBeVisible({ timeout: 15000 });
});
