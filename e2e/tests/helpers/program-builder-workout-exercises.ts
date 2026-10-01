import { expect, type APIRequestContext, type Page } from '@playwright/test';
import { API_ENDPOINTS } from './api-endpoints';
import {
  apiFor,
  assignExercise,
  createExercise,
  createProgram,
  createWorkout,
  deleteExercise,
  deleteProgram,
  deleteWorkout,
  login,
  success,
  suffix,
} from './e2e-next-3-helpers';

export const LANGUAGE = process.env.E2E_LANGUAGE ?? 'hu';

export type ProgramBuilderFixture = {
  programId: number;
  workoutId: number;
  exerciseIds: number[];
  exerciseNames: string[];
  workoutName: string;
};

export async function createProgramBuilderFixture(
  api: APIRequestContext,
): Promise<ProgramBuilderFixture> {
  const suffixValue = suffix();
  const programId = await createProgram(
    api,
    `E2E PB UI ${suffixValue}`,
  );

  const workoutName = `E2E PB workout ${suffixValue}`;
  const workoutId = await createWorkout(api, workoutName);

  const exerciseIds: number[] = [];
  const exerciseNames: string[] = [];

  try {
    // IMPORTANT: the backend does not allow adding new exercises to a workout
    // after the workout has already been assigned to a program.
    // Therefore the fixture must be built in this order:
    //   1. create program
    //   2. create workout
    //   3. create + assign the 5 exercises
    //   4. only then attach the workout to the program
    for (let index = 1; index <= 5; index++) {
      const name = `E2E PB exercise ${index} ${suffixValue}`;
      const exerciseId = await createExercise(api, name);

      exerciseIds.push(exerciseId);
      exerciseNames.push(name);

      await assignExercise(api, workoutId, exerciseId);
    }

    await success(
      await api.post(API_ENDPOINTS.programWorkouts.base, {
        data: {
          programId,
          workoutId,
          dayIndex: 1,
        },
      }),
      'POST /api/program-workouts',
    );
  } catch (error) {
    await deleteProgram(api, programId).catch(() => undefined);
    await deleteWorkout(api, workoutId).catch(() => undefined);
    for (const exerciseId of exerciseIds.reverse()) {
      await deleteExercise(api, exerciseId).catch(() => undefined);
    }
    throw error;
  }

  return {
    programId,
    workoutId,
    exerciseIds,
    exerciseNames,
    workoutName,
  };
}

export async function cleanupProgramBuilderFixture(
  api: APIRequestContext,
  fixture: ProgramBuilderFixture,
): Promise<void> {
  // API-only cleanup.
  // Deleting the program first removes the program-workout relation;
  // then the workout can be removed, followed by the exercises.
  await deleteProgram(api, fixture.programId).catch(() => undefined);
  await deleteWorkout(api, fixture.workoutId).catch(() => undefined);

  for (const exerciseId of fixture.exerciseIds) {
    await deleteExercise(api, exerciseId).catch(() => undefined);
  }
}

export async function loginAndCreateFixture(
  page: Page,
): Promise<{ api: APIRequestContext; fixture: ProgramBuilderFixture }> {
  await login(page, 'coach');

  const api = await apiFor(page);
  const fixture = await createProgramBuilderFixture(api);

  return { api, fixture };
}

export async function openProgramBuilderStep2(
  page: Page,
  fixture: ProgramBuilderFixture,
): Promise<void> {
  await page.goto(`/coach/program-builder?programId=${fixture.programId}`);

  await expect(page.locator('app-coach-program-builder')).toBeVisible({
    timeout: 15_000,
  });

  const programName = page.locator('#programName');
  await expect(programName).toBeVisible({ timeout: 15_000 });

  const programWorkoutsResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      response.request().method() === 'GET' &&
      url.pathname === new URL(API_ENDPOINTS.programWorkouts.byProgram(fixture.programId), page.url()).pathname &&
      url.searchParams.get('programId') === String(fixture.programId)
    );
  });

  const uniqueWorkoutsResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      response.request().method() === 'GET' &&
      url.pathname === new URL(API_ENDPOINTS.uniqueWorkoutsWithExercises, page.url()).pathname
    );
  });

  const nextButton = page
    .getByRole('button', {
      name: /program módosítása|modify program/i,
    })
    .first();

  await expect(nextButton).toBeVisible({ timeout: 15_000 });
  await nextButton.click();

  await expect(
    page.locator('app-coach-program-builder-workouts'),
  ).toBeVisible({ timeout: 15_000 });

  // The child component loads its program-workout relation and the
  // coach's unique workouts asynchronously. Wait for those real API
  // responses before querying the rendered workout list.
  const [programWorkoutsResponse, uniqueWorkoutsResponse] = await Promise.all([
    programWorkoutsResponsePromise,
    uniqueWorkoutsResponsePromise,
  ]);

  expect(
    programWorkoutsResponse.ok(),
    `GET program-workouts: ${programWorkoutsResponse.status()}`,
  ).toBeTruthy();

  expect(
    uniqueWorkoutsResponse.ok(),
    `GET unique workouts: ${uniqueWorkoutsResponse.status()}`,
  ).toBeTruthy();

  // The fixture workout is rendered as an <h5>, so getByRole('heading')
  // is valid, but do not assume a specific translated/border DOM wrapper.
  // Find the nearest action row containing the workout's Exercises button.
  const workoutName = page.getByText(fixture.workoutName, {
    exact: true,
  });

  await expect(workoutName).toBeVisible({ timeout: 15_000 });

  const workoutRow = workoutName.locator(
    'xpath=ancestor::div[.//button][1]',
  );

  await expect(workoutRow).toBeVisible({ timeout: 15_000 });
}


export async function openFixtureWorkout(
  page: Page,
  fixture: ProgramBuilderFixture,
): Promise<any> {
  const workoutName = page.getByText(fixture.workoutName, {
    exact: true,
  });

  await expect(workoutName).toBeVisible({ timeout: 15_000 });

  const workoutRow = workoutName.locator(
    'xpath=ancestor::div[.//button][1]',
  );

  const exercisesButton = workoutRow.getByRole('button', {
    name: /gyakorlatok|exercises/i,
  });

  await expect(exercisesButton).toBeVisible({ timeout: 15_000 });

  // Register the API listener immediately before the UI action that triggers
  // GET /api/exercises/workouts/{workoutId}.
  const workoutResponsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      response.request().method() === 'GET' &&
      url.pathname ===
        new URL(
          API_ENDPOINTS.exercises.workout(fixture.workoutId),
          page.url(),
        ).pathname
    );
  });

  await exercisesButton.click();

  const response = await workoutResponsePromise;

  expect(
    response.ok(),
    `GET ${API_ENDPOINTS.exercises.workout(fixture.workoutId)}: ${response.status()}`,
  ).toBeTruthy();

  return response.json();
}


export async function assertSelectedOnlyModal(
  page: Page,
  fixture: ProgramBuilderFixture,
  workoutBody: any,
): Promise<void> {
  const exercises = Array.isArray(workoutBody?.data?.exercises)
    ? workoutBody.data.exercises
    : [];

  expect(
    exercises,
    'A workout API response must contain the exercises collection.',
  ).toHaveLength(5);

  const modal = page.locator('[role="dialog"]').first();
  await expect(modal).toBeVisible();

  await expect(
    modal.getByText(/5\s+exercise/i),
  ).toBeVisible();

  for (const exerciseName of fixture.exerciseNames) {
    await expect(
      modal.getByText(exerciseName, { exact: true }),
    ).toHaveCount(1);
  }

  // The selected-only view must not show the 83-page exercise catalogue.
  await expect(
    modal.getByText(/oldal\s+1\s*\/|page\s+1\s*\//i),
  ).toHaveCount(0);

  await expect(
    modal.getByRole('button', {
      name: /következő|next/i,
    }),
  ).toHaveCount(0);
}
