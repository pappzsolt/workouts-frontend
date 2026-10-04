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


async function cleanupFixtureParts(
  api: APIRequestContext,
  programId: number | undefined,
  workoutId: number | undefined,
  exerciseIds: number[],
): Promise<void> {
  const errors: string[] = [];

  if (programId !== undefined) {
    try {
      await deleteProgram(api, programId);
    } catch (error) {
      errors.push(`program ${programId}: ${String(error)}`);
    }
  }

  if (workoutId !== undefined) {
    try {
      await deleteWorkout(api, workoutId);
    } catch (error) {
      errors.push(`workout ${workoutId}: ${String(error)}`);
    }
  }

  for (const exerciseId of [...exerciseIds].reverse()) {
    try {
      await deleteExercise(api, exerciseId);
    } catch (error) {
      errors.push(`exercise ${exerciseId}: ${String(error)}`);
    }
  }

  if (errors.length > 0) {
    throw new Error(`Program Builder fixture cleanup failed:\n${errors.join('\n')}`);
  }
}

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
    try {
      await cleanupFixtureParts(api, programId, workoutId, exerciseIds);
    } catch (cleanupError) {
      throw new AggregateError(
        [error, cleanupError],
        'Program Builder fixture creation and cleanup both failed.',
      );
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
  // API-only cleanup. Every failure is reported; none is swallowed.
  await cleanupFixtureParts(
    api,
    fixture.programId,
    fixture.workoutId,
    fixture.exerciseIds,
  );
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

  const workoutRow = page.getByTestId('selected-workout').filter({
    has: page.getByRole('heading', { name: fixture.workoutName, exact: true }),
  });

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

  const workoutRow = page.getByTestId('selected-workout').filter({
    has: page.getByRole('heading', { name: fixture.workoutName, exact: true }),
  });

  const exercisesButton = workoutRow.locator(
    'button:has(app-icon[name="dumbbell"])',
  );

  await expect(exercisesButton).toHaveCount(1);
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
    modal.getByRole('heading', {
      name: fixture.workoutName,
      exact: true,
    }),
  ).toHaveCount(1);

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
