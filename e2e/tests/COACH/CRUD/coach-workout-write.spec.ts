import { expect, request, test, type Page } from '@playwright/test';

import {
  assertWorkoutInDatabase,
  assertWorkoutDeleted,
  assertWorkoutExerciseDeleted,
  assertWorkoutExerciseInDatabase,
  closeWorkoutDatabase,
  getWorkoutExerciseInDatabase,
} from '../../helpers/workout-db';

import { getExerciseInDatabase } from '../../helpers/exercise-db';

const BASE_API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';
const LANGUAGE = process.env.E2E_LANGUAGE ?? 'hu';
const ASSIGN_EXERCISE_ID = Number(process.env.E2E_EXERCISE_ID ?? 1046);

type WorkoutData = {
  name: string;
  description: string;
  workoutDate: string;
  durationMinutes: number;
  intensityLevel: string;
};

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function buildWorkout(prefix: string): WorkoutData {
  const suffix = uniqueSuffix();

  return {
    name: `${prefix} ${suffix}`,
    description: `Playwright E2E teszt ${suffix}`,
    workoutDate: '2035-01-15',
    durationMinutes: 77,
    intensityLevel: 'High',
  };
}

async function loginAsCoach(page: Page): Promise<void> {
  const username = process.env.E2E_COACH_USERNAME;
  const password = process.env.E2E_COACH_PASSWORD;

  if (!username || !password || password === 'CHANGE_ME') {
    throw new Error(
      'Hiányzó E2E_COACH_USERNAME / E2E_COACH_PASSWORD a .env fájlból.',
    );
  }

  await page.goto('/login');
  await page.locator('input[formcontrolname="username"]').fill(username);
  await page.locator('input[formcontrolname="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();

  await expect(page).toHaveURL(/\/coach\/dashboard$/, { timeout: 15_000 });

  const tokenInfo = await page.evaluate(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return null;

    try {
      const payload = JSON.parse(
        atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')),
      );

      return {
        roles: payload.roles ?? payload.authorities ?? null,
        subject: payload.sub ?? null,
      };
    } catch {
      return null;
    }
  });

  expect(tokenInfo).not.toBeNull();
  expect(String(tokenInfo?.roles ?? '')).toContain('ROLE_COACH');
}

async function waitForCreateComponent(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/coach\/workouts\/new$/, { timeout: 15_000 });

  const component = page.locator('app-newworkout');

  try {
    await expect(component).toBeAttached({ timeout: 15_000 });
  } catch {
    const diagnostics = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      bodyText: document.body?.innerText?.slice(0, 3000) ?? '',
      html: document.documentElement.outerHTML.slice(0, 12000),
    }));

    throw new Error(
      'A /coach/workouts/new route betöltődött, de az app-newworkout komponens nem került a DOM-ba.\n' +
        JSON.stringify(diagnostics, null, 2),
    );
  }

  await expect(component.locator('#workoutName')).toBeVisible({
    timeout: 15_000,
  });
}

function createWorkoutForm(page: Page) {
  return page.locator('app-newworkout form').first();
}

async function fillCreateForm(page: Page, workout: WorkoutData): Promise<void> {
  await waitForCreateComponent(page);

  const form = createWorkoutForm(page);

  await form.locator('#workoutName').fill(workout.name);
  await form.locator('#description').fill(workout.description);
  await form.locator('#workoutDate').fill(workout.workoutDate);
  await form.locator('#durationMinutes').fill(String(workout.durationMinutes));

  const intensity = form.locator('select#intensityLevel');
  await expect(intensity).toBeVisible();
  await intensity.selectOption(workout.intensityLevel);

  await expect(form.locator('#workoutName')).toHaveValue(workout.name);
  await expect(form.locator('#description')).toHaveValue(workout.description);
  await expect(form.locator('#workoutDate')).toHaveValue(workout.workoutDate);
  await expect(form.locator('#durationMinutes')).toHaveValue(
    String(workout.durationMinutes),
  );
  await expect(intensity).toHaveValue(workout.intensityLevel);
}

async function createWorkoutThroughUi(
  page: Page,
  workout: WorkoutData,
): Promise<{ id: number; responseBody: any }> {
  await page.goto('/coach/workouts/new');
  await fillCreateForm(page, workout);

  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      response.request().method() === 'POST' &&
      url.pathname.endsWith('/api/workouts/add')
    );
  });

  await createWorkoutForm(page).locator('button[type="submit"]').click();

  const response = await responsePromise;
  const responseBody = await response.json();
  const requestBody = response.request().postDataJSON() as Record<string, unknown>;

  expect(response.ok(), `POST /api/workouts/add: ${response.status()}`).toBeTruthy();
  expect(responseBody.success).toBeTruthy();
  expect(responseBody.data).toBeTruthy();

  const id = Number(responseBody.data.id);
  expect(Number.isInteger(id) && id > 0).toBeTruthy();

  expect(requestBody.name).toBe(workout.name);
  expect(requestBody.description).toBe(workout.description);
  expect(requestBody.workoutDate).toBe(workout.workoutDate);
  expect(Number(requestBody.durationMinutes)).toBe(workout.durationMinutes);
  expect(requestBody.intensityLevel).toBe(workout.intensityLevel);

  await expect(page).toHaveURL(
    new RegExp(`/coach/assign-workouts-exercises\\?.*workoutId=${id}`),
    { timeout: 15_000 },
  );

  return { id, responseBody };
}

async function getAccessToken(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem('accessToken'));

  if (!token) {
    throw new Error('E2E: accessToken nem található.');
  }

  return token;
}

async function deleteWorkoutAsCurrentCoach(
  page: Page,
  workoutId: number,
): Promise<void> {
  const token = await getAccessToken(page);

  const api = await request.newContext({
    baseURL: BASE_API_URL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  try {
    const response = await api.delete(`/api/workouts/delete/${workoutId}`);
    const body = await response.text();

    expect(
      response.ok(),
      `Cleanup DELETE /api/workouts/delete/${workoutId}: ${response.status()} ${body}`,
    ).toBeTruthy();
  } finally {
    await api.dispose();
  }
}

async function deleteWorkoutExerciseAsCurrentCoach(
  page: Page,
  workoutId: number,
  exerciseId: number,
): Promise<void> {
  const token = await getAccessToken(page);

  const api = await request.newContext({
    baseURL: BASE_API_URL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });

  try {
    const response = await api.delete('/api/workout-exercises/delete', {
      params: {
        workoutId,
        exerciseId,
      },
    });

    const body = await response.text();

    expect(
      response.ok(),
      `Cleanup DELETE /api/workout-exercises/delete?workoutId=${workoutId}&exerciseId=${exerciseId}: ` +
        `${response.status()} ${body}`,
    ).toBeTruthy();
  } finally {
    await api.dispose();
  }
}

async function waitForEditComponent(
  page: Page,
  workoutId: number,
): Promise<void> {
  await expect(page).toHaveURL(
    new RegExp(`/coach/workouts/${workoutId}/edit$`),
    { timeout: 15_000 },
  );

  const component = page.locator('app-coach-workout-edit');

  try {
    await expect(component).toBeAttached({ timeout: 15_000 });
  } catch {
    const diagnostics = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      bodyText: document.body?.innerText?.slice(0, 3000) ?? '',
      html: document.documentElement.outerHTML.slice(0, 12000),
    }));

    throw new Error(
      `A /coach/workouts/${workoutId}/edit route betöltődött, ` +
        'de az app-coach-workout-edit komponens nem került a DOM-ba.\n' +
        JSON.stringify(diagnostics, null, 2),
    );
  }

  await expect(component.locator('#workoutName')).toBeVisible({
    timeout: 15_000,
  });
}

async function updateWorkoutThroughUi(
  page: Page,
  workoutId: number,
  expectedBefore: WorkoutData,
  expectedAfter: WorkoutData,
): Promise<void> {
  await page.goto(`/coach/workouts/${workoutId}/edit`);
  await waitForEditComponent(page, workoutId);

  const component = page.locator('app-coach-workout-edit');
  const form = component.locator('form').first();

  await expect(form.locator('#workoutName')).toHaveValue(expectedBefore.name);
  await expect(form.locator('#description')).toHaveValue(expectedBefore.description);
  await expect(form.locator('#workoutDate')).toHaveValue(expectedBefore.workoutDate);
  await expect(form.locator('#durationMinutes')).toHaveValue(
    String(expectedBefore.durationMinutes),
  );

  await form.locator('#workoutName').fill(expectedAfter.name);
  await form.locator('#description').fill(expectedAfter.description);
  await form.locator('#workoutDate').fill(expectedAfter.workoutDate);
  await form.locator('#durationMinutes').fill(String(expectedAfter.durationMinutes));

  await form.locator('select#intensityLevel').selectOption(expectedAfter.intensityLevel);

  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      response.request().method() === 'PUT' &&
      url.pathname.endsWith('/api/workouts/update')
    );
  });

  await form.locator('button[type="submit"]').click();

  const response = await responsePromise;
  const responseBody = await response.json();
  const requestBody = response.request().postDataJSON() as Record<string, unknown>;

  expect(response.ok(), `PUT /api/workouts/update: ${response.status()}`).toBeTruthy();
  expect(responseBody.success).toBeTruthy();
  expect(responseBody.data).toBeTruthy();

  expect(Number(requestBody.id)).toBe(workoutId);
  expect(requestBody.name).toBe(expectedAfter.name);
  expect(requestBody.description).toBe(expectedAfter.description);

  expect(requestBody.workoutDate).toBe(expectedAfter.workoutDate);

  expect(Number(requestBody.durationMinutes)).toBe(expectedAfter.durationMinutes);
  expect(requestBody.intensityLevel).toBe(expectedAfter.intensityLevel);
}

async function waitForAssignComponent(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/coach\/assign-workouts-exercises\?.*/, {
    timeout: 15_000,
  });

  await expect(page.locator('app-assign-workouts-exercises')).toBeAttached({
    timeout: 15_000,
  });

  await expect(page.locator('#workoutSearch')).toBeVisible({
    timeout: 15_000,
  });

  await expect(page.locator('#exerciseSearch')).toBeVisible({
    timeout: 15_000,
  });
}

async function assignExerciseThroughUi(
  page: Page,
  workout: WorkoutData,
  workoutId: number,
  exerciseId: number,
  exerciseName: string,
): Promise<void> {
  await page.goto(
    `/coach/assign-workouts-exercises?workoutId=${workoutId}`,
  );

  await waitForAssignComponent(page);

  const workoutSearch = page.locator('#workoutSearch');
  await workoutSearch.fill(workout.name);

  const workoutCheckbox = page.locator(
    `#compact-workout-${workoutId}`,
  );

  await expect(workoutCheckbox).toBeVisible({ timeout: 15_000 });
  await workoutCheckbox.check();
  await expect(workoutCheckbox).toBeChecked();

  const exerciseSearch = page.locator('#exerciseSearch');
  await exerciseSearch.fill(exerciseName);

  const exerciseCheckbox = page.locator(
    `#compact-exercise-${exerciseId}`,
  );

  await expect(exerciseCheckbox).toBeVisible({ timeout: 15_000 });
  await exerciseCheckbox.check();
  await expect(exerciseCheckbox).toBeChecked();

  const saveButton = page.locator(
    'app-assign-workouts-exercises button[type="button"]',
  ).filter({ hasText: /mentés|save/i }).last();

  await expect(saveButton).toBeEnabled();

  const responsePromise = page.waitForResponse((response) => {
    const url = new URL(response.url());

    return (
      response.request().method() === 'POST' &&
      url.pathname.endsWith('/api/workout-exercises/assign') &&
      Number(url.searchParams.get('workoutId')) === workoutId &&
      Number(url.searchParams.get('exerciseId')) === exerciseId
    );
  });

  await saveButton.click();

  const response = await responsePromise;
  const body = await response.json();

  expect(
    response.ok(),
    `POST /api/workout-exercises/assign: ${response.status()}`,
  ).toBeTruthy();

  expect(body.success).toBeTruthy();
}

test.describe('Coach - Workout CREATE / UPDATE / DELETE / ASSIGN / PostgreSQL', () => {
  test.describe.configure({ mode: 'serial' });

  test.afterAll(async () => {
    await closeWorkoutDatabase();
  });

  test('CREATE: UI → POST → PostgreSQL → cleanup → PostgreSQL', async ({ page }) => {
    await loginAsCoach(page);

    const workout = buildWorkout('E2E CREATE');
    let workoutId: number | undefined;

    try {
      const created = await createWorkoutThroughUi(page, workout);
      workoutId = created.id;

      const db = await assertWorkoutInDatabase(workoutId, workout);

      expect(db.id).toBe(workoutId);
      expect(db.name).toBe(workout.name);
      expect(db.description).toBe(workout.description);
      expect(db.workout_date).toBe(workout.workoutDate);
      expect(Number(db.duration_minutes)).toBe(workout.durationMinutes);
      expect(db.intensity_level).toBe(workout.intensityLevel);
    } finally {
      if (workoutId !== undefined) {
        await deleteWorkoutAsCurrentCoach(page, workoutId);
        await assertWorkoutDeleted(workoutId);
      }
    }
  });

  test('UPDATE: CREATE → DB baseline → UI UPDATE → API/DB verification → reload', async ({
    page,
  }) => {
    await loginAsCoach(page);

    const original = buildWorkout('E2E UPDATE');

    const updated: WorkoutData = {
      ...original,
      name: `${original.name} MODIFIED`,
      description: `${original.description} - módosítva`,
      durationMinutes: 91,
      intensityLevel: 'low',
    };

    let workoutId: number | undefined;

    try {
      const created = await createWorkoutThroughUi(page, original);
      workoutId = created.id;

      await assertWorkoutInDatabase(workoutId, original);

      await updateWorkoutThroughUi(page, workoutId, original, updated);

      const db = await assertWorkoutInDatabase(workoutId, updated);

      expect(db.id).toBe(workoutId);
      expect(db.name).toBe(updated.name);
      expect(db.description).toBe(updated.description);
      expect(db.workout_date).toBe(updated.workoutDate);
      expect(Number(db.duration_minutes)).toBe(updated.durationMinutes);
      expect(db.intensity_level).toBe(updated.intensityLevel);

      await page.goto(`/coach/workouts/${workoutId}/edit`);
      await waitForEditComponent(page, workoutId);

      const form = page.locator('app-coach-workout-edit form').first();

      await expect(form.locator('#workoutName')).toHaveValue(updated.name);
      await expect(form.locator('#description')).toHaveValue(updated.description);
      await expect(form.locator('#workoutDate')).toHaveValue(updated.workoutDate);
      await expect(form.locator('#durationMinutes')).toHaveValue(
        String(updated.durationMinutes),
      );
      await expect(form.locator('select#intensityLevel')).toHaveValue(
        updated.intensityLevel,
      );
    } finally {
      if (workoutId !== undefined) {
        await deleteWorkoutAsCurrentCoach(page, workoutId);
        await assertWorkoutDeleted(workoutId);
      }
    }
  });

  test('DELETE: CREATE → DELETE API → PostgreSQL cleanup verification', async ({
    page,
  }) => {
    await loginAsCoach(page);

    const workout = buildWorkout('E2E DELETE');
    let workoutId: number | undefined;

    try {
      const created = await createWorkoutThroughUi(page, workout);
      workoutId = created.id;

      const before = await assertWorkoutInDatabase(workoutId, workout);

      console.log('');
      console.log('============================================================');
      console.log('[E2E WORKOUT DELETE] TÖRLÉS ELŐTT');
      console.log(`workoutId        : ${workoutId}`);
      console.log(`name             : ${JSON.stringify(before.name)}`);
      console.log(`description      : ${JSON.stringify(before.description)}`);
      console.log('============================================================');
      console.log('');

      await deleteWorkoutAsCurrentCoach(page, workoutId);
      await assertWorkoutDeleted(workoutId);

      workoutId = undefined;
    } finally {
      if (workoutId !== undefined) {
        await deleteWorkoutAsCurrentCoach(page, workoutId);
        await assertWorkoutDeleted(workoutId);
      }
    }
  });

  test('ASSIGN: CREATE workout → UI exercise hozzárendelés → API/DB verification → relation cleanup', async ({
    page,
  }) => {
    await loginAsCoach(page);

    expect(
      Number.isInteger(ASSIGN_EXERCISE_ID) && ASSIGN_EXERCISE_ID > 0,
    ).toBeTruthy();

    const exercise = await getExerciseInDatabase(ASSIGN_EXERCISE_ID, LANGUAGE);
    const workout = buildWorkout('E2E ASSIGN');

    let workoutId: number | undefined;
    let relationExists = false;

    try {
      const created = await createWorkoutThroughUi(page, workout);
      workoutId = created.id;

      await expect(
        getWorkoutExerciseInDatabase(workoutId, ASSIGN_EXERCISE_ID),
      ).resolves.toBeNull();

      await assignExerciseThroughUi(
        page,
        workout,
        workoutId,
        ASSIGN_EXERCISE_ID,
        exercise.name ?? '',
      );

      const relation = await assertWorkoutExerciseInDatabase(
        workoutId,
        ASSIGN_EXERCISE_ID,
      );

      relationExists = true;

      expect(relation.workout_id).toBe(workoutId);
      expect(relation.exercise_id).toBe(ASSIGN_EXERCISE_ID);

      // A DB defaultok is a tényleges backend viselkedés része.
      expect(Number(relation.sets)).toBe(3);
      expect(Number(relation.repetitions)).toBe(10);
      expect(Number(relation.rest_seconds)).toBe(60);

      console.log('');
      console.log('============================================================');
      console.log('[E2E WORKOUT-EXERCISE ASSIGN] LÉTREHOZVA');
      console.log(`workoutId        : ${workoutId}`);
      console.log(`exerciseId       : ${ASSIGN_EXERCISE_ID}`);
      console.log(`exercise name    : ${JSON.stringify(exercise.name)}`);
      console.log(`relation id      : ${relation.id}`);
      console.log(`sets             : ${relation.sets}`);
      console.log(`repetitions      : ${relation.repetitions}`);
      console.log(`rest_seconds     : ${relation.rest_seconds}`);
      console.log(`order_index      : ${relation.order_index}`);
      console.log('============================================================');
      console.log('');
    } finally {
      if (workoutId !== undefined) {
        if (relationExists) {
          await deleteWorkoutExerciseAsCurrentCoach(
            page,
            workoutId,
            ASSIGN_EXERCISE_ID,
          );
          await assertWorkoutExerciseDeleted(
            workoutId,
            ASSIGN_EXERCISE_ID,
          );
        }

        await deleteWorkoutAsCurrentCoach(page, workoutId);
        await assertWorkoutDeleted(workoutId);
      }
    }
  });

  test('NEGATIVE: UPDATE nem létező workout ID → API elutasítja', async ({
    page,
  }) => {
    await loginAsCoach(page);

    const token = await getAccessToken(page);

    const api = await request.newContext({
      baseURL: BASE_API_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    try {
      const response = await api.put('/api/workouts/update?language=hu', {
        data: {
          id: 2147483000,
          name: `E2E NEGATIVE ${uniqueSuffix()}`,
          description: 'E2E NEGATIVE',
          workoutDate: '2035-01-15',
          durationMinutes: 30,
          intensityLevel: 'High',
          done: false,
        },
      });

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBeGreaterThanOrEqual(400);
    } finally {
      await api.dispose();
    }
  });

  test('NEGATIVE: DELETE nem létező workout ID → API elutasítja', async ({
    page,
  }) => {
    await loginAsCoach(page);

    const token = await getAccessToken(page);

    const api = await request.newContext({
      baseURL: BASE_API_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    try {
      const response = await api.delete('/api/workouts/delete/2147483000');

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBeGreaterThanOrEqual(400);
    } finally {
      await api.dispose();
    }
  });

  test('NEGATIVE: ASSIGN nem létező workout ID → API elutasítja és DB nem változik', async ({
    page,
  }) => {
    await loginAsCoach(page);

    const token = await getAccessToken(page);

    const api = await request.newContext({
      baseURL: BASE_API_URL,
      extraHTTPHeaders: {
        Authorization: `Bearer ${token}`,
      },
    });

    try {
      const response = await api.post('/api/workout-exercises/assign', {
        params: {
          workoutId: 2147483000,
          exerciseId: ASSIGN_EXERCISE_ID,
        },
      });

      expect(response.ok()).toBeFalsy();
      expect(response.status()).toBeGreaterThanOrEqual(400);

      const relation = await getWorkoutExerciseInDatabase(
        2147483000,
        ASSIGN_EXERCISE_ID,
      );

      expect(relation).toBeNull();
    } finally {
      await api.dispose();
    }
  });

  test('NEGATIVE: ugyanaz az exercise kétszer → második hozzárendelés elutasítva', async ({
    page,
  }) => {
    await loginAsCoach(page);

    const workout = buildWorkout('E2E DUPLICATE ASSIGN');
    let workoutId: number | undefined;

    try {
      const created = await createWorkoutThroughUi(page, workout);
      workoutId = created.id;

      const token = await getAccessToken(page);

      const api = await request.newContext({
        baseURL: BASE_API_URL,
        extraHTTPHeaders: {
          Authorization: `Bearer ${token}`,
        },
      });

      try {
        const first = await api.post('/api/workout-exercises/assign', {
          params: {
            workoutId,
            exerciseId: ASSIGN_EXERCISE_ID,
          },
        });

        expect(first.ok()).toBeTruthy();

        const second = await api.post('/api/workout-exercises/assign', {
          params: {
            workoutId,
            exerciseId: ASSIGN_EXERCISE_ID,
          },
        });

        expect(second.ok()).toBeFalsy();
        expect(second.status()).toBeGreaterThanOrEqual(400);
      } finally {
        await api.dispose();
      }

      const relation = await assertWorkoutExerciseInDatabase(
        workoutId,
        ASSIGN_EXERCISE_ID,
      );

      expect(relation.exercise_id).toBe(ASSIGN_EXERCISE_ID);
    } finally {
      if (workoutId !== undefined) {
        try {
          await deleteWorkoutExerciseAsCurrentCoach(
            page,
            workoutId,
            ASSIGN_EXERCISE_ID,
          );
        } catch {
          // Ha az első assign sem jött létre, nincs mit törölni.
        }

        await assertWorkoutExerciseDeleted(
          workoutId,
          ASSIGN_EXERCISE_ID,
        );

        await deleteWorkoutAsCurrentCoach(page, workoutId);
        await assertWorkoutDeleted(workoutId);
      }
    }
  });
});
