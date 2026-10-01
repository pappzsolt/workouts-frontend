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

  const nextButton = page
    .getByRole('button', {
      name: /program módosítása|modify program/i,
    })
    .first();

  await expect(nextButton).toBeVisible({ timeout: 15_000 });
  await nextButton.click();

  // The step-2 component performs its own initial HTTP loading in ngOnInit.
  // Do not race those internal requests with waitForResponse() here: the
  // business assertion we need is the actual workout -> exercises request,
  // which is registered immediately before the Exercises button click below.
  await expect(
    page.locator('app-coach-program-builder-workouts'),
  ).toBeVisible({ timeout: 15_000 });

  const workoutName = page.getByText(fixture.workoutName, {
    exact: true,
  });

  // Wait for the real UI state produced by the component's program-workout
  // loading instead of coupling this helper to its internal request order.
  await expect(workoutName).toBeVisible({ timeout: 20_000 });

  // In the actual component the workout name is an <h5>. Its row is the
  // third div ancestor: h5 -> name wrapper -> workout info -> workout row.
  // Do not search for the first ancestor containing any button because that
  // makes the locator dependent on unrelated nested markup.
  const workoutRow = workoutName.locator('xpath=ancestor::div[3]');

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

  // The workout name is rendered by the component as an <h5>. Walk to the
  // concrete workout row instead of relying on a generic ancestor that merely
  // happens to contain a button.
  const workoutRow = workoutName.locator('xpath=ancestor::div[3]');

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
