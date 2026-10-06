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
  dbOne,
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
    // Create only source data. The program/workout relation is exercised through the GUI.
    for (let index = 1; index <= 5; index++) {
      const name = `E2E PB exercise ${index} ${suffixValue}`;
      const exerciseId = await createExercise(api, name);

      exerciseIds.push(exerciseId);
      exerciseNames.push(name);

      await assignExercise(api, workoutId, exerciseId);
    }

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
    });

  await expect(nextButton).toBeVisible({ timeout: 15_000 });
  await nextButton.click();

  // The step-2 component performs its own initial HTTP loading in ngOnInit.
  // Do not race those internal requests with waitForResponse() here: the
  // business assertion we need is the actual workout -> exercises request,
  // which is registered immediately before the Exercises button click below.
  await expect(
    page.locator('app-coach-program-builder-workouts'),
  ).toBeVisible({ timeout: 15_000 });

  await addWorkoutThroughPicker(page, fixture.programId, fixture.workoutId, fixture.workoutName, 1);

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

  const exercisesButton = workoutRow.getByRole('button', {
    name: /^(exercise-ok|exercises|übungen)$/i,
  });

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

  const modal = page.getByRole('dialog');
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

/** Traverse actual picker pages. Never fill a relation through an API fixture. */
export async function addWorkoutThroughPicker(
  page: Page, programId: number, workoutId: number, workoutName: string, expectedDay: number,
): Promise<void> {
  const builder = page.locator('app-coach-program-builder-workouts');
  const board = builder.locator('app-coach-workout-board');
  if (!(await board.isVisible())) {
    await builder.getByTestId('open-workout-picker').click();
  }
  const checkbox = board.locator(`#compact-workout-${workoutId}`);
  const pagination = board.locator('app-pagination');
  const previous = pagination.getByRole('button', { name: /előző|previous|zurück/i });
  const next = pagination.getByRole('button', { name: /következő|next|weiter/i });
  // The search control exists only after the current catalog request finishes.
  await expect(board.locator('#workoutSearch')).toBeVisible();
  const moveToPage = async (button: typeof next, expectedPage: number) => {
    const loaded = page.waitForResponse(response => {
      const url = new URL(response.url());
      return response.request().method() === 'GET' && url.pathname === API_ENDPOINTS.workouts.mySearch &&
        Number(url.searchParams.get('page')) === expectedPage - 1;
    });
    await button.click();
    const response = await loaded;
    expect(response.ok()).toBe(true);
    const body = await response.json();
    expect(Array.isArray(body.content)).toBe(true);
    expect(Number.isInteger(body.totalPages)).toBe(true);
    await expect(board.locator('#workoutSearch')).toBeVisible();
    await expect(board.getByRole('checkbox')).toHaveCount(body.content.length);
    await expect(pagination).toContainText(`${expectedPage} / ${body.totalPages}`);
  };
  const pageNumbers = async () => {
    const text = await pagination.innerText();
    const match = text.match(/(\d+)\s*\/\s*(\d+)/);
    if (!match) throw new Error(`Picker pagination does not expose its current/total page: ${text}`);
    return { current: Number(match[1]), total: Number(match[2]) };
  };
  while (await previous.count() && await previous.isEnabled()) {
    const { current } = await pageNumbers();
    await moveToPage(previous, current - 1);
  }
  while (!(await checkbox.count())) {
    if (!(await pagination.count())) throw new Error(`Workout ${workoutId} is missing from the only actual picker page.`);
    const { current, total } = await pageNumbers();
    if (current >= total) throw new Error(`Workout ${workoutId} is missing from all ${total} actual picker pages.`);
    await moveToPage(next, current + 1);
  }
  await checkbox.check();
  await expect(checkbox).toBeChecked();
  const responsePromise = page.waitForResponse(response => {
    if (response.request().method() !== 'POST' || new URL(response.url()).pathname !== API_ENDPOINTS.programWorkouts.base) return false;
    const body = response.request().postDataJSON();
    return body.programId === programId && body.workoutId === workoutId;
  });
  await builder.getByTestId('add-workouts-to-program').click();
  const response = await responsePromise;
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(body.data.workoutId).toBe(workoutId);
  expect(body.data.dayIndex).toBe(expectedDay);
  const occurrenceId = Number(body.data.id);
  expect(occurrenceId).toBeGreaterThan(0);
  const row = await dbOne<{ program_id: number; workout_id: number; day_index: number }>(
    'SELECT program_id, workout_id, day_index FROM public.program_workouts WHERE id=$1', [occurrenceId]);
  expect(row).toEqual({ program_id: programId, workout_id: workoutId, day_index: expectedDay });
  await expect(builder.getByTestId('selected-workout').filter({ has: page.getByRole('heading', { name: workoutName, exact: true }) }).filter({ hasText: `${expectedDay}. nap` })).toHaveCount(1);
}
