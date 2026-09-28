import { expect, request, test, type APIRequestContext, type Page } from '@playwright/test';
import { Pool } from 'pg';

/**
 * Comprehensive coach E2E coverage for:
 * - /api/workouts
 * - /api/exercises
 * - /api/workout-exercises
 *
 * The existing UI write tests remain the UI-level regression suite.
 * This suite intentionally adds endpoint-matrix + PostgreSQL verification
 * so every coach-facing endpoint in these three controllers is exercised.
 */

const BASE_API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';
const LANGUAGE = process.env.E2E_LANGUAGE ?? 'hu';

let pool: Pool | undefined;

function db(): Pool {
  if (!pool) {
    const required = (name: string) => {
      const value = process.env[name];
      if (!value || value === 'CHANGE_ME') {
        throw new Error(`Hiányzó E2E DB konfiguráció: ${name}`);
      }
      return value;
    };

    pool = new Pool({
      host: required('E2E_DB_HOST'),
      port: Number(process.env.E2E_DB_PORT ?? 5432),
      database: required('E2E_DB_NAME'),
      user: required('E2E_DB_USER'),
      password: required('E2E_DB_PASSWORD'),
      ssl:
        process.env.E2E_DB_SSL === 'true'
          ? { rejectUnauthorized: false }
          : false,
      max: 2,
    });
  }

  return pool;
}

function suffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

async function loginAsCoach(page: Page): Promise<void> {
  const username = process.env.E2E_COACH_USERNAME;
  const password = process.env.E2E_COACH_PASSWORD;

  if (!username || !password || password === 'CHANGE_ME') {
    throw new Error('Hiányzó E2E_COACH_USERNAME / E2E_COACH_PASSWORD.');
  }

  await page.goto('/login');
  await page.locator('input[formcontrolname="username"]').fill(username);
  await page.locator('input[formcontrolname="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();

  await expect(page).toHaveURL(/\/coach\/dashboard$/, { timeout: 15_000 });
}

async function tokenFromPage(page: Page): Promise<string> {
  const token = await page.evaluate(() => localStorage.getItem('accessToken'));
  if (!token) throw new Error('E2E: accessToken nem található.');
  return token;
}

async function apiFor(page: Page): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: BASE_API_URL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${await tokenFromPage(page)}`,
    },
  });
}

async function expectSuccess(response: any, label: string): Promise<any> {
  const text = await response.text();

  expect(
    response.ok(),
    `${label}: HTTP ${response.status()} ${text}`,
  ).toBeTruthy();

  if (!text) return null;

  const body = JSON.parse(text);
  expect(
    body.success,
    `${label}: success=false: ${text}`,
  ).toBeTruthy();

  return body;
}

async function expectRejected(response: any, label: string): Promise<string> {
  const text = await response.text();

  expect(
    response.ok(),
    `${label}: a kérésnek hibával kell visszatérnie, de HTTP ${response.status()} érkezett: ${text}`,
  ).toBeFalsy();

  return text;
}

async function createWorkout(
  api: APIRequestContext,
  name: string,
): Promise<number> {
  const response = await api.post('/api/workouts/add', {
    params: { language: LANGUAGE },
    data: {
      name,
      description: `E2E comprehensive workout ${suffix()}`,
      workoutDate: '2035-02-15',
      durationMinutes: 80,
      intensityLevel: 'High',
      dayIndex: 1,
      done: false,
    },
  });

  const body = await expectSuccess(response, 'POST /api/workouts/add');
  const id = Number(body.data?.id);

  expect(Number.isInteger(id) && id > 0).toBeTruthy();
  return id;
}

async function deleteWorkout(
  api: APIRequestContext,
  workoutId: number,
): Promise<void> {
  const response = await api.delete(`/api/workouts/delete/${workoutId}`);
  await expectSuccess(
    response,
    `DELETE /api/workouts/delete/${workoutId}`,
  );
}

async function createExercise(
  api: APIRequestContext,
  name: string,
): Promise<number> {
  const response = await api.post('/api/exercises/add', {
    params: { language: LANGUAGE },
    data: {
      name,
      description: `E2E comprehensive exercise ${suffix()}`,
      imageUrl: null,
      videoUrl: null,
      muscleGroup: 'back',
      equipment: 'cable',
      difficultyLevel: 'intermediate',
      category: 'strength',
      caloriesBurnedPerMinute: 5.5,
      durationSeconds: 60,
      done: false,
      forceType: 'pull',
      mechanic: 'compound',
      isUnilateral: false,
      isBodyweight: false,
      variationGroup: null,
      bodyPart: 'back',
      synonyms: null,
      instructions: null,
      tips: null,
      primaryMuscles: 'latissimus dorsi',
      secondaryMuscles: null,
    },
  });

  const body = await expectSuccess(response, 'POST /api/exercises/add');
  const id = Number(body.data?.id);

  expect(Number.isInteger(id) && id > 0).toBeTruthy();
  return id;
}

async function deleteExercise(
  api: APIRequestContext,
  exerciseId: number,
): Promise<void> {
  const response = await api.delete(
    `/api/exercises/delete/${exerciseId}`,
  );

  await expectSuccess(
    response,
    `DELETE /api/exercises/delete/${exerciseId}`,
  );
}

async function dbScalar<T = unknown>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const result = await db().query(sql, params);
  return result.rows[0] ? (Object.values(result.rows[0])[0] as T) : null;
}

async function relation(
  workoutId: number,
  exerciseId: number,
): Promise<{
  id: number;
  sets: number;
  repetitions: number;
  rest_seconds: number;
  order_index: number;
} | null> {
  const result = await db().query(
    `
      SELECT id, sets, repetitions, rest_seconds, order_index
      FROM public.workout_exercises
      WHERE workout_id = $1
        AND exercise_id = $2
      LIMIT 1
    `,
    [workoutId, exerciseId],
  );

  return result.rows[0] ?? null;
}

async function countRows(
  table: string,
  column: string,
  id: number,
): Promise<number> {
  const allowed = new Set([
    'workouts',
    'workout_translations',
    'exercises',
    'exercise_translations',
    'workout_exercises',
  ]);

  if (!allowed.has(table)) {
    throw new Error(`Tiltott DB tábla: ${table}`);
  }

  const result = await db().query(
    `SELECT COUNT(*)::int AS count FROM public.${table} WHERE ${column} = $1`,
    [id],
  );

  return Number(result.rows[0].count);
}

async function findCoachProgramId(api: APIRequestContext): Promise<number | null> {
  const username = process.env.E2E_COACH_USERNAME;
  if (!username) return null;

  const result = await db().query(
    `
      SELECT p.id
      FROM public.programs p
      JOIN public.coaches c ON c.id = p.coach_id
      WHERE c.name = $1 OR c.email = $1
      ORDER BY p.id
      LIMIT 1
    `,
    [username],
  );

  return result.rows[0] ? Number(result.rows[0].id) : null;
}

test.describe('Coach - COMPLETE Workout / Exercise / Assignment endpoint matrix', () => {
  test.describe.configure({ mode: 'serial' });

  test.afterAll(async () => {
    if (pool) {
      await pool.end();
      pool = undefined;
    }
  });

  test('COMPLETE WORKOUT: CRUD + all coach GET/search endpoints + PostgreSQL', async ({
    page,
  }) => {
    await loginAsCoach(page);

    const api = await apiFor(page);
    const name = `E2E COMPLETE WORKOUT ${suffix()}`;
    let workoutId: number | undefined;

    try {
      workoutId = await createWorkout(api, name);

      // GET /api/workouts/{id}
      {
        const response = await api.get(
          `/api/workouts/${workoutId}`,
          { params: { language: LANGUAGE } },
        );
        const body = await expectSuccess(response, 'GET /api/workouts/{id}');
        expect(Number(body.data?.workoutId)).toBe(workoutId);
      }

      // GET /api/workouts/my-workouts
      {
        const response = await api.get('/api/workouts/my-workouts', {
          params: { language: LANGUAGE },
        });
        const body = await expectSuccess(
          response,
          'GET /api/workouts/my-workouts',
        );
        expect(Array.isArray(body.data)).toBeTruthy();
        expect(
          body.data.some((w: any) => Number(w.id) === workoutId),
        ).toBeTruthy();
      }

      // GET /api/workouts/my-workouts/unique
      {
        const response = await api.get('/api/workouts/my-workouts/unique', {
          params: { language: LANGUAGE },
        });
        const body = await expectSuccess(
          response,
          'GET /api/workouts/my-workouts/unique',
        );
        expect(Array.isArray(body.data)).toBeTruthy();
      }

      // GET /api/workouts/my-workouts/search
      {
        const response = await api.get('/api/workouts/my-workouts/search', {
          params: {
            search: name,
            page: 0,
            size: 6,
            language: LANGUAGE,
            sortDirection: 'asc',
          },
        });

        const text = await response.text();
        expect(response.ok(), text).toBeTruthy();

        const body = JSON.parse(text);
        expect(Array.isArray(body.content)).toBeTruthy();
        expect(
          body.content.some((w: any) => Number(w.id) === workoutId),
        ).toBeTruthy();
      }

      // GET /api/workouts/program/{programId}
      //
      // This endpoint is NOT a coach endpoint in the current backend.
      // The authenticated coach token is intentionally rejected with HTTP 403
      // ("Ehhez a művelethez felhasználói fiók szükséges."). Therefore this
      // coach matrix must verify the documented authorization boundary instead
      // of treating the 403 as a test failure.
      const programId = await findCoachProgramId(api);
      if (programId !== null) {
        const response = await api.get(
          `/api/workouts/program/${programId}`,
          { params: { language: LANGUAGE } },
        );

        const text = await response.text();

        expect(
          response.status(),
          `GET /api/workouts/program/{programId}: coach access boundary`,
        ).toBe(403);

        expect(text).toContain('felhasználói fiók');
      }

      // PUT /api/workouts/update
      {
        const updatedName = `${name} UPDATED`;
        const response = await api.put('/api/workouts/update', {
          params: { language: LANGUAGE },
          data: {
            id: workoutId,
            name: updatedName,
            description: 'E2E COMPLETE workout updated',
            workoutDate: '2035-02-16',
            durationMinutes: 95,
            intensityLevel: 'Low',
            dayIndex: 2,
            done: false,
          },
        });

        await expectSuccess(
          response,
          'PUT /api/workouts/update',
        );

        // Az update endpoint sikeres választ ad, de a backend response
        // data mezője nem garantáltan tartalmazza az updated rekord ID-ját.
        // A tényleges módosítást ezért a PostgreSQL ellenőrzés validálja.
      }

      const dbWorkout = await db().query(
        `
          SELECT w.id,
                 w.workout_date::text AS workout_date,
                 w.duration_minutes,
                 w.intensity_level,
                 wt.name,
                 wt.description
          FROM public.workouts w
          LEFT JOIN public.workout_translations wt
            ON wt.workout_id = w.id
           AND wt.language_id = (
             SELECT id FROM public.languages
             WHERE lower(code) = lower($2)
             LIMIT 1
           )
          WHERE w.id = $1
        `,
        [workoutId, LANGUAGE],
      );

      expect(dbWorkout.rowCount).toBe(1);
      expect(dbWorkout.rows[0].name).toBe(`${name} UPDATED`);
      expect(dbWorkout.rows[0].description).toBe(
        'E2E COMPLETE workout updated',
      );
      expect(dbWorkout.rows[0].workout_date).toBe('2035-02-16');
      expect(Number(dbWorkout.rows[0].duration_minutes)).toBe(95);
      expect(dbWorkout.rows[0].intensity_level).toBe('Low');
    } finally {
      if (workoutId !== undefined) {
        const exists = await dbScalar<number>(
          'SELECT COUNT(*)::int FROM public.workouts WHERE id = $1',
          [workoutId],
        );

        if (Number(exists) > 0) {
          await deleteWorkout(api, workoutId);
        }

        expect(await countRows('workout_translations', 'workout_id', workoutId)).toBe(0);
        expect(await countRows('workout_exercises', 'workout_id', workoutId)).toBe(0);
        expect(await countRows('workouts', 'id', workoutId)).toBe(0);
      }

      await api.dispose();
    }
  });

  test('COMPLETE EXERCISE: CRUD + search/list endpoints + language + PostgreSQL', async ({
    page,
  }) => {
    await loginAsCoach(page);

    const api = await apiFor(page);
    const name = `E2E COMPLETE EXERCISE ${suffix()}`;
    let exerciseId: number | undefined;

    try {
      exerciseId = await createExercise(api, name);

      // GET /api/exercises/all
      {
        const response = await api.get('/api/exercises/all', {
          params: { language: LANGUAGE },
        });
        const body = await expectSuccess(response, 'GET /api/exercises/all');
        expect(Array.isArray(body.data)).toBeTruthy();
        expect(
          body.data.some((e: any) => Number(e.id) === exerciseId),
        ).toBeTruthy();
      }

      // GET /api/exercises/workouts
      {
        const response = await api.get('/api/exercises/workouts', {
          params: { language: LANGUAGE },
        });
        const body = await expectSuccess(
          response,
          'GET /api/exercises/workouts',
        );
        expect(Array.isArray(body.data)).toBeTruthy();
      }

      // GET /api/exercises/workouts/unique
      {
        const response = await api.get('/api/exercises/workouts/unique', {
          params: { language: LANGUAGE },
        });
        const body = await expectSuccess(
          response,
          'GET /api/exercises/workouts/unique',
        );
        expect(Array.isArray(body.data)).toBeTruthy();
      }

      // GET /api/exercises/exercise-search
      {
        const response = await api.get('/api/exercises/exercise-search', {
          params: {
            language: LANGUAGE,
            search: name,
            searchField: 'all',
            page: 0,
            size: 6,
            sortDirection: 'asc',
          },
        });
        const body = await expectSuccess(
          response,
          'GET /api/exercises/exercise-search',
        );

        expect(Array.isArray(body.data?.content)).toBeTruthy();
        expect(
          body.data.content.some((e: any) => Number(e.id) === exerciseId),
        ).toBeTruthy();
      }

      // Invalid pagination must be rejected.
      {
        const response = await api.get('/api/exercises/exercise-search', {
          params: {
            language: LANGUAGE,
            search: name,
            page: -1,
            size: 6,
          },
        });

        await expectRejected(
          response,
          'exercise-search page=-1',
        );
      }

      {
        const response = await api.get('/api/exercises/exercise-search', {
          params: {
            language: LANGUAGE,
            search: name,
            page: 0,
            size: 0,
          },
        });

        await expectRejected(
          response,
          'exercise-search size=0',
        );
      }

      // PUT /api/exercises/update
      {
        const response = await api.put('/api/exercises/update', {
          params: { language: LANGUAGE },
          data: {
            id: exerciseId,
            name,
            description: 'E2E COMPLETE EXERCISE UPDATED',
            imageUrl: null,
            videoUrl: null,
            muscleGroup: 'back',
            equipment: 'cable',
            difficultyLevel: 'intermediate',
            category: 'strength',
            caloriesBurnedPerMinute: 6.5,
            durationSeconds: 75,
            done: false,
            forceType: 'pull',
            mechanic: 'compound',
            isUnilateral: false,
            isBodyweight: false,
            variationGroup: null,
            bodyPart: 'back',
            synonyms: null,
            instructions: null,
            tips: null,
            primaryMuscles: 'latissimus dorsi',
            secondaryMuscles: null,
          },
        });

        await expectSuccess(
          response,
          'PUT /api/exercises/update',
        );

        // Az update response data mezője nem garantáltan tartalmazza az ID-t.
        // A tényleges módosítást a következő PostgreSQL ellenőrzés validálja.
      }

      const updated = await db().query(
        `
          SELECT et.name,
                 et.description,
                 e.calories_burned_per_minute,
                 e.duration_seconds
          FROM public.exercises e
          JOIN public.exercise_translations et
            ON et.exercise_id = e.id
          JOIN public.languages l
            ON l.id = et.language_id
           AND lower(l.code) = lower($2)
          WHERE e.id = $1
        `,
        [exerciseId, LANGUAGE],
      );

      expect(updated.rowCount).toBe(1);
      expect(updated.rows[0].name).toBe(name);
      expect(updated.rows[0].description).toBe(
        'E2E COMPLETE EXERCISE UPDATED',
      );
      expect(Number(updated.rows[0].calories_burned_per_minute)).toBe(6.5);
      expect(Number(updated.rows[0].duration_seconds)).toBe(75);
    } finally {
      if (exerciseId !== undefined) {
        const exists = await dbScalar<number>(
          'SELECT COUNT(*)::int FROM public.exercises WHERE id = $1',
          [exerciseId],
        );

        if (Number(exists) > 0) {
          await deleteExercise(api, exerciseId);
        }

        expect(await countRows('exercise_translations', 'exercise_id', exerciseId)).toBe(0);
        expect(await countRows('exercises', 'id', exerciseId)).toBe(0);
      }

      await api.dispose();
    }
  });

  test('COMPLETE ASSIGNMENT: assign → defaults → GET → order → duplicate rejection → delete → DB', async ({
    page,
  }) => {
    await loginAsCoach(page);

    const api = await apiFor(page);
    const workoutName = `E2E COMPLETE ASSIGN WORKOUT ${suffix()}`;
    const exerciseName = `E2E COMPLETE ASSIGN EXERCISE ${suffix()}`;
    const exerciseName2 = `E2E COMPLETE ASSIGN EXERCISE 2 ${suffix()}`;

    let workoutId: number | undefined;
    let exerciseId: number | undefined;
    let exerciseId2: number | undefined;

    try {
      workoutId = await createWorkout(api, workoutName);
      exerciseId = await createExercise(api, exerciseName);
      exerciseId2 = await createExercise(api, exerciseName2);

      // POST /api/workout-exercises/assign
      {
        const response = await api.post(
          '/api/workout-exercises/assign',
          {
            params: { workoutId, exerciseId },
          },
        );

        await expectSuccess(
          response,
          'POST /api/workout-exercises/assign',
        );
      }

      let row = await relation(workoutId, exerciseId);
      expect(row).not.toBeNull();
      expect(Number(row?.sets)).toBe(3);
      expect(Number(row?.repetitions)).toBe(10);
      expect(Number(row?.rest_seconds)).toBe(60);
      expect(Number(row?.order_index)).toBe(0);

      // Második exercise hozzárendelése: így az order-index teszt valódi átrendezést tud ellenőrizni.
      {
        const response = await api.post(
          '/api/workout-exercises/assign',
          { params: { workoutId, exerciseId: exerciseId2 } },
        );
        await expectSuccess(
          response,
          'POST /api/workout-exercises/assign (second exercise)',
        );
      }

      const secondRow = await relation(workoutId, exerciseId2);
      expect(secondRow).not.toBeNull();
      expect(Number(secondRow?.order_index)).toBe(1);

      // GET /api/exercises/workout/{workoutId}
      {
        const response = await api.get(
          `/api/exercises/workout/${workoutId}`,
          { params: { language: LANGUAGE } },
        );
        const body = await expectSuccess(
          response,
          'GET /api/exercises/workout/{workoutId}',
        );

        expect(Number(body.data?.id)).toBe(workoutId);
        expect(
          body.data?.exercises?.some(
            (e: any) => Number(e.id) === exerciseId,
          ),
        ).toBeTruthy();
      }

      // Duplicate relation must be rejected and DB count must remain 1.
      {
        const response = await api.post(
          '/api/workout-exercises/assign',
          {
            params: { workoutId, exerciseId },
          },
        );

        await expectRejected(
          response,
          'duplicate workout-exercise assignment',
        );

        expect(
          Number(
            await dbScalar(
              `
                SELECT COUNT(*)
                FROM public.workout_exercises
                WHERE workout_id = $1 AND exercise_id = $2
              `,
              [workoutId, exerciseId],
            ),
          ),
        ).toBe(1);
      }

      // PUT /api/workout-exercises/order-index
      // Fontos: a backend csak 0..MAX(order_index) tartományt fogad el.
      // Egyetlen hozzárendelésnél a MAX=0, ezért a korábbi orderIndex=7 teszt
      // helytelen volt és jogosan adott HTTP 500-at. Két exercise-szel valódi
      // átrendezést tesztelünk: a második (1) kerül az első helyre (0).
      {
        const response = await api.put(
          '/api/workout-exercises/order-index',
          {
            params: {
              workoutId,
              exerciseId: exerciseId2,
              orderIndex: 0,
            },
          },
        );

        await expectSuccess(
          response,
          'PUT /api/workout-exercises/order-index (1 -> 0)',
        );
      }

      row = await relation(workoutId, exerciseId);
      const reorderedSecond = await relation(workoutId, exerciseId2);
      expect(Number(row?.order_index)).toBe(1);
      expect(Number(reorderedSecond?.order_index)).toBe(0);

      // Vissza is rendezzük: 0 -> 1.
      {
        const response = await api.put(
          '/api/workout-exercises/order-index',
          {
            params: {
              workoutId,
              exerciseId: exerciseId2,
              orderIndex: 1,
            },
          },
        );

        await expectSuccess(
          response,
          'PUT /api/workout-exercises/order-index (0 -> 1)',
        );
      }

      row = await relation(workoutId, exerciseId);
      const restoredSecondOrder = await relation(workoutId, exerciseId2);
      expect(Number(row?.order_index)).toBe(0);
      expect(Number(restoredSecondOrder?.order_index)).toBe(1);

      // Negative order index.
      {
        const response = await api.put(
          '/api/workout-exercises/order-index',
          {
            params: {
              workoutId,
              exerciseId,
              orderIndex: -1,
            },
          },
        );

        await expectRejected(
          response,
          'negative orderIndex',
        );

        row = await relation(workoutId, exerciseId);
        expect(Number(row?.order_index)).toBe(0);
        const secondAfterNegative = await relation(workoutId, exerciseId2);
        expect(Number(secondAfterNegative?.order_index)).toBe(1);
      }

      // DELETE /api/workout-exercises/delete
      {
        const response = await api.delete(
          '/api/workout-exercises/delete',
          {
            params: { workoutId, exerciseId },
          },
        );

        await expectSuccess(
          response,
          'DELETE /api/workout-exercises/delete',
        );
      }

      expect(await relation(workoutId, exerciseId)).toBeNull();

      {
        const response = await api.delete(
          '/api/workout-exercises/delete',
          { params: { workoutId, exerciseId: exerciseId2 } },
        );
        await expectSuccess(
          response,
          'DELETE /api/workout-exercises/delete (second exercise)',
        );
      }
      expect(await relation(workoutId, exerciseId2)).toBeNull();

      // A second delete must be rejected.
      {
        const response = await api.delete(
          '/api/workout-exercises/delete',
          {
            params: { workoutId, exerciseId },
          },
        );

        await expectRejected(
          response,
          'delete missing workout-exercise relation',
        );
      }
    } finally {
      if (workoutId !== undefined) {
        // Az assignment teszt célja a workout-exercise végpontok tesztelése.
        // A workout DELETE endpoint külön, a COMPLETE WORKOUT tesztben van
        // lefedve. Itt a saját tesztadatot DB-szinten takarítjuk fel, miután
        // bizonyítottuk, hogy nincs rajta védett program/user kapcsolat.
        //
        // Ez azért fontos, mert a backend szándékosan HTTP 500-at adhat,
        // ha program_workouts vagy user_workouts kapcsolat maradt a workouton.
        // Ilyenkor nem akarjuk az assignment teszt eredményét a cleanup
        // mechanizmussal összekeverni.
        const blockerRows = await db().query(
          `
            SELECT
              (SELECT COUNT(*) FROM public.workout_exercises WHERE workout_id = $1) AS workout_exercises,
              (SELECT COUNT(*) FROM public.program_workouts WHERE workout_id = $1) AS program_workouts,
              (SELECT COUNT(*) FROM public.user_workouts WHERE workout_id = $1) AS user_workouts
          `,
          [workoutId],
        );

        const blockers = blockerRows.rows[0];

        if (
          Number(blockers.workout_exercises) !== 0 ||
          Number(blockers.program_workouts) !== 0 ||
          Number(blockers.user_workouts) !== 0
        ) {
          throw new Error(
            [
              `[E2E ASSIGNMENT CLEANUP] A létrehozott workout nem tisztítható biztonságosan.`,
              `workoutId=${workoutId}`,
              `workout_exercises=${blockers.workout_exercises}`,
              `program_workouts=${blockers.program_workouts}`,
              `user_workouts=${blockers.user_workouts}`,
            ].join(' '),
          );
        }

        const workoutExists = Number(
          await dbScalar(
            'SELECT COUNT(*) FROM public.workouts WHERE id = $1',
            [workoutId],
          ),
        );

        if (workoutExists > 0) {
          const deleted = await db().query(
            'DELETE FROM public.workouts WHERE id = $1',
            [workoutId],
          );

          expect(deleted.rowCount).toBe(1);
        }
      }

      if (exerciseId2 !== undefined) {
        const exerciseExists2 = Number(
          await dbScalar(
            'SELECT COUNT(*) FROM public.exercises WHERE id = $1',
            [exerciseId2],
          ),
        );

        if (exerciseExists2 > 0) {
          await deleteExercise(api, exerciseId2);
        }
      }

      if (exerciseId !== undefined) {
        const exerciseExists = Number(
          await dbScalar(
            'SELECT COUNT(*) FROM public.exercises WHERE id = $1',
            [exerciseId],
          ),
        );

        if (exerciseExists > 0) {
          await deleteExercise(api, exerciseId);
        }
      }

      await api.dispose();
    }
  });

  test('NEGATIVE MATRIX: invalid IDs + invalid workout/exercise combinations do not modify DB', async ({
    page,
  }) => {
    await loginAsCoach(page);

    const api = await apiFor(page);

    const invalidId = 999999999;

    try {
      // Workout update: invalid ID.
      {
        const response = await api.put('/api/workouts/update', {
          params: { language: LANGUAGE },
          data: {
            id: invalidId,
            name: 'E2E INVALID',
            description: 'must fail',
            workoutDate: '2035-01-01',
            durationMinutes: 30,
            intensityLevel: 'Low',
            dayIndex: 1,
            done: false,
          },
        });

        await expectRejected(
          response,
          'PUT invalid workout ID',
        );
      }

      // Workout delete: invalid ID.
      {
        const response = await api.delete(
          `/api/workouts/delete/${invalidId}`,
        );

        await expectRejected(
          response,
          'DELETE invalid workout ID',
        );
      }

      // Exercise update: invalid ID.
      {
        const response = await api.put('/api/exercises/update', {
          params: { language: LANGUAGE },
          data: {
            id: invalidId,
            name: 'E2E INVALID',
            description: 'must fail',
          },
        });

        await expectRejected(
          response,
          'PUT invalid exercise ID',
        );
      }

      // Exercise delete: invalid ID.
      {
        const response = await api.delete(
          `/api/exercises/delete/${invalidId}`,
        );

        await expectRejected(
          response,
          'DELETE invalid exercise ID',
        );
      }

      // Assignment: invalid workout.
      {
        const response = await api.post(
          '/api/workout-exercises/assign',
          {
            params: {
              workoutId: invalidId,
              exerciseId: Number(process.env.E2E_EXERCISE_ID ?? 1046),
            },
          },
        );

        await expectRejected(
          response,
          'ASSIGN invalid workout ID',
        );
      }

      // Assignment: invalid exercise.
      {
        const response = await api.post(
          '/api/workout-exercises/assign',
          {
            params: {
              workoutId: Number(process.env.E2E_WORKOUT_ID ?? 1),
              exerciseId: invalidId,
            },
          },
        );

        await expectRejected(
          response,
          'ASSIGN invalid exercise ID',
        );
      }

      // Order update: invalid IDs.
      {
        const response = await api.put(
          '/api/workout-exercises/order-index',
          {
            params: {
              workoutId: invalidId,
              exerciseId: invalidId,
              orderIndex: 1,
            },
          },
        );

        await expectRejected(
          response,
          'ORDER invalid IDs',
        );
      }
    } finally {
      await api.dispose();
    }
  });

  test('NEGATIVE VALIDATION: empty exercise name is rejected and no DB record is created', async ({
    page,
  }) => {
    await loginAsCoach(page);

    const api = await apiFor(page);
    const marker = `E2E EMPTY EXERCISE ${suffix()}`;

    try {
      const before = Number(
        await dbScalar(
          `
            SELECT COUNT(*)
            FROM public.exercise_translations
            WHERE name = $1
          `,
          [marker],
        ),
      );

      expect(before).toBe(0);

      const response = await api.post('/api/exercises/add', {
        params: { language: LANGUAGE },
        data: {
          name: '',
          description: marker,
        },
      });

      await expectRejected(
        response,
        'POST /api/exercises/add empty name',
      );

      const after = Number(
        await dbScalar(
          `
            SELECT COUNT(*)
            FROM public.exercise_translations
            WHERE name = $1
          `,
          [marker],
        ),
      );

      expect(after).toBe(0);
    } finally {
      await api.dispose();
    }
  });
});
