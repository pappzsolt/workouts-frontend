import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { authenticateAndOpen } from '../../helpers/auth-session';
import { expect, request, test, type APIRequestContext, type Page } from '@playwright/test';
import { Pool } from 'pg';

const BASE_API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';
const LANGUAGE = process.env.E2E_LANGUAGE ?? 'hu';
let pool: Pool | undefined;

function db(): Pool {
  if (!pool) {
    const required = (name: string) => {
      const value = process.env[name];
      if (!value || value === 'CHANGE_ME') throw new Error(`Hiányzó E2E DB konfiguráció: ${name}`);
      return value;
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

function suffix(): string {
  return `${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

async function loginAsCoach(page: Page): Promise<void> {
  await authenticateAndOpen(page, 'coach');
}

async function apiFor(page: Page): Promise<APIRequestContext> {
  const token = await page.evaluate(() => localStorage.getItem('accessToken'));
  if (!token) throw new Error('E2E: accessToken nem található.');
  return request.newContext({
    baseURL: BASE_API_URL,
    extraHTTPHeaders: { Authorization: `Bearer ${token}` },
  });
}

async function success(response: any, label: string): Promise<any> {
  const text = await response.text();
  expect(response.ok(), `${label}: HTTP ${response.status()} ${text}`).toBeTruthy();
  if (!text) return null;
  const body = JSON.parse(text);
  expect(body.success, `${label}: success=false: ${text}`).toBeTruthy();
  return body;
}

async function rejected(response: any, label: string): Promise<string> {
  const text = await response.text();
  expect(response.ok(), `${label}: váratlan siker HTTP ${response.status()} ${text}`).toBeFalsy();
  return text;
}

async function dbOne<T = any>(sql: string, params: unknown[] = []): Promise<T | null> {
  const result = await db().query<T>(sql, params);
  return result.rows[0] ?? null;
}

async function dbCount(sql: string, params: unknown[] = []): Promise<number> {
  const row = await dbOne<{ count: string }>(sql, params);
  return Number(row?.count ?? 0);
}

async function coachUserId(): Promise<number> {
  const username = process.env.E2E_COACH_USERNAME;
  // A coach a backendben a coaches.name mező alapján jelentkezik be
  // (AppUserDetailsService.fetchCoachByUsername), nem a coaches.email alapján.
  // Az E2E_COACH_USERNAME ezért a coaches.name értékét tartalmazza.
  const row = await dbOne<{ id: number }>(
    `SELECT u.id
       FROM public.users u
       JOIN public.coaches c ON c.id = u.coach_id
      WHERE c.name = $1
      ORDER BY u.id
      LIMIT 1`,
    [username],
  );
  if (!row) {
    throw new Error('Nem található a bejelentkezett coachhoz tartozó teszt user a DB-ben.');
  }
  return Number(row.id);
}

async function createProgram(api: APIRequestContext, name: string): Promise<number> {
  const response = await api.post(API_ENDPOINTS.userPrograms.base, {
    data: {
      userId: null,
      programName: name,
      programDescription: `E2E program description ${suffix()}`,
      durationDays: 30,
      startDate: '2035-03-01',
      difficultyLevel: 'intermediate',
      languageCode: LANGUAGE,
      workouts: null,
    },
  });
  const body = await success(response, 'POST /api/user-programs');
  const id = Number(body.data);
  expect(Number.isInteger(id) && id > 0).toBeTruthy();
  return id;
}

async function deleteProgram(api: APIRequestContext, id: number): Promise<void> {
  await success(await api.delete(`${API_ENDPOINTS.programs.coachDelete(id)}`), `DELETE /api/programs/coach/${id}`);
}

async function assertProgramDb(id: number, expected: { name: string; description: string; duration: number; startDate: string; difficulty: string }): Promise<void> {
  const row = await dbOne<any>(
    `SELECT p.id, p.duration_days, p.start_date::text AS start_date, p.difficulty_level,
            pt.name, pt.description, l.code AS language_code
       FROM public.programs p
       LEFT JOIN public.program_translations pt
         ON pt.program_id = p.id
        AND pt.language_id = (SELECT id FROM public.languages WHERE lower(code)=lower($2) LIMIT 1)
       LEFT JOIN public.languages l ON l.id = pt.language_id
      WHERE p.id = $1`,
    [id, LANGUAGE],
  );
  expect(row).toBeTruthy();
  expect(row.name).toBe(expected.name);
  expect(row.description).toBe(expected.description);
  expect(Number(row.duration_days)).toBe(expected.duration);
  expect(String(row.start_date).slice(0, 10)).toBe(expected.startDate);
  expect(row.difficulty_level).toBe(expected.difficulty);
  expect(String(row.language_code).toLowerCase()).toBe(LANGUAGE.toLowerCase());
}

async function assertProgramDeleted(id: number): Promise<void> {
  const counts = await dbOne<any>(
    `SELECT
       (SELECT count(*) FROM public.programs WHERE id=$1) programs,
       (SELECT count(*) FROM public.program_translations WHERE program_id=$1) translations,
       (SELECT count(*) FROM public.program_workouts WHERE program_id=$1) program_workouts,
       (SELECT count(*) FROM public.user_programs WHERE program_id=$1) user_programs`,
    [id],
  );
  expect(Number(counts?.programs ?? -1)).toBe(0);
  expect(Number(counts?.translations ?? -1)).toBe(0);
  expect(Number(counts?.program_workouts ?? -1)).toBe(0);
  expect(Number(counts?.user_programs ?? -1)).toBe(0);
}

test.describe('Coach - COMPLETE Program endpoint matrix', () => {
  test.describe.configure({ mode: 'serial' });

  test('PROGRAM CRUD + coach GET/search + translation + PostgreSQL', async ({ page }) => {
    await loginAsCoach(page);
    const api = await apiFor(page);
    const name = `E2E Program ${suffix()}`;
    const description = `E2E Program description ${suffix()}`;
    const updatedName = `E2E Program UPDATED ${suffix()}`;
    const updatedDescription = `E2E Program UPDATED description ${suffix()}`;
    let programId = 0;

    try {
      const createResponse = await api.post(API_ENDPOINTS.userPrograms.base, {
        data: {
          userId: null,
          programName: name,
          programDescription: description,
          durationDays: 30,
          startDate: '2035-03-01',
          difficultyLevel: 'intermediate',
          languageCode: LANGUAGE,
          workouts: null,
        },
      });
      const createBody = await success(createResponse, 'POST /api/user-programs');
      programId = Number(createBody.data);
      expect(programId).toBeGreaterThan(0);

      await assertProgramDb(programId, {
        name,
        description,
        duration: 30,
        startDate: '2035-03-01',
        difficulty: 'intermediate',
      });

      const byId = await success(await api.get(`${API_ENDPOINTS.programs.byId(programId)}?language=${LANGUAGE}`), 'GET /api/programs/{id}');
      expect(Number(byId.data?.programId)).toBe(programId);
      expect(byId.data?.programName).toBe(name);
      expect(byId.data?.programDescription).toBe(description);

      const coachPrograms = await success(await api.get(`/api/programs/coach?language=${LANGUAGE}`), 'GET /api/programs/coach');
      expect(Array.isArray(coachPrograms.data)).toBeTruthy();
      expect(coachPrograms.data.some((p: any) => Number(p.programId) === programId)).toBeTruthy();

      // /api/programs/coach/search közvetlen Spring PageResponse-t ad vissza,
      // nem a projekt általános { success, data } wrapperét.
      const searchResponse = await api.get(API_ENDPOINTS.programs.coachSearch, {
        params: { search: name, page: 0, size: 10, language: LANGUAGE, sortDirection: 'asc' },
      });
      const searchText = await searchResponse.text();

      expect(
        searchResponse.ok(),
        `GET /api/programs/coach/search: HTTP ${searchResponse.status()} ${searchText}`,
      ).toBeTruthy();

      const search = JSON.parse(searchText);

      expect(Array.isArray(search.content)).toBeTruthy();
      expect(Number(search.page)).toBe(0);
      expect(Number(search.size)).toBe(10);
      expect(Number(search.totalElements)).toBeGreaterThanOrEqual(1);
      expect(Number(search.totalPages)).toBeGreaterThanOrEqual(1);
      expect(
        search.content.some((p: any) => Number(p.programId) === programId),
      ).toBeTruthy();

      const assignedBefore = await success(await api.get(`${API_ENDPOINTS.programs.assignedUsers(programId)}`), 'GET /api/programs/{id}/assigned-users');
      expect(Array.isArray(assignedBefore.data)).toBeTruthy();
      expect(assignedBefore.data).not.toContain(await coachUserId());

      const updateResponse = await api.put(`${API_ENDPOINTS.userPrograms.byId(programId)}`, {
        data: {
          userId: null,
          programName: updatedName,
          programDescription: updatedDescription,
          durationDays: 45,
          startDate: '2035-04-10',
          difficultyLevel: 'advanced',
          languageCode: LANGUAGE,
          workouts: null,
        },
      });
      const updateBody = await success(updateResponse, 'PUT /api/user-programs/{id}');
      expect(Number(updateBody.data)).toBe(programId);

      await assertProgramDb(programId, {
        name: updatedName,
        description: updatedDescription,
        duration: 45,
        startDate: '2035-04-10',
        difficulty: 'advanced',
      });

      const updated = await success(await api.get(`${API_ENDPOINTS.programs.byId(programId)}?language=${LANGUAGE}`), 'GET /api/programs/{id} after update');
      expect(updated.data?.programName).toBe(updatedName);
      expect(updated.data?.programDescription).toBe(updatedDescription);
      expect(Number(updated.data?.durationDays)).toBe(45);
      expect(updated.data?.difficultyLevel).toBe('advanced');
    } finally {
      if (programId > 0) {
        await deleteProgram(api, programId);
        await assertProgramDeleted(programId);
      }
      await api.dispose();
    }
  });

  test('PROGRAM ASSIGNMENT: saját user → assigned-users → duplicate idempotency → DB', async ({ page }) => {
    await loginAsCoach(page);
    const api = await apiFor(page);
    const userId = await coachUserId();
    const programId = await createProgram(api, `E2E Program ASSIGN ${suffix()}`);

    try {
      const assign1 = await api.post(API_ENDPOINTS.programs.assign, { data: { userId, programId } });
      await success(assign1, 'POST /api/programs/assign');

      const assigned = await success(await api.get(`${API_ENDPOINTS.programs.assignedUsers(programId)}`), 'GET assigned-users');
      expect(assigned.data).toContain(userId);

      expect(await dbCount('SELECT count(*)::text AS count FROM public.user_programs WHERE user_id=$1 AND program_id=$2', [userId, programId])).toBe(1);

      const assign2 = await api.post(API_ENDPOINTS.programs.assign, { data: { userId, programId } });
      await success(assign2, 'POST /api/programs/assign duplicate');

      expect(await dbCount('SELECT count(*)::text AS count FROM public.user_programs WHERE user_id=$1 AND program_id=$2', [userId, programId])).toBe(1);
    } finally {
      await deleteProgram(api, programId);
      await assertProgramDeleted(programId);
      await api.dispose();
    }
  });

  test('PROGRAM NEGATIVE: nem létező ID-k és hibás update nem módosítják a DB-t', async ({ page }) => {
    await loginAsCoach(page);
    const api = await apiFor(page);
    const missingId = 2147483000;

    await rejected(await api.get(`${API_ENDPOINTS.programs.byId(missingId)}?language=${LANGUAGE}`), 'GET missing program');
    await rejected(await api.put(`${API_ENDPOINTS.userPrograms.byId(missingId)}`, {
      data: {
        userId: null,
        programName: `E2E INVALID ${suffix()}`,
        programDescription: 'invalid',
        durationDays: 10,
        startDate: '2035-01-01',
        difficultyLevel: 'easy',
        languageCode: LANGUAGE,
        workouts: null,
      },
    }), 'PUT missing program');

    await rejected(await api.post(API_ENDPOINTS.programs.assign, { data: { userId: 2147483000, programId: missingId } }), 'POST assign invalid IDs');
    await api.dispose();
  });
});
