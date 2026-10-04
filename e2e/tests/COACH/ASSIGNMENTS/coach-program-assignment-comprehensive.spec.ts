import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { authenticateAndOpen } from '../../helpers/auth-session';
import { expect, request, test, type APIRequestContext, type Page } from '@playwright/test';
import { Pool } from 'pg';

const BASE_API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';
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
      ssl: process.env.E2E_DB_SSL === 'true'
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
  await authenticateAndOpen(page, 'coach');
}

async function apiFor(page: Page): Promise<APIRequestContext> {
  const token = await page.evaluate(
    () => localStorage.getItem('accessToken'),
  );

  if (!token) {
    throw new Error('E2E: accessToken nem található.');
  }

  return request.newContext({
    baseURL: BASE_API_URL,
    extraHTTPHeaders: {
      Authorization: `Bearer ${token}`,
    },
  });
}

async function readJson(response: any): Promise<any> {
  const text = await response.text();

  let body: any = null;

  if (text) {
    try {
      body = JSON.parse(text);
    } catch {
      throw new Error(
        `Nem JSON response: HTTP ${response.status()} ${text}`,
      );
    }
  }

  return {
    text,
    body,
  };
}

async function success(response: any, label: string): Promise<any> {
  const { text, body } = await readJson(response);

  expect(
    response.ok(),
    `${label}: HTTP ${response.status()} ${text}`,
  ).toBeTruthy();

  expect(
    body?.success,
    `${label}: success=false: ${text}`,
  ).toBeTruthy();

  return body;
}

async function rejected(
  response: any,
  label: string,
): Promise<any> {
  const { text, body } = await readJson(response);

  expect(
    response.ok(),
    `${label}: váratlan siker HTTP ${response.status()} ${text}`,
  ).toBeFalsy();

  return body;
}

async function dbOne<T = any>(
  sql: string,
  params: unknown[] = [],
): Promise<T | null> {
  const result = await db().query<T>(sql, params);
  return result.rows[0] ?? null;
}

async function dbCount(
  sql: string,
  params: unknown[] = [],
): Promise<number> {
  const row = await dbOne<{ count: string }>(sql, params);
  return Number(row?.count ?? 0);
}

/**
 * A backend autentikációja a coaches.name mezőt használja username-ként.
 * A dump alapján:
 *
 * coaches:
 *   id=201, name='coach'
 *
 * users:
 *   id=316, username='user', coach_id=201
 *   id=319, username='admin', coach_id=NULL
 *
 * Ezért a coachhoz tartozó teszt usert a coach name alapján keressük.
 */
async function coachUserId(): Promise<number> {
  const username = process.env.E2E_COACH_USERNAME;

  const row = await dbOne<{ id: number }>(
    `SELECT u.id
       FROM public.users u
       JOIN public.coaches c
         ON c.id = u.coach_id
      WHERE c.name = $1
      ORDER BY u.id
      LIMIT 1`,
    [username],
  );

  if (!row) {
    throw new Error(
      'Nem található a bejelentkezett coachhoz tartozó teszt user a DB-ben.',
    );
  }

  return Number(row.id);
}

async function adminUserId(): Promise<number> {
  const row = await dbOne<{ id: number }>(
    `SELECT u.id
       FROM public.users u
       JOIN public.user_roles ur
         ON ur.user_id = u.id
       JOIN public.roles r
         ON r.id = ur.role_id
      WHERE r.name = 'ADMIN'
      ORDER BY u.id
      LIMIT 1`,
  );

  if (!row) {
    throw new Error('Nem található ADMIN user a DB-ben.');
  }

  return Number(row.id);
}

async function createProgram(
  api: APIRequestContext,
  name: string,
): Promise<number> {
  const response = await api.post(API_ENDPOINTS.userPrograms.base, {
    data: {
      userId: null,
      programName: name,
      programDescription: `E2E assignment program ${suffix()}`,
      durationDays: 30,
      startDate: '2035-03-01',
      difficultyLevel: 'intermediate',
      languageCode: 'hu',
      workouts: null,
    },
  });

  const body = await success(
    response,
    'POST /api/user-programs',
  );

  const programId = Number(body.data);

  expect(
    Number.isInteger(programId) && programId > 0,
    `Érvénytelen programId: ${body.data}`,
  ).toBeTruthy();

  return programId;
}

async function deleteProgram(
  api: APIRequestContext,
  programId: number,
): Promise<void> {
  const response = await api.delete(
    `${API_ENDPOINTS.programs.coachDelete(programId)}`,
  );

  await success(
    response,
    `DELETE /api/programs/coach/${programId}`,
  );
}

async function assertAssignmentDb(
  userId: number,
  programId: number,
  expectedStatus: string | null,
): Promise<void> {
  const row = await dbOne<{
    count: string;
    status: string | null;
  }>(
    `SELECT count(*)::text AS count,
            max(status) AS status
       FROM public.user_programs
      WHERE user_id = $1
        AND program_id = $2`,
    [userId, programId],
  );

  expect(Number(row?.count ?? -1)).toBe(
    expectedStatus === null ? 0 : 1,
  );

  if (expectedStatus !== null) {
    expect(row?.status).toBe(expectedStatus);
  }
}

async function assertProgramDeleted(
  programId: number,
): Promise<void> {
  const row = await dbOne<{
    programs: string;
    translations: string;
    program_workouts: string;
    user_programs: string;
  }>(
    `SELECT
       (SELECT count(*) FROM public.programs
         WHERE id = $1) AS programs,
       (SELECT count(*) FROM public.program_translations
         WHERE program_id = $1) AS translations,
       (SELECT count(*) FROM public.program_workouts
         WHERE program_id = $1) AS program_workouts,
       (SELECT count(*) FROM public.user_programs
         WHERE program_id = $1) AS user_programs`,
    [programId],
  );

  expect(Number(row?.programs ?? -1)).toBe(0);
  expect(Number(row?.translations ?? -1)).toBe(0);
  expect(Number(row?.program_workouts ?? -1)).toBe(0);
  expect(Number(row?.user_programs ?? -1)).toBe(0);
}

test.describe(
  'Coach - Program Assignment comprehensive',
  () => {
    test.describe.configure({ mode: 'serial' });

    test(
      'ASSIGN: saját user → assigned-users → PostgreSQL',
      async ({ page }) => {
        await loginAsCoach(page);
        const api = await apiFor(page);

        const userId = await coachUserId();
        const programId = await createProgram(
          api,
          `E2E Program ASSIGN ${suffix()}`,
        );

        try {
          await assertAssignmentDb(
            userId,
            programId,
            null,
          );

          const response = await api.post(
            API_ENDPOINTS.programs.assign,
            {
              data: {
                userId,
                programId,
              },
            },
          );

          await success(
            response,
            'POST /api/programs/assign',
          );

          await assertAssignmentDb(
            userId,
            programId,
            'assigned',
          );

          const assigned = await success(
            await api.get(
              `${API_ENDPOINTS.programs.assignedUsers(programId)}`,
            ),
            'GET /api/programs/{id}/assigned-users',
          );

          expect(
            Array.isArray(assigned.data),
          ).toBeTruthy();

          expect(
            assigned.data.map(Number),
          ).toContain(userId);

          console.log(
            [
              '[E2E PROGRAM ASSIGNMENT]',
              `programId=${programId}`,
              `userId=${userId}`,
              'status=assigned',
            ].join(' '),
          );
        } finally {
          await deleteProgram(api, programId);
          await assertProgramDeleted(programId);
          await api.dispose();
        }
      },
    );

    test(
      'ASSIGN DUPLICATE: második hozzárendelés nem hoz létre második DB sort',
      async ({ page }) => {
        await loginAsCoach(page);
        const api = await apiFor(page);

        const userId = await coachUserId();
        const programId = await createProgram(
          api,
          `E2E Program DUPLICATE ${suffix()}`,
        );

        try {
          await success(
            await api.post(API_ENDPOINTS.programs.assign, {
              data: { userId, programId },
            }),
            'POST /api/programs/assign #1',
          );

          expect(
            await dbCount(
              `SELECT count(*)::text AS count
                 FROM public.user_programs
                WHERE user_id=$1
                  AND program_id=$2`,
              [userId, programId],
            ),
          ).toBe(1);

          await success(
            await api.post(API_ENDPOINTS.programs.assign, {
              data: { userId, programId },
            }),
            'POST /api/programs/assign #2 duplicate',
          );

          expect(
            await dbCount(
              `SELECT count(*)::text AS count
                 FROM public.user_programs
                WHERE user_id=$1
                  AND program_id=$2`,
              [userId, programId],
            ),
          ).toBe(1);

          await assertAssignmentDb(
            userId,
            programId,
            'assigned',
          );
        } finally {
          await deleteProgram(api, programId);
          await assertProgramDeleted(programId);
          await api.dispose();
        }
      },
    );

    test(
      'ASSIGN REACTIVATE: inactive kapcsolat → assign → status=assigned',
      async ({ page }) => {
        await loginAsCoach(page);
        const api = await apiFor(page);

        const userId = await coachUserId();
        const programId = await createProgram(
          api,
          `E2E Program REACTIVATE ${suffix()}`,
        );

        try {
          await success(
            await api.post(API_ENDPOINTS.programs.assign, {
              data: { userId, programId },
            }),
            'POST /api/programs/assign initial',
          );

          const updated = await db().query(
            `UPDATE public.user_programs
                SET status = 'completed'
              WHERE user_id = $1
                AND program_id = $2`,
            [userId, programId],
          );

          expect(updated.rowCount).toBe(1);

          await assertAssignmentDb(
            userId,
            programId,
            'completed',
          );

          await success(
            await api.post(API_ENDPOINTS.programs.assign, {
              data: { userId, programId },
            }),
            'POST /api/programs/assign reactivation',
          );

          await assertAssignmentDb(
            userId,
            programId,
            'assigned',
          );

          const count = await dbCount(
            `SELECT count(*)::text AS count
               FROM public.user_programs
              WHERE user_id=$1
                AND program_id=$2`,
            [userId, programId],
          );

          expect(count).toBe(1);
        } finally {
          await deleteProgram(api, programId);
          await assertProgramDeleted(programId);
          await api.dispose();
        }
      },
    );

    test(
      'NEGATIVE: coach nem rendelhet programot nem saját ügyfélnek',
      async ({ page }) => {
        await loginAsCoach(page);
        const api = await apiFor(page);

        const targetUserId = await adminUserId();
        const programId = await createProgram(
          api,
          `E2E Program FORBIDDEN ${suffix()}`,
        );

        try {
          const before = await dbCount(
            `SELECT count(*)::text AS count
               FROM public.user_programs
              WHERE user_id=$1
                AND program_id=$2`,
            [targetUserId, programId],
          );

          expect(before).toBe(0);

          await rejected(
            await api.post(API_ENDPOINTS.programs.assign, {
              data: {
                userId: targetUserId,
                programId,
              },
            }),
            'POST /api/programs/assign foreign user',
          );

          const after = await dbCount(
            `SELECT count(*)::text AS count
               FROM public.user_programs
              WHERE user_id=$1
                AND program_id=$2`,
            [targetUserId, programId],
          );

          expect(after).toBe(0);
        } finally {
          await deleteProgram(api, programId);
          await assertProgramDeleted(programId);
          await api.dispose();
        }
      },
    );

    test(
      'NEGATIVE: nem létező user/program → DB változatlan marad',
      async ({ page }) => {
        await loginAsCoach(page);
        const api = await apiFor(page);

        const missingUserId = 2147483000;
        const missingProgramId = 2147483001;

        const before = await dbCount(
          `SELECT count(*)::text AS count
             FROM public.user_programs
            WHERE user_id=$1
               OR program_id=$2`,
          [missingUserId, missingProgramId],
        );

        await rejected(
          await api.post(API_ENDPOINTS.programs.assign, {
            data: {
              userId: missingUserId,
              programId: missingProgramId,
            },
          }),
          'POST /api/programs/assign invalid IDs',
        );

        const after = await dbCount(
          `SELECT count(*)::text AS count
             FROM public.user_programs
            WHERE user_id=$1
               OR program_id=$2`,
          [missingUserId, missingProgramId],
        );

        expect(after).toBe(before);

        await api.dispose();
      },
    );
  },
);
