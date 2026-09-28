import { test, expect } from '@playwright/test';
import { apiFor, dbOne, currentUserId, login, success, LANGUAGE } from './e2e-next-3-helpers';

test('COACH READ: coach programs + user/coach name-id + coach lookup match DB', async ({
  page,
}) => {
  // ---------------------------------------------------------------------------
  // LOGIN
  // ---------------------------------------------------------------------------

  await login(page, 'coach');

  const api = await apiFor(page);

  // ---------------------------------------------------------------------------
  // COACH ID
  //
  // A coach külön account a public.coaches táblában.
  // A coach login username-je a coaches.name mező.
  //
  // NEM:
  //   users.username -> users.coach_id -> coaches.id
  //
  // HANEM:
  //   coaches.name -> coaches.id
  // ---------------------------------------------------------------------------

  const coachUsername = process.env.E2E_COACH_USERNAME;

  if (!coachUsername) {
    throw new Error('Hiányzó E2E_COACH_USERNAME.');
  }

  const coachIdRow = await dbOne<{ id: number }>(
    `
      SELECT id
      FROM public.coaches
      WHERE name = $1
      LIMIT 1
    `,
    [coachUsername],
  );

  expect(
    coachIdRow,
    `A coach nem található a public.coaches táblában: ${coachUsername}`,
  ).not.toBeNull();

  const coachId = Number(coachIdRow!.id);

  expect(Number.isInteger(coachId)).toBeTruthy();
  expect(coachId).toBeGreaterThan(0);

  // ---------------------------------------------------------------------------
  // CURRENT TEST USER
  //
  // Ez továbbra is a public.users táblából jön.
  // ---------------------------------------------------------------------------

  const userId = await currentUserId();

  expect(Number.isInteger(userId)).toBeTruthy();
  expect(userId).toBeGreaterThan(0);

  // ---------------------------------------------------------------------------
  // 1. COACH PROGRAMS
  // ---------------------------------------------------------------------------

  const programs = await success(
    await api.get('/api/programs/my/coach-programs', {
      params: {
        language: LANGUAGE,
      },
    }),
    'GET /api/programs/my/coach-programs',
  );

  expect(Array.isArray(programs.data)).toBeTruthy();

  // A DB-ben közvetlenül a programs.coach_id alapján ellenőrizzük
  // a bejelentkezett coach programjainak számát.

  const dbPrograms = await dbOne<{ count: string }>(
    `
      SELECT COUNT(*)::text AS count
      FROM public.programs
      WHERE coach_id = $1
    `,
    [coachId],
  );

  expect(dbPrograms).not.toBeNull();

  expect(programs.data.length).toBe(Number(dbPrograms?.count ?? 0));

  // Minden API-ban visszaadott programnak a DB-ben is léteznie kell,
  // és ugyanahhoz a coachhoz kell tartoznia.

  for (const program of programs.data) {
    const programId = Number(program.programId);

    expect(Number.isInteger(programId)).toBeTruthy();
    expect(programId).toBeGreaterThan(0);

    const dbProgram = await dbOne<{ id: number }>(
      `
        SELECT id
        FROM public.programs
        WHERE id = $1
          AND coach_id = $2
        LIMIT 1
      `,
      [programId, coachId],
    );

    expect(
      dbProgram,
      `Az API olyan programot adott vissza, amely nem ehhez a coachhoz tartozik: ${programId}`,
    ).not.toBeNull();
  }

  // ---------------------------------------------------------------------------
  // 2. USERS NAME-ID
  // ---------------------------------------------------------------------------

  const users = await success(await api.get('/api/users-name-id'), 'GET /api/users-name-id');

  expect(Array.isArray(users.data)).toBeTruthy();

  expect(users.data.some((x: any) => Number(x.id) === userId)).toBeTruthy();

  // ---------------------------------------------------------------------------
  // 3. COACHES NAME-ID
  // ---------------------------------------------------------------------------

  const coaches = await success(await api.get('/api/coaches-name-id'), 'GET /api/coaches-name-id');

  expect(Array.isArray(coaches.data)).toBeTruthy();

  expect(coaches.data.some((x: any) => Number(x.id) === coachId)).toBeTruthy();

  // A DB-ből származó coach névnek is szerepelnie kell.

  const dbCoach = await dbOne<{ id: number; name: string }>(
    `
      SELECT id, name
      FROM public.coaches
      WHERE id = $1
      LIMIT 1
    `,
    [coachId],
  );

  expect(dbCoach).not.toBeNull();

  expect(
    coaches.data.some((x: any) => Number(x.id) === coachId && x.name === dbCoach?.name),
  ).toBeTruthy();

  // ---------------------------------------------------------------------------
  // 4. GET /api/coach/{id}
  // ---------------------------------------------------------------------------

  const coach = await success(await api.get(`/api/coach/${coachId}`), `GET /api/coach/${coachId}`);

  expect(Number(coach.data?.id)).toBe(coachId);
  expect(coach.data?.name).toBe(dbCoach?.name);

  // ---------------------------------------------------------------------------
  // 5. GET /api/coach
  // ---------------------------------------------------------------------------

  const all = await success(await api.get('/api/coach'), 'GET /api/coach');

  expect(Array.isArray(all.data)).toBeTruthy();

  expect(
    all.data.some((x: any) => Number(x.id) === coachId && x.name === dbCoach?.name),
  ).toBeTruthy();
});

