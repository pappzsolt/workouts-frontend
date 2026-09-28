import { expect, test, type Page } from '@playwright/test';
import { request } from '@playwright/test';

import {
  assertWorkoutInDatabase,
  assertWorkoutDeleted,
  closeWorkoutDatabase,
} from '../helpers/workout-db';

const BASE_API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';

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
    // Ezt a CREATE oldalon a valódi Angular option érték adja.
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

/**
 * A CREATE oldal tényleges Angular komponense:
 * selector: app-newworkout
 *
 * Ha ez nem jelenik meg, nem locator-problémát akarunk elrejteni:
 * a teszt diagnosztikai hibával álljon meg.
 */
async function waitForCreateComponent(page: Page): Promise<void> {
  await expect(page).toHaveURL(/\/coach\/workouts\/new$/, {
    timeout: 15_000,
  });

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

  // A frontend service mapping ellenőrzése:
  // WorkoutRequest -> backend @JsonProperty("name"/"description").
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

async function deleteWorkoutAsCurrentCoach(
  page: Page,
  workoutId: number,
): Promise<void> {
  const token = await page.evaluate(() => localStorage.getItem('accessToken'));

  if (!token) {
    throw new Error('Cleanup: accessToken nem található.');
  }

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

async function waitForEditComponent(
  page: Page,
  workoutId: number,
): Promise<void> {
  await expect(page).toHaveURL(
    new RegExp(`/coach/workouts/${workoutId}/edit$`),
    { timeout: 15_000 },
  );

  // A tényleges selector: app-coach-workout-edit.
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
): Promise<any> {
  await page.goto(`/coach/workouts/${workoutId}/edit`);
  await waitForEditComponent(page, workoutId);

  const component = page.locator('app-coach-workout-edit');
  const form = component.locator('form').first();

  // Nem a korábbi Angular state-et, hanem az API-ból betöltött adatot ellenőrizzük.
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

  const intensity = form.locator('select#intensityLevel');
  await intensity.selectOption(expectedAfter.intensityLevel);

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

  // A backend WorkoutResponse update esetén jelenleg az id nincs kitöltve.
  // Emiatt itt nem hamisítunk elvárást: a request id és a DB azonosítja a workoutot.
  expect(Number(requestBody.id)).toBe(workoutId);
  expect(requestBody.name).toBe(expectedAfter.name);
  expect(requestBody.description).toBe(expectedAfter.description);

  // A frontend az edit során a HTML date mező értékét Date-ként is
  // elküldheti, ezért a PUT requestben a dátum lehet ISO timestamp:
  // pl. "2035-01-15T00:00:00.000Z". A domain elvárásunk viszont
  // DATE érték, ezért csak a dátumrészt hasonlítjuk össze.
  const actualWorkoutDate = String(requestBody.workoutDate ?? '').slice(0, 10);
  expect(actualWorkoutDate).toBe(expectedAfter.workoutDate);

  expect(Number(requestBody.durationMinutes)).toBe(expectedAfter.durationMinutes);
  expect(requestBody.intensityLevel).toBe(expectedAfter.intensityLevel);

  return responseBody;
}

test.describe('Coach - Workout CREATE / UPDATE / PostgreSQL', () => {
  test.describe.configure({ mode: 'serial' });

  test.afterAll(async () => {
    await closeWorkoutDatabase();
  });

  test('CREATE: UI → POST → PostgreSQL → cleanup → PostgreSQL', async ({ page }) => {
    page.on('console', msg => {
      console.log(`[browser:${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', error => {
      console.error(`[pageerror] ${error.message}`);
    });

    page.on('requestfailed', request => {
      console.error(
        `[requestfailed] ${request.method()} ${request.url()} -> ${request.failure()?.errorText}`,
      );
    });

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
      expect(db.translation_name).toBe(workout.name);
      expect(db.translation_description).toBe(workout.description);
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
    page.on('console', msg => {
      console.log(`[browser:${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', error => {
      console.error(`[pageerror] ${error.message}`);
    });

    page.on('requestfailed', request => {
      console.error(
        `[requestfailed] ${request.method()} ${request.url()} -> ${request.failure()?.errorText}`,
      );
    });

    await loginAsCoach(page);

    const original = buildWorkout('E2E UPDATE');

    const updated: WorkoutData = {
      ...original,
      name: `${original.name} MODIFIED`,
      description: `${original.description} - módosítva`,
      durationMinutes: 91,
      // Az EDIT template tényleges option értéke.
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
      expect(db.translation_name).toBe(updated.name);
      expect(db.translation_description).toBe(updated.description);

      // Teljes újratöltés: így nem csak az Angular memóriában lévő state-et teszteljük.
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
});
