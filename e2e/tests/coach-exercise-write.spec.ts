import { expect, request, test, type Page } from '@playwright/test';

import {
  assertExerciseDescriptionInDatabase,
  assertExerciseUnchangedExceptDescription,
  closeExerciseDatabase,
  getExerciseInDatabase,
} from '../helpers/exercise-db';

const BASE_API_URL =
  process.env.E2E_API_URL ?? 'http://localhost:8080';

const LANGUAGE =
  process.env.E2E_LANGUAGE ?? 'hu';

const EXERCISE_ID = Number(
  process.env.E2E_EXERCISE_ID ?? 1046,
);

type ExerciseUiSnapshot = {
  id: number;
  name: string;
  description: string;
  bodyPart: string;
  synonyms: string;
  instructions: string;
  tips: string;
  primaryMuscles: string;
  secondaryMuscles: string;

  imageUrl: string;
  videoUrl: string;
  muscleGroup: string;
  equipment: string;
  difficultyLevel: string;
  category: string;
  caloriesBurnedPerMinute: number;
  durationSeconds: number;
  forceType: string;
  mechanic: string;
  isUnilateral: boolean;
  isBodyweight: boolean;
  variationGroup: string;
};

function uniqueSuffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function valueOrEmpty(value: unknown): string {
  return value == null ? '' : String(value);
}

function numberOrZero(value: unknown): number {
  if (value == null || value === '') {
    return 0;
  }

  const number = Number(value);

  if (!Number.isFinite(number)) {
    throw new Error(`Nem numerikus érték: ${String(value)}`);
  }

  return number;
}

function booleanOrFalse(value: unknown): boolean {
  return Boolean(value);
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

  await expect(page).toHaveURL(/\/coach\/dashboard$/, {
    timeout: 15_000,
  });

  const tokenInfo = await page.evaluate(() => {
    const token = localStorage.getItem('accessToken');

    if (!token) {
      return null;
    }

    try {
      const payload = JSON.parse(
        atob(
          token
            .split('.')[1]
            .replace(/-/g, '+')
            .replace(/_/g, '/'),
        ),
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

async function waitForExerciseEdit(
  page: Page,
  exerciseId: number,
): Promise<void> {
  await expect(page).toHaveURL(
    new RegExp(`/coach/exercises/${exerciseId}/edit$`),
    { timeout: 15_000 },
  );

  const component = page.locator('app-coach-exercise-edit');

  try {
    await expect(component).toBeAttached({
      timeout: 15_000,
    });
  } catch {
    const diagnostics = await page.evaluate(() => ({
      url: location.href,
      title: document.title,
      bodyText:
        document.body?.innerText?.slice(0, 3000) ?? '',
      html:
        document.documentElement.outerHTML.slice(0, 12000),
    }));

    throw new Error(
      `A /coach/exercises/${exerciseId}/edit route betöltődött, ` +
        'de az app-coach-exercise-edit komponens nem került a DOM-ba.\n' +
        JSON.stringify(diagnostics, null, 2),
    );
  }

  await expect(
    component.locator('#name'),
  ).toBeVisible({ timeout: 15_000 });

  await expect(
    component.locator('#description'),
  ).toBeVisible({ timeout: 15_000 });
}

function exerciseForm(page: Page) {
  return page
    .locator('app-coach-exercise-edit form')
    .first();
}

async function readExerciseFromUi(
  page: Page,
  exerciseId: number,
): Promise<ExerciseUiSnapshot> {
  await page.goto(
    `/coach/exercises/${exerciseId}/edit`,
  );

  await waitForExerciseEdit(page, exerciseId);

  const form = exerciseForm(page);

  return {
    id: exerciseId,

    name: await form.locator('#name').inputValue(),
    description: await form.locator('#description').inputValue(),
    bodyPart: await form.locator('#bodyPart').inputValue(),
    synonyms: await form.locator('#synonyms').inputValue(),
    instructions: await form.locator('#instructions').inputValue(),
    tips: await form.locator('#tips').inputValue(),
    primaryMuscles:
      await form.locator('#primaryMuscles').inputValue(),
    secondaryMuscles:
      await form.locator('#secondaryMuscles').inputValue(),

    imageUrl: await form.locator('#imageUrl').inputValue(),
    videoUrl: await form.locator('#videoUrl').inputValue(),
    muscleGroup:
      await form.locator('#muscleGroup').inputValue(),
    equipment:
      await form.locator('#equipment').inputValue(),
    difficultyLevel:
      await form.locator('#difficultyLevel').inputValue(),
    category:
      await form.locator('#category').inputValue(),

    caloriesBurnedPerMinute:
      numberOrZero(
        await form
          .locator('#caloriesBurnedPerMinute')
          .inputValue(),
      ),

    durationSeconds:
      numberOrZero(
        await form
          .locator('#durationSeconds')
          .inputValue(),
      ),

    forceType:
      await form.locator('#forceType').inputValue(),

    mechanic:
      await form.locator('#mechanic').inputValue(),

    isUnilateral:
      await form.locator('#isUnilateral').inputValue() ===
      'true',

    isBodyweight:
      await form.locator('#isBodyweight').inputValue() ===
      'true',

    variationGroup:
      await form.locator('#variationGroup').inputValue(),
  };
}

function logChange(
  title: string,
  exerciseId: number,
  before: string | null,
  after: string | null,
): void {
  console.log('');
  console.log('============================================================');
  console.log(`[E2E EXERCISE UPDATE] ${title}`);
  console.log(`exerciseId       : ${exerciseId}`);
  console.log(`language         : ${LANGUAGE}`);
  console.log(`description DB   : ${JSON.stringify(before)}`);
  console.log(`description ÚJ   : ${JSON.stringify(after)}`);
  console.log(
    `VÁLTOZÁS         : ${JSON.stringify(before)} -> ${JSON.stringify(after)}`,
  );
  console.log('============================================================');
  console.log('');
}

function assertRequestMatchesBaseline(
  requestBody: Record<string, unknown>,
  baseline: Awaited<ReturnType<typeof getExerciseInDatabase>>,
  expectedDescription: string,
): void {
  expect(Number(requestBody.id)).toBe(baseline.id);

  // exercise_translations: csak a description változhat.
  expect(valueOrEmpty(requestBody.name)).toBe(
    valueOrEmpty(baseline.name),
  );

  expect(valueOrEmpty(requestBody.description)).toBe(
    expectedDescription,
  );

  expect(valueOrEmpty(requestBody.bodyPart)).toBe(
    valueOrEmpty(baseline.body_part),
  );

  expect(valueOrEmpty(requestBody.synonyms)).toBe(
    valueOrEmpty(baseline.synonyms),
  );

  expect(valueOrEmpty(requestBody.instructions)).toBe(
    valueOrEmpty(baseline.instructions),
  );

  expect(valueOrEmpty(requestBody.tips)).toBe(
    valueOrEmpty(baseline.tips),
  );

  expect(valueOrEmpty(requestBody.primaryMuscles)).toBe(
    valueOrEmpty(baseline.primary_muscles),
  );

  expect(valueOrEmpty(requestBody.secondaryMuscles)).toBe(
    valueOrEmpty(baseline.secondary_muscles),
  );

  // exercises: egyik közös mező sem változhat.
  expect(valueOrEmpty(requestBody.imageUrl)).toBe(
    valueOrEmpty(baseline.image_url),
  );

  expect(valueOrEmpty(requestBody.videoUrl)).toBe(
    valueOrEmpty(baseline.video_url),
  );

  expect(valueOrEmpty(requestBody.muscleGroup)).toBe(
    valueOrEmpty(baseline.muscle_group),
  );

  expect(valueOrEmpty(requestBody.equipment)).toBe(
    valueOrEmpty(baseline.equipment),
  );

  expect(valueOrEmpty(requestBody.difficultyLevel)).toBe(
    valueOrEmpty(baseline.difficulty_level),
  );

  expect(valueOrEmpty(requestBody.category)).toBe(
    valueOrEmpty(baseline.category),
  );

  expect(
    numberOrZero(requestBody.caloriesBurnedPerMinute),
  ).toBe(
    numberOrZero(baseline.calories_burned_per_minute),
  );

  expect(
    numberOrZero(requestBody.durationSeconds),
  ).toBe(
    numberOrZero(baseline.duration_seconds),
  );

  expect(booleanOrFalse(requestBody.done)).toBe(
    booleanOrFalse(baseline.done),
  );

  expect(valueOrEmpty(requestBody.forceType)).toBe(
    valueOrEmpty(baseline.force_type),
  );

  expect(valueOrEmpty(requestBody.mechanic)).toBe(
    valueOrEmpty(baseline.mechanic),
  );

  expect(booleanOrFalse(requestBody.isUnilateral)).toBe(
    booleanOrFalse(baseline.is_unilateral),
  );

  expect(booleanOrFalse(requestBody.isBodyweight)).toBe(
    booleanOrFalse(baseline.is_bodyweight),
  );

  expect(valueOrEmpty(requestBody.variationGroup)).toBe(
    valueOrEmpty(baseline.variation_group),
  );
}

async function updateDescriptionThroughUi(
  page: Page,
  exerciseId: number,
  before: ExerciseUiSnapshot,
  baselineDb: Awaited<ReturnType<typeof getExerciseInDatabase>>,
  newDescription: string,
): Promise<void> {
  const form = exerciseForm(page);

  await expect(form.locator('#name')).toHaveValue(
    before.name,
  );

  await expect(form.locator('#description')).toHaveValue(
    before.description,
  );

  await form
    .locator('#description')
    .fill(newDescription);

  await expect(
    form.locator('#description'),
  ).toHaveValue(newDescription);

  const responsePromise = page.waitForResponse(
    (response) => {
      const url = new URL(response.url());

      return (
        response.request().method() === 'PUT' &&
        url.pathname.endsWith('/api/exercises/update')
      );
    },
  );

  await form
    .locator('button[type="submit"]')
    .click();

  const response = await responsePromise;

  const responseBody = await response.json();

  const requestBody =
    response.request().postDataJSON() as Record<
      string,
      unknown
    >;

  expect(
    response.ok(),
    `PUT /api/exercises/update: ${response.status()}`,
  ).toBeTruthy();

  expect(responseBody.success).toBeTruthy();
  expect(responseBody.data).toBeTruthy();

  expect(
    String(
      response.request().url(),
    ),
  ).toContain(
    `language=${encodeURIComponent(LANGUAGE)}`,
  );

  assertRequestMatchesBaseline(
    requestBody,
    baselineDb,
    newDescription,
  );

  expect(Number(responseBody.data.id)).toBe(
    exerciseId,
  );

  expect(
    valueOrEmpty(responseBody.data.description),
  ).toBe(newDescription);
}

test.describe(
  'Coach - Exercise UPDATE / PostgreSQL',
  () => {
    test.afterAll(async () => {
      await closeExerciseDatabase();
    });

    test(
      'UPDATE: csak description módosítása → API/DB verification → reload → restore',
      async ({ page }) => {
        page.on('console', (msg) => {
          console.log(
            `[browser:${msg.type()}] ${msg.text()}`,
          );
        });

        page.on('pageerror', (error) => {
          console.error(
            `[pageerror] ${error.message}`,
          );
        });

        page.on('requestfailed', (request) => {
          console.error(
            `[requestfailed] ${request.method()} ${request.url()} -> ${request.failure()?.errorText}`,
          );
        });

        expect(
          Number.isInteger(EXERCISE_ID) &&
            EXERCISE_ID > 0,
        ).toBeTruthy();

        await loginAsCoach(page);

        // ------------------------------------------------------
        // 1. DB + UI baseline
        // ------------------------------------------------------

        const dbBefore =
          await getExerciseInDatabase(
            EXERCISE_ID,
            LANGUAGE,
          );

        const uiBefore =
          await readExerciseFromUi(
            page,
            EXERCISE_ID,
          );

        const expectedBaselineDescription =
          dbBefore.description ?? '';

        expect(uiBefore.id).toBe(EXERCISE_ID);

        expect(uiBefore.name).toBe(
          valueOrEmpty(dbBefore.name),
        );

        expect(uiBefore.description).toBe(
          expectedBaselineDescription,
        );

        console.log('');
        console.log(
          '============================================================',
        );
        console.log(
          '[E2E EXERCISE UPDATE] MÓDOSÍTÁS ELŐTT',
        );
        console.log(
          `exerciseId       : ${EXERCISE_ID}`,
        );
        console.log(
          `language         : ${LANGUAGE}`,
        );
        console.log(
          `description DB   : ${JSON.stringify(dbBefore.description)}`,
        );
        console.log(
          `description UI   : ${JSON.stringify(uiBefore.description)}`,
        );
        console.log(
          '============================================================',
        );
        console.log('');

        // ------------------------------------------------------
        // 2. Csak description módosítása
        // ------------------------------------------------------

        const updatedDescription =
          `E2E Exercise UPDATE description ${uniqueSuffix()}`;

        logChange(
          'MÓDOSÍTÁS',
          EXERCISE_ID,
          dbBefore.description,
          updatedDescription,
        );

        await updateDescriptionThroughUi(
          page,
          EXERCISE_ID,
          uiBefore,
          dbBefore,
          updatedDescription,
        );

        // ------------------------------------------------------
        // 3. DB verification
        // ------------------------------------------------------

        const dbAfter =
          await assertExerciseDescriptionInDatabase(
            EXERCISE_ID,
            updatedDescription,
            LANGUAGE,
          );

        assertExerciseUnchangedExceptDescription(
          dbBefore,
          dbAfter,
        );

        console.log('');
        console.log(
          '============================================================',
        );
        console.log(
          '[E2E EXERCISE UPDATE] ADATBÁZIS UPDATE ELLENŐRIZVE',
        );
        console.log(
          `exerciseId       : ${EXERCISE_ID}`,
        );
        console.log(
          `description DB   : ${JSON.stringify(dbBefore.description)}`,
        );
        console.log(
          `description DB ÚJ : ${JSON.stringify(dbAfter.description)}`,
        );
        console.log(
          `VÁLTOZÁS         : ${JSON.stringify(dbBefore.description)} -> ${JSON.stringify(dbAfter.description)}`,
        );
        console.log(
          '============================================================',
        );
        console.log('');

        // ------------------------------------------------------
        // 4. Teljes reload → tényleg DB/API-ból jött-e vissza
        // ------------------------------------------------------

        await page.reload();

        await waitForExerciseEdit(
          page,
          EXERCISE_ID,
        );

        const reloadedForm =
          exerciseForm(page);

        await expect(
          reloadedForm.locator('#name'),
        ).toHaveValue(uiBefore.name);

        await expect(
          reloadedForm.locator('#description'),
        ).toHaveValue(updatedDescription);

        // ------------------------------------------------------
        // 5. Restore: ugyanazon UI update flow
        // ------------------------------------------------------

        logChange(
          'RESTORE',
          EXERCISE_ID,
          updatedDescription,
          expectedBaselineDescription,
        );

        const currentUi =
          await readExerciseFromUi(
            page,
            EXERCISE_ID,
          );

        await updateDescriptionThroughUi(
          page,
          EXERCISE_ID,
          currentUi,
          dbBefore,
          expectedBaselineDescription,
        );

        // ------------------------------------------------------
        // 6. Restore DB verification
        // ------------------------------------------------------

        const dbRestored =
          await assertExerciseDescriptionInDatabase(
            EXERCISE_ID,
            dbBefore.description,
            LANGUAGE,
          );

        assertExerciseUnchangedExceptDescription(
          dbBefore,
          dbRestored,
        );

        console.log('');
        console.log(
          '============================================================',
        );
        console.log(
          '[E2E EXERCISE UPDATE] RESTORE ELLENŐRIZVE',
        );
        console.log(
          `exerciseId       : ${EXERCISE_ID}`,
        );
        console.log(
          `description MOST : ${JSON.stringify(dbAfter.description)}`,
        );
        console.log(
          `description DB   : ${JSON.stringify(dbRestored.description)}`,
        );
        console.log(
          `description EREDETI: ${JSON.stringify(dbBefore.description)}`,
        );
        console.log(
          `RESTORE          : ${JSON.stringify(dbAfter.description)} -> ${JSON.stringify(dbRestored.description)}`,
        );
        console.log(
          '============================================================',
        );
        console.log('');

        // ------------------------------------------------------
        // 7. Reload after restore
        // ------------------------------------------------------

        await page.reload();

        await waitForExerciseEdit(
          page,
          EXERCISE_ID,
        );

        const finalForm =
          exerciseForm(page);

        await expect(
          finalForm.locator('#name'),
        ).toHaveValue(uiBefore.name);

        await expect(
          finalForm.locator('#description'),
        ).toHaveValue(
          expectedBaselineDescription,
        );
      },
    );
  },
);
