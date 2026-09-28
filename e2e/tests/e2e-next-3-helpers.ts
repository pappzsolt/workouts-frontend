import { expect, request, type APIRequestContext, type Page } from '@playwright/test';
import { Pool } from 'pg';

export const BASE_API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';
export const LANGUAGE = process.env.E2E_LANGUAGE ?? 'hu';

let pool: Pool | undefined;

export function db(): Pool {
  if (!pool) {
    const required = (name: string) => {
      const v = process.env[name];
      if (!v || v === 'CHANGE_ME') throw new Error(`Hiányzó E2E DB konfiguráció: ${name}`);
      return v;
    };
    pool = new Pool({
      host: required('E2E_DB_HOST'),
      port: Number(process.env.E2E_DB_PORT ?? 5432),
      database: required('E2E_DB_NAME'),
      user: required('E2E_DB_USER'),
      password: required('E2E_DB_PASSWORD'),
      ssl: process.env.E2E_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 2,
    });
  }
  return pool;
}

export const suffix = () => `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;

export async function dbOne<T = any>(sql: string, params: unknown[] = []): Promise<T | null> {
  const r = await db().query<T>(sql, params);
  return r.rows[0] ?? null;
}

export async function dbCount(sql: string, params: unknown[] = []): Promise<number> {
  const r = await dbOne<{ count: string }>(sql, params);
  return Number(r?.count ?? 0);
}

export async function login(page: Page, role: 'coach' | 'user') {
  const username = process.env[role === 'coach' ? 'E2E_COACH_USERNAME' : 'E2E_USER_USERNAME'];
  const password = process.env[role === 'coach' ? 'E2E_COACH_PASSWORD' : 'E2E_USER_PASSWORD'];
  if (!username || !password || password === 'CHANGE_ME') throw new Error(`Hiányzó E2E ${role} credentials.`);
  await page.goto('/login');
  await page.locator('input[formcontrolname="username"]').fill(username);
  await page.locator('input[formcontrolname="password"]').fill(password);
  await page.locator('form button[type="submit"]').click();
  await expect(page).toHaveURL(role === 'coach' ? /\/coach\/dashboard$/ : /\/user\/dashboard$/, { timeout: 15000 });
}

export async function apiFor(page: Page): Promise<APIRequestContext> {
  const token = await page.evaluate(() => localStorage.getItem('accessToken'));
  if (!token) throw new Error('E2E: accessToken nem található.');
  return request.newContext({
    baseURL: BASE_API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}

export async function json(response: any) {
  const text = await response.text();
  let body: any = null;
  if (text) body = JSON.parse(text);
  return { text, body };
}

export async function success(response: any, label: string): Promise<any> {
  const { text, body } = await json(response);
  expect(response.ok(), `${label}: HTTP ${response.status()} ${text}`).toBeTruthy();
  if (body?.success !== undefined) {
    expect(body.success, `${label}: success=false: ${text}`).toBeTruthy();
  }
  return body;
}

export async function rejected(response: any, label: string) {
  const { text, body } = await json(response);
  expect(response.ok(), `${label}: váratlan HTTP ${response.status()} ${text}`).toBeFalsy();
  return body;
}

export async function currentUserId(): Promise<number> {
  const username = process.env.E2E_USER_USERNAME;
  if (!username) throw new Error('Hiányzó E2E_USER_USERNAME.');
  const row = await dbOne<{ id: number }>(
    `SELECT id FROM public.users WHERE username=$1 LIMIT 1`,
    [username],
  );
  if (!row) throw new Error(`A bejelentkezett E2E user nem található: ${username}`);
  return Number(row.id);
}

export async function anotherCoachClientUserId(
  excludeUserId: number,
): Promise<number> {
  const row = await dbOne<{ id: number }>(
    `SELECT u.id
       FROM public.users u
      WHERE u.id <> $1
        AND u.coach_id = (
          SELECT c.id
            FROM public.users coach_user
            JOIN public.coaches c ON c.id = coach_user.coach_id
           WHERE coach_user.username = $2
           LIMIT 1
        )
      ORDER BY u.id
      LIMIT 1`,
    [excludeUserId, process.env.E2E_COACH_USERNAME],
  );
  if (!row) {
    throw new Error(
      'Ownership E2E teszthez szükséges másik, ugyanahhoz a coachhoz tartozó user.',
    );
  }
  return Number(row.id);
}


export async function coachUserId(): Promise<number> {
  const username = process.env.E2E_COACH_USERNAME;
  const row = await dbOne<{ id: number }>(
    `SELECT u.id
       FROM public.users u
       JOIN public.coaches c ON c.id = u.coach_id
      WHERE c.name = $1
      ORDER BY u.id
      LIMIT 1`,
    [username],
  );
  if (!row) throw new Error('Nem található a bejelentkezett coachhoz tartozó teszt user a DB-ben.');
  return Number(row.id);
}

export async function createProgram(api: APIRequestContext, name = `E2E Program ${suffix()}`) {
  const body = await success(await api.post('/api/user-programs/create', {
    data: {
      userId: null,
      programName: name,
      programDescription: `E2E ${suffix()}`,
      durationDays: 30,
      startDate: '2035-03-01',
      difficultyLevel: 'intermediate',
      languageCode: LANGUAGE,
      workouts: null,
    },
  }), 'POST /api/user-programs/create');
  const id = Number(body.data);
  expect(Number.isInteger(id) && id > 0).toBeTruthy();
  return id;
}

export async function createWorkout(api: APIRequestContext, name = `E2E Workout ${suffix()}`) {
  const body = await success(await api.post('/api/workouts/add', {
    params: { language: LANGUAGE },
    data: {
      name,
      description: `E2E ${suffix()}`,
      workoutDate: '2035-03-10',
      durationMinutes: 60,
      intensityLevel: 'High',
      dayIndex: 1,
      done: false,
    },
  }), 'POST /api/workouts/add');
  const id = Number(body.data?.id);
  expect(Number.isInteger(id) && id > 0).toBeTruthy();
  return id;
}

export async function createExercise(api: APIRequestContext, name = `E2E Exercise ${suffix()}`) {
  const body = await success(await api.post('/api/exercises/add', {
    params: { language: LANGUAGE },
    data: {
      name,
      description: `E2E ${suffix()}`,
      imageUrl: null, videoUrl: null, muscleGroup: 'back', equipment: 'cable',
      difficultyLevel: 'intermediate', category: 'strength',
      caloriesBurnedPerMinute: 5.5, durationSeconds: 60, done: false,
      forceType: 'pull', mechanic: 'compound', isUnilateral: false,
      isBodyweight: false, variationGroup: null, bodyPart: 'back',
      synonyms: null, instructions: null, tips: null,
      primaryMuscles: 'latissimus dorsi', secondaryMuscles: null,
    },
  }), 'POST /api/exercises/add');
  const id = Number(body.data?.id);
  expect(Number.isInteger(id) && id > 0).toBeTruthy();
  return id;
}

export async function assignExercise(api: APIRequestContext, workoutId: number, exerciseId: number) {
  await success(await api.post('/api/workout-exercises/assign', {
    params: { workoutId, exerciseId },
  }), 'POST /api/workout-exercises/assign');
}

export async function deleteProgram(api: APIRequestContext, id: number) {
  await success(await api.delete(`/api/programs/coach/${id}`), `DELETE /api/programs/coach/${id}`);
}

export async function deleteWorkout(api: APIRequestContext, id: number) {
  await success(await api.delete(`/api/workouts/delete/${id}`), `DELETE /api/workouts/delete/${id}`);
}

export async function deleteExercise(api: APIRequestContext, id: number) {
  await success(await api.delete(`/api/exercises/delete/${id}`), `DELETE /api/exercises/delete/${id}`);
}
