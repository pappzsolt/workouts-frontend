import { test, expect, Page } from '@playwright/test';
import { loginAs } from '../helpers/read-only';

const COACH_USERNAME = process.env.E2E_COACH_USERNAME;
const COACH_PASSWORD = process.env.E2E_COACH_PASSWORD;

const CREATE_URL = /\/api\/workouts\/add(?:\?.*)?$/;
const UPDATE_URL = /\/api\/workouts\/update(?:\?.*)?$/;
type WorkoutResponse = {
  status?: string;
  success?: boolean;
  message?: string;
  data?: {
    id?: number | string;
    [key: string]: unknown;
  };
};

function requireCoachCredentials(): void {
  expect(COACH_USERNAME, 'Missing E2E_COACH_USERNAME').toBeTruthy();
  expect(COACH_PASSWORD, 'Missing E2E_COACH_PASSWORD').toBeTruthy();
}

async function loginAsCoach(page: Page): Promise<void> {
  requireCoachCredentials();

  await loginAs(
    page,
    COACH_USERNAME!,
    COACH_PASSWORD!,
    '/coach/dashboard',
  );
}

/**
 * Captures the Authorization header used by the Angular application.
 *
 * page.request shares browser cookies, so cookie-based authentication also
 * works. The captured header is only needed when the application uses a
 * bearer token stored outside cookies.
 */
function captureAuthHeader(page: Page): { get: () => string | undefined } {
  let authorization: string | undefined;

  page.on('request', (request) => {
    const value = request.headers()['authorization'];

    if (value) {
      authorization = value;
    }
  });

  return {
    get: () => authorization,
  };
}

async function createWorkoutThroughUi(
  page: Page,
  suffix: string,
): Promise<number> {
  const workoutName = `E2E Workout ${suffix}`;
  const description = `Playwright create/update test ${suffix}`;

  await page.goto('/coach/workouts/new');

  await expect(
    page.getByRole('heading', { name: /Létrehozás: Új Workout/i }),
  ).toBeVisible();

  const nameInput = page.getByLabel(/Workout neve/i);
  const descriptionInput = page.getByLabel(/^Leírás$/i);
  const dateInput = page.getByLabel(/^Dátum$/i);
  const durationInput = page.getByLabel(/Időtartam \(perc\)/i);
  const intensitySelect = page.getByLabel(/^Intenzitás$/i);

  await expect(nameInput).toBeVisible();
  await expect(descriptionInput).toBeVisible();
  await expect(dateInput).toBeVisible();
  await expect(durationInput).toBeVisible();
  await expect(intensitySelect).toBeVisible();

  await nameInput.fill(workoutName);
  await descriptionInput.fill(description);

  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);

  const yyyy = tomorrow.getFullYear();
  const mm = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const dd = String(tomorrow.getDate()).padStart(2, '0');

  await dateInput.fill(`${yyyy}-${mm}-${dd}`);
  await durationInput.fill('60');
  await intensitySelect.selectOption({ label: 'Közepes' });

  const createResponsePromise = page.waitForResponse((response) => {
    return response.request().method() === 'POST' && CREATE_URL.test(response.url());
  });

  await page.getByRole('button', { name: /Workout létrehozása/i }).click();

  const createResponse = await createResponsePromise;

  expect(createResponse.ok(), await createResponse.text()).toBeTruthy();

  const body = (await createResponse.json()) as WorkoutResponse;
  const workoutId = Number(body.data?.id);

  expect(
    Number.isInteger(workoutId) && workoutId > 0,
    `Backend create response does not contain a valid workout ID: ${JSON.stringify(body)}`,
  ).toBeTruthy();

  // Normal, non-Program-Builder creation continues to the exercise assignment page.
  await expect(page).toHaveURL(/\/coach\/assign-workouts-exercises(?:\?.*)?$/);

  return workoutId;
}

async function deleteWorkout(
  page: Page,
  workoutId: number | undefined,
  authorization?: string,
): Promise<void> {
  if (!workoutId) {
    return;
  }

  const headers: Record<string, string> = {};

  if (authorization) {
    headers.authorization = authorization;
  }

  const baseURL = process.env.E2E_BASE_URL ?? 'http://localhost:4200';
  const deleteURL = new URL(
    `/api/workouts/delete/${workoutId}`,
    baseURL,
  ).toString();

  const response = await page.request.delete(deleteURL, { headers });

  if (!response.ok()) {
    const body = await response.text();
    throw new Error(
      `E2E cleanup failed for workout ${workoutId}: HTTP ${response.status()} ${body}`,
    );
  }

  const body = (await response.json()) as WorkoutResponse;

  expect(
    body.status === undefined || body.status === 'success' || body.success === true,
    `Unexpected delete response: ${JSON.stringify(body)}`,
  ).toBeTruthy();
}

test.describe('Coach - workout create/update', () => {
  test.describe.configure({ mode: 'serial' });

  let createdWorkoutId: number | undefined;
  let authHeader: string | undefined;

  test.beforeEach(async ({ page }) => {
    const auth = captureAuthHeader(page);

    await loginAsCoach(page);

    authHeader = auth.get();
  });

  test.afterEach(async ({ page }) => {
    await deleteWorkout(page, createdWorkoutId, authHeader);

    createdWorkoutId = undefined;
    authHeader = undefined;
  });

  test('coach can create a workout and backend returns its ID', async ({ page }) => {
    const suffix = `${Date.now()}`;

    createdWorkoutId = await createWorkoutThroughUi(page, suffix);

    expect(createdWorkoutId).toBeGreaterThan(0);

    // Verify the created record can immediately be loaded back from the UI.
    await page.goto(`/coach/workouts/${createdWorkoutId}/edit`);

    await expect(
      page.getByRole('heading', { name: /Workout módosítása|Edit Workout/i }),
    ).toBeVisible();

    await expect(page.getByLabel(/Workout neve|Workout Name/i)).toHaveValue(
      `E2E Workout ${suffix}`,
    );
    await expect(page.getByLabel(/^Leírás$|^Description$/i)).toHaveValue(
      `Playwright create/update test ${suffix}`,
    );
    await expect(
      page.getByLabel(/Időtartam \(perc\)|Duration \(minutes\)/i),
    ).toHaveValue('60');
  });

  test('coach can modify a workout and the changes persist', async ({ page }) => {
    const suffix = `${Date.now()}`;

    createdWorkoutId = await createWorkoutThroughUi(page, suffix);

    const updatedName = `E2E Updated Workout ${suffix}`;
    const updatedDescription = `Updated by Playwright ${suffix}`;

    await page.goto(`/coach/workouts/${createdWorkoutId}/edit`);

    await expect(
      page.getByRole('heading', { name: /Workout módosítása|Edit Workout/i }),
    ).toBeVisible();

    const nameInput = page.getByLabel(/Workout neve|Workout Name/i);
    const descriptionInput = page.getByLabel(/^Leírás$|^Description$/i);
    const durationInput = page.getByLabel(/Időtartam \(perc\)|Duration \(minutes\)/i);
    const intensitySelect = page.getByLabel(/^Intenzitás$|^Intensity Level$/i);

    await expect(nameInput).toBeVisible();
    await expect(descriptionInput).toBeVisible();
    await expect(durationInput).toBeVisible();
    await expect(intensitySelect).toBeVisible();

    await nameInput.fill(updatedName);
    await descriptionInput.fill(updatedDescription);
    await durationInput.fill('75');
    await intensitySelect.selectOption({ label: 'Magas' });

    const updateResponsePromise = page.waitForResponse((response) => {
      return response.request().method() === 'PUT' && UPDATE_URL.test(response.url());
    });

    await page.getByRole('button', { name: /^Mentés$|^Save$/i }).click();

    const updateResponse = await updateResponsePromise;

    expect(updateResponse.ok(), await updateResponse.text()).toBeTruthy();

    const updateBody = (await updateResponse.json()) as WorkoutResponse;

    expect(
      updateBody.status === undefined ||
        updateBody.status === 'success' ||
        updateBody.success === true,
      `Unexpected update response: ${JSON.stringify(updateBody)}`,
    ).toBeTruthy();

    await expect(page).toHaveURL(/\/coach\/dashboard(?:\?.*)?$/);

    // Reload the edit page and verify that the values were really persisted.
    await page.goto(`/coach/workouts/${createdWorkoutId}/edit`);

    await expect(
      page.getByRole('heading', { name: /Workout módosítása|Edit Workout/i }),
    ).toBeVisible();

    await expect(nameInput).toHaveValue(updatedName);
    await expect(descriptionInput).toHaveValue(updatedDescription);
    await expect(durationInput).toHaveValue('75');
  });
});
