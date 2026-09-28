import { expect, request, test, type Page } from '@playwright/test';

import {
  assertExerciseInDatabase,
  closeExerciseDatabase,
  getExerciseBaseline,
  type ExerciseDbRow,
} from '../helpers/exercise-db';
import { loginAs, setTestLanguage, navigateSpa } from '../helpers/read-only';

const BASE_API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';
const LANGUAGE = process.env.E2E_LANGUAGE ?? 'hu';

type ExerciseRequestBody = Record<string, unknown>;

function nullable(value: unknown): unknown {
  return value === undefined ? null : value;
}

function uniqueDescription(): string {
  return `E2E Exercise UPDATE description ${Date.now()}-${Math.floor(
    Math.random() * 1_000_000,
  )}`;
}

function assertUnchanged(
  requestBody: ExerciseRequestBody,
  baseline: ExerciseDbRow,
): void {
  expect(nullable(requestBody.id)).toBe(baseline.id);
  expect(nullable(requestBody.name)).toBe(baseline.name);
  expect(nullable(requestBody.bodyPart)).toBe(baseline.body_part);
  expect(nullable(requestBody.synonyms)).toBe(baseline.synonyms);
  expect(nullable(requestBody.instructions)).toBe(baseline.instructions);
  expect(nullable(requestBody.tips)).toBe(baseline.tips);
  expect(nullable(requestBody.primaryMuscles)).toBe(baseline.primary_muscles);
  expect(nullable(requestBody.secondaryMuscles)).toBe(baseline.secondary_muscles);
  expect(nullable(requestBody.imageUrl)).toBe(baseline.image_url);
  expect(nullable(requestBody.videoUrl)).toBe(baseline.video_url);
  expect(nullable(requestBody.muscleGroup)).toBe(baseline.muscle_group);
  expect(nullable(requestBody.equipment)).toBe(baseline.equipment);
  expect(nullable(requestBody.difficultyLevel)).toBe(baseline.difficulty_level);
  expect(nullable(requestBody.category)).toBe(baseline.category);
  expect(nullable(requestBody.caloriesBurnedPerMinute)).toBe(
    baseline.calories_burned_per_minute == null
      ? null
      : Number(baseline.calories_burned_per_minute),
  );
  expect(nullable(requestBody.durationSeconds)).toBe(
    baseline.duration_seconds == null ? null : Number(baseline.duration_seconds),
  );
  expect(nullable(requestBody.done)).toBe(baseline.done);
  expect(nullable(requestBody.forceType)).toBe(baseline.force_type);
  expect(nullable(requestBody.mechanic)).toBe(baseline.mechanic);
  expect(nullable(requestBody.isUnilateral)).toBe(baseline.is_unilateral);
  expect(nullable(requestBody.isBodyweight)).toBe(baseline.is_bodyweight);
  expect(nullable(requestBody.variationGroup)).toBe(baseline.variation_group);
}

async function waitForExerciseEditComponent(
  page: Page,
  exerciseId: number,
): Promise<void> {
  await expect(page).toHaveURL(
    new RegExp(`/coach/exercises/${exerciseId}/edit$`),
    { timeout: 15_000 },
  );

  const component = page.locator('app-coach-exercise-edit');

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
      `A /coach/exercises/${exerciseId}/edit route betöltődött, ` +
        'de az app-coach-exercise-edit komponens nem került a DOM-ba.\n' +
        JSON.stringify(diagnostics, null, 2),
    );
  }

  await expect(component.locator('#description')).toBeVisible({
    timeout: 15_000,
  });
  await expect(component.locator('#name')).toBeVisible({
    timeout: 15_000,
  });
}

async function restoreExercise(
  page: Page,
  baseline: ExerciseDbRow,
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
    const response = await api.put(
      `/api/exercises/update?language=${encodeURIComponent(
        baseline.language_code,
      )}`,
      {
        data: {
          id: baseline.id,
          name: baseline.name,
          description: baseline.description,
          bodyPart: baseline.body_part,
          synonyms: baseline.synonyms,
          instructions: baseline.instructions,
          tips: baseline.tips,
          primaryMuscles: baseline.primary_muscles,
          secondaryMuscles: baseline.secondary_muscles,
          imageUrl: baseline.image_url,
          videoUrl: baseline.video_url,
          muscleGroup: baseline.muscle_group,
          equipment: baseline.equipment,
          difficultyLevel: baseline.difficulty_level,
          category: baseline.category,
          caloriesBurnedPerMinute:
            baseline.calories_burned_per_minute == null
              ? null
              : Number(baseline.calories_burned_per_minute),
          durationSeconds:
            baseline.duration_seconds == null
              ? null
              : Number(baseline.duration_seconds),
          done: baseline.done,
          forceType: baseline.force_type,
          mechanic: baseline.mechanic,
          isUnilateral: baseline.is_unilateral,
          isBodyweight: baseline.is_bodyweight,
          variationGroup: baseline.variation_group,
        },
      },
    );

    const body = await response.text();

    expect(
      response.ok(),
      `Cleanup PUT /api/exercises/update: ${response.status()} ${body}`,
    ).toBeTruthy();
  } finally {
    await api.dispose();
  }
}

test.describe('Coach - Exercise UPDATE / PostgreSQL', () => {
  test.describe.configure({ mode: 'serial' });

  test.beforeEach(async ({ page }) => {
    await setTestLanguage(page);
  });

  test.afterAll(async () => {
    await closeExerciseDatabase();
  });

  test('UPDATE: csak description módosítása → API/DB verification → reload → restore', async ({
    page,
  }) => {
    page.on('console', (msg) => {
      console.log(`[browser:${msg.type()}] ${msg.text()}`);
    });

    page.on('pageerror', (error) => {
      console.error(`[pageerror] ${error.message}`);
    });

    page.on('requestfailed', (request) => {
      console.error(
        `[requestfailed] ${request.method()} ${request.url()} -> ${request.failure()?.errorText}`,
      );
    });

    const exerciseId = Number(process.env.E2E_EXERCISE_ID ?? 1046);
    const baseline = await getExerciseBaseline(exerciseId);

    let updateSucceeded = false;
    let updatedDescription = '';

    await loginAs(
      page,
      process.env.E2E_COACH_USERNAME,
      process.env.E2E_COACH_PASSWORD,
      `/coach/exercises/${exerciseId}/edit`,
    );

    try {
      await waitForExerciseEditComponent(page, exerciseId);

      const component = page.locator('app-coach-exercise-edit');
      const form = component.locator('form').first();

      await expect(form.locator('#name')).toHaveValue(baseline.name);
      await expect(form.locator('#description')).toHaveValue(
        baseline.description ?? '',
      );

      await expect(form.locator('#bodyPart')).toHaveValue(
        baseline.body_part ?? '',
      );
      await expect(form.locator('#synonyms')).toHaveValue(
        baseline.synonyms ?? '',
      );
      await expect(form.locator('#instructions')).toHaveValue(
        baseline.instructions ?? '',
      );
      await expect(form.locator('#tips')).toHaveValue(baseline.tips ?? '');
      await expect(form.locator('#primaryMuscles')).toHaveValue(
        baseline.primary_muscles ?? '',
      );
      await expect(form.locator('#secondaryMuscles')).toHaveValue(
        baseline.secondary_muscles ?? '',
      );

      // ----------------------------------------------------------
      // 2. KIZÁRÓLAG description módosítása
      // ----------------------------------------------------------

      updatedDescription = uniqueDescription();

      console.log('');
      console.log('============================================================');
      console.log('[E2E EXERCISE UPDATE] MÓDOSÍTÁS ELŐTT');
      console.log(`exerciseId       : ${exerciseId}`);
      console.log(`language         : ${baseline.language_code}`);
      console.log(`description DB   : ${JSON.stringify(baseline.description ?? '')}`);
      console.log(
        `description UI   : ${JSON.stringify(
          await form.locator('#description').inputValue(),
        )}`,
      );
      console.log(`description ÚJ   : ${JSON.stringify(updatedDescription)}`);
      console.log(
        `VÁLTOZÁS         : ${JSON.stringify(
          baseline.description ?? '',
        )} -> ${JSON.stringify(updatedDescription)}`,
      );
      console.log('============================================================');
      console.log('');

      await form.locator('#description').fill(updatedDescription);

      await expect(form.locator('#name')).toHaveValue(baseline.name);
      await expect(form.locator('#description')).toHaveValue(updatedDescription);

      const responsePromise = page.waitForResponse((response) => {
        const url = new URL(response.url());

        return (
          response.request().method() === 'PUT' &&
          url.pathname.endsWith('/api/exercises/update')
        );
      });

      await form.locator('button[type="submit"]').click();

      const response = await responsePromise;
      const responseBody = await response.json();
      const requestBody =
        response.request().postDataJSON() as ExerciseRequestBody;

      expect(
        response.ok(),
        `PUT /api/exercises/update: ${response.status()}`,
      ).toBeTruthy();

      expect(responseBody.success).toBeTruthy();
      expect(responseBody.data).toBeTruthy();
      expect(new URL(response.url()).searchParams.get('language')).toBe(
        LANGUAGE,
      );

      expect(nullable(requestBody.id)).toBe(baseline.id);
      expect(nullable(requestBody.name)).toBe(baseline.name);
      expect(nullable(requestBody.description)).toBe(updatedDescription);

      assertUnchanged(requestBody, baseline);

      const expectedAfter: ExerciseDbRow = {
        ...baseline,
        description: updatedDescription,
      };

      const dbAfter = await getExerciseBaseline(exerciseId);

      expect(dbAfter.id).toBe(baseline.id);
      expect(dbAfter.description).toBe(updatedDescription);

      await assertExerciseInDatabase(exerciseId, expectedAfter);

      console.log('');
      console.log('============================================================');
      console.log('[E2E EXERCISE UPDATE] ADATBÁZIS UPDATE ELLENŐRIZVE');
      console.log(`exerciseId       : ${exerciseId}`);
      console.log(`description DB   : ${JSON.stringify(baseline.description ?? '')}`);
      console.log(`description DB ÚJ : ${JSON.stringify(dbAfter.description ?? '')}`);
      console.log(
        `VÁLTOZÁS         : ${JSON.stringify(
          baseline.description ?? '',
        )} -> ${JSON.stringify(dbAfter.description ?? '')}`,
      );
      console.log('============================================================');
      console.log('');

      updateSucceeded = true;

      await navigateSpa(page, `/coach/exercises/${exerciseId}/edit`);
      await waitForExerciseEditComponent(page, exerciseId);

      const reloadedForm = page
        .locator('app-coach-exercise-edit form')
        .first();

      await expect(reloadedForm.locator('#name')).toHaveValue(baseline.name);
      await expect(reloadedForm.locator('#description')).toHaveValue(
        updatedDescription,
      );

      await expect(reloadedForm.locator('#bodyPart')).toHaveValue(
        baseline.body_part ?? '',
      );
      await expect(reloadedForm.locator('#synonyms')).toHaveValue(
        baseline.synonyms ?? '',
      );
      await expect(reloadedForm.locator('#instructions')).toHaveValue(
        baseline.instructions ?? '',
      );
      await expect(reloadedForm.locator('#tips')).toHaveValue(
        baseline.tips ?? '',
      );
      await expect(reloadedForm.locator('#primaryMuscles')).toHaveValue(
        baseline.primary_muscles ?? '',
      );
      await expect(reloadedForm.locator('#secondaryMuscles')).toHaveValue(
        baseline.secondary_muscles ?? '',
      );
    } finally {
      // ----------------------------------------------------------
      // 7. DB RESTORE
      // ----------------------------------------------------------

      if (updateSucceeded) {
        console.log('');
        console.log('============================================================');
        console.log('[E2E EXERCISE UPDATE] RESTORE ELŐTT');
        console.log(`exerciseId       : ${exerciseId}`);
        console.log(
          `description MOST : ${JSON.stringify(updatedDescription)}`,
        );
        console.log(
          `description VISSZA: ${JSON.stringify(baseline.description ?? '')}`,
        );
        console.log(
          `VÁLTOZÁS         : ${JSON.stringify(
            updatedDescription,
          )} -> ${JSON.stringify(baseline.description ?? '')}`,
        );
        console.log('============================================================');
        console.log('');

        await restoreExercise(page, baseline);

        const dbRestored = await getExerciseBaseline(exerciseId);

        expect(dbRestored.id).toBe(baseline.id);
        expect(dbRestored.description).toBe(baseline.description);

        await assertExerciseInDatabase(exerciseId, baseline);

        console.log('');
        console.log('============================================================');
        console.log('[E2E EXERCISE UPDATE] RESTORE ELLENŐRIZVE');
        console.log(`exerciseId       : ${exerciseId}`);
        console.log(
          `description DB   : ${JSON.stringify(dbRestored.description ?? '')}`,
        );
        console.log(
          `description EREDETI: ${JSON.stringify(baseline.description ?? '')}`,
        );
        console.log(
          `RESTORE          : ${JSON.stringify(
            updatedDescription,
          )} -> ${JSON.stringify(dbRestored.description ?? '')}`,
        );
        console.log('============================================================');
        console.log('');
      }
    }
  });
});
