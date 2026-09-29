import { expect, test } from '@playwright/test';
import { assertNoDataMutation, installReadOnlyGuard, loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test.describe('User - read-only surfaces', () => {
  test.beforeEach(async ({ page }) => {
    await setTestLanguage(page);
  });

  async function login(
    page: import('@playwright/test').Page,
    expectedPath = '/user/dashboard',
  ): Promise<string[]> {
    const violations = installReadOnlyGuard(page);

    await loginAs(
      page,
      process.env.E2E_USER_USERNAME,
      process.env.E2E_USER_PASSWORD,
      expectedPath,
    );

    return violations;
  }

  test('user dashboard can be opened without changing data', async ({ page }) => {
    const violations = await login(page);

    await expect(page).toHaveURL(/\/user\/dashboard$/);
    await expect(page.locator('h2').first()).toBeVisible();

    await assertNoDataMutation(violations);
  });

  test('my programs can be viewed and a program can be opened', async ({ page }) => {
    const violations = await login(page);

    const programsResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'GET' &&
      response.url().includes('/programs/my/assigned-programs') &&
      !response.url().includes('/progress'),
    );

    await navigateSpa(page, '/user/my-programs');
    const programsResponse = await programsResponsePromise;
    expect(programsResponse.ok()).toBeTruthy();

    const body = await programsResponse.json() as { data?: unknown[] };
    const programs = body.data ?? [];

    expect(programs.length, 'The configured E2E user must have at least one assigned program.').toBeGreaterThan(0);

    const programCard = page.locator('app-card').filter({ has: page.locator('h3') }).first();
    await expect(programCard).toBeVisible({ timeout: 15_000 });
    await programCard.click();
    await expect(page).toHaveURL(/\/user\/programs\/\d+\/workouts/);

    await assertNoDataMutation(violations);
  });

  test('program statistics can be viewed without changing data', async ({ page }) => {
    const violations = await login(page);

    await navigateSpa(page, '/user/program-statistics');

    await assertNoDataMutation(violations);
  });

  test('workout calendar can be opened and navigated without changing data', async ({ page }) => {
    const violations = await login(page);

    await navigateSpa(page, '/user/workouts');

    const buttons = page.locator('button');
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);

    await assertNoDataMutation(violations);
  });

  test('workout exercise list can be viewed without changing data', async ({ page }) => {
    const violations = await login(page);

    const programsResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'GET' &&
      response.url().includes('/programs/my/assigned-programs') &&
      !response.url().includes('/progress'),
    );

    await navigateSpa(page, '/user/my-programs');
    const programsResponse = await programsResponsePromise;
    expect(programsResponse.ok()).toBeTruthy();

    const programsBody = await programsResponse.json() as { data?: Array<{ id?: number }> };
    const programs = programsBody.data ?? [];

    expect(programs.length, 'The configured E2E user must have at least one assigned program.').toBeGreaterThan(0);

    const programCard = page.locator('app-card').filter({ has: page.locator('h3') }).first();
    await expect(programCard).toBeVisible({ timeout: 15_000 });

    const workoutsResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'GET' &&
      /\/workouts\/program\/\d+/.test(response.url()),
    );

    await programCard.click();
    await expect(page).toHaveURL(/\/user\/programs\/\d+\/workouts/);

    const workoutsResponse = await workoutsResponsePromise;
    expect(workoutsResponse.ok()).toBeTruthy();

    const workoutsBody = await workoutsResponse.json() as {
      data?: Array<{ userWorkoutId?: number; user_workout_id?: number }>;
    };
    const workouts = workoutsBody.data ?? [];

    expect(workouts.length, 'The selected E2E program must have at least one workout occurrence.').toBeGreaterThan(0);

    const workoutWithUserWorkout = workouts.find(
      (workout) => workout.userWorkoutId != null || workout.user_workout_id != null,
    );
    expect(workoutWithUserWorkout, 'The selected workout must have a userWorkoutId for the exercise flow.').toBeTruthy();

    const selected = workoutWithUserWorkout!;
    const selectedUserWorkoutId = Number(
      selected.userWorkoutId ?? selected.user_workout_id,
    );
    const selectedCompleted = selected.completed === true || selected.completed === 'true';

    const tabs = page.getByRole('tab');
    await expect(tabs).toHaveCount(2, { timeout: 15_000 });
    if (selectedCompleted) {
      await tabs.nth(1).click();
      await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
    } else {
      await tabs.nth(0).click();
      await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
    }

    const workoutCard = page.locator('app-workouts app-card').first();
    await expect(workoutCard).toBeVisible({ timeout: 15_000 });

    const exercisesResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'GET' &&
      response.url().includes(`/api/exercises/user-workouts/${selectedUserWorkoutId}`) &&
      response.ok(),
    );

    await workoutCard.click();

    await expect(page).toHaveURL(/\/user\/workouts\/\d+\/exercises/);

    const exercisesResponse = await exercisesResponsePromise;
    expect(exercisesResponse.ok()).toBeTruthy();

    const exercisesBody = await exercisesResponse.json() as {
      data?: { exercises?: unknown[] };
    };
    expect(exercisesBody.data?.exercises?.length ?? 0).toBeGreaterThan(0);

    // Exercise cards use <h3> in the actual user-exercises template.
    await expect(
      page.locator('app-card').filter({ has: page.locator('h3') }).first(),
    ).toBeVisible({ timeout: 15_000 });

    await assertNoDataMutation(violations);
  });
});
