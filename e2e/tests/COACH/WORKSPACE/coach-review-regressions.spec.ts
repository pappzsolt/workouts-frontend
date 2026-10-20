import { API_ENDPOINTS as E } from '../../helpers/api-endpoints';
import { authenticate } from '../../helpers/auth-session';
import { apiFor, dbOne, rejected, success } from '../../helpers/e2e-next-3-helpers';
import { expect, test } from '../../helpers/coach-workspace-fixture';

/*
 * Regressziós tesztek a 2026-10-20-i átnézés javításaihoz:
 * - az ügyfél programlistája az ügyfél saját (átütemezett) napját mutatja;
 * - a program kezdőnapjának módosítása megtartja az egyéni átütemezést (eltolja, nem visszaállítja);
 * - átütemezni csak a program időszakán belülre lehet;
 * - nem létező végpont 404, a megszüntetett POST /api/user-workout-exercises is.
 */

const addDays = (iso: string, days: number) => {
  const date = new Date(`${iso}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
};

async function occurrences(programId: number, userId: number) {
  const rows = await dbOne<{ rows: { id: number; day: number; date: string }[] }>(
    `SELECT json_agg(json_build_object('id', uw.id, 'day', pw.day_index, 'date', uw.scheduled_at::text)
                     ORDER BY pw.day_index) AS rows
       FROM user_workouts uw JOIN program_workouts pw ON pw.id = uw.program_workout_id
      WHERE uw.program_id = $1 AND uw.user_id = $2`,
    [programId, userId],
  );
  return rows?.rows ?? [];
}

test('REVIEW: kezdőnap-módosítás megtartja az egyéni átütemezést, az ügyfél listája a saját napját mutatja', async ({ page, workspace: f }) => {
  const program = (await success(await f.api.get(E.programs.byId(f.programId), { params: { language: 'hu' } }), 'Program')).data;
  const start: string = program.startDate;
  const before = await occurrences(f.programId, f.userId);
  expect(before.map((o) => o.day)).toEqual([1, 8]);

  // A 8. napi edzést egy nappal későbbre teszi a coach.
  const moved = before[1];
  await success(
    await f.api.patch(E.userWorkoutExercises.schedule, { data: { userWorkoutId: moved.id, scheduledAt: addDays(moved.date, 1) } }),
    'Egyéni átütemezés',
  );

  // A program kezdőnapja 3 nappal később.
  await success(
    await f.api.put(E.programs.byId(f.programId), {
      params: { language: 'hu' },
      data: {
        programId: f.programId,
        programName: program.programName,
        programDescription: program.programDescription,
        durationDays: program.durationDays,
        difficultyLevel: program.difficultyLevel,
        startDate: addDays(start, 3),
      },
    }),
    'Kezdőnap módosítása',
  );

  const after = await occurrences(f.programId, f.userId);
  expect(after[0].date).toBe(addDays(before[0].date, 3));
  // Az átütemezett edzés a saját napjáról tolódik el, nem ugrik vissza a sablon szerinti napra.
  expect(after[1].date).toBe(addDays(moved.date, 1 + 3));

  // Az ügyfél programlistája ugyanezeket a dátumokat mutatja.
  const userPage = await page.context().newPage();
  try {
    await authenticate(userPage, 'user');
    const userApi = await apiFor(userPage);
    try {
      const list = (await success(await userApi.get(`${E.workouts.base}/program/${f.programId}`, { params: { language: 'hu' } }), 'Ügyfél programlista')).data;
      expect(list.map((w: { workoutDate: string }) => w.workoutDate)).toEqual(after.map((o) => o.date));
    } finally {
      await userApi.dispose();
    }
  } finally {
    await userPage.close();
  }
});

test('REVIEW: átütemezés csak a program időszakán belülre', async ({ workspace: f }) => {
  const program = (await success(await f.api.get(E.programs.byId(f.programId), { params: { language: 'hu' } }), 'Program')).data;
  const [first] = await occurrences(f.programId, f.userId);

  for (const outside of [addDays(program.startDate, -1), addDays(program.endDate, 1), '2999-01-01']) {
    const body = await rejected(
      await f.api.patch(E.userWorkoutExercises.schedule, { data: { userWorkoutId: first.id, scheduledAt: outside } }),
      `Átütemezés a programon kívülre: ${outside}`,
      400,
    );
    expect(body.message).toContain('program időszakán belüli');
  }
  expect((await occurrences(f.programId, f.userId))[0].date).toBe(first.date);

  // A program utolsó napja még megengedett.
  await success(
    await f.api.patch(E.userWorkoutExercises.schedule, { data: { userWorkoutId: first.id, scheduledAt: program.endDate } }),
    'Átütemezés az utolsó napra',
  );
});

test('REVIEW: nem létező végpont 404, a megszüntetett tömeges létrehozás sem érhető el', async ({ workspace: f }) => {
  const unknown = await rejected(await f.api.get('/api/nincs-ilyen-vegpont'), 'Nem létező végpont', 404);
  expect(unknown.message).toBeTruthy();
  await rejected(
    await f.api.post(E.userWorkoutExercises.base, { data: { userId: f.userId, programId: f.programId, scheduledAt: '2035-03-01' } }),
    'Megszüntetett POST /api/user-workout-exercises',
    404,
  );
  await rejected(await f.api.delete('/api/coach/overview'), 'Nem támogatott metódus', 405);
});
