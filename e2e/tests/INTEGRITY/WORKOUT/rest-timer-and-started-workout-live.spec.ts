import { test, expect, db, dbOne, fixtureSets, closeDb } from '../../helpers/coach-workspace-fixture';
import { API_ENDPOINTS as E } from '../../helpers/api-endpoints';
import { authenticate } from '../../helpers/auth-session';
import { apiFor, success } from '../../helpers/e2e-next-3-helpers';

test.describe.configure({ timeout: 120_000 });
test.afterAll(closeDb);

test('REST TIMER: complete → undo → complete again creates a fresh persisted timer', async ({ page, workspace: f }) => {
  const sets = await fixtureSets(f);
  expect(sets.length).toBeGreaterThan(0);
  const setId = Number(sets[0].id);

  const save = (completed: boolean) => f.api.put(E.userWorkoutExerciseSets.byId(setId), {
    data: {
      completed,
      actualRepetitions: completed ? 8 : null,
      actualWeightKg: completed ? 20 : null,
      restSeconds: 90,
    },
  });

  await success(await save(true), 'Complete set for rest timer');
  const first = await dbOne<{rest_started_at: Date; rest_ends_at: Date; rest_duration_seconds: number}>(
    'SELECT rest_started_at,rest_ends_at,rest_duration_seconds FROM user_workout_set_rest_timers WHERE user_workout_exercise_set_id=$1', [setId]);
  expect(first, 'Completing the set must create a real timer in PostgreSQL').not.toBeNull();
  expect(Number(first!.rest_duration_seconds)).toBe(90);
  expect(new Date(first!.rest_ends_at).getTime() - new Date(first!.rest_started_at).getTime()).toBe(90_000);

  await success(await save(false), 'Undo completed set');
  expect(await dbOne('SELECT user_workout_exercise_set_id FROM user_workout_set_rest_timers WHERE user_workout_exercise_set_id=$1', [setId])).toBeNull();

  await success(await save(true), 'Complete set a second time');
  const second = await dbOne<{rest_started_at: Date; rest_ends_at: Date; rest_duration_seconds: number}>(
    'SELECT rest_started_at,rest_ends_at,rest_duration_seconds FROM user_workout_set_rest_timers WHERE user_workout_exercise_set_id=$1', [setId]);
  expect(second, 'Recompletion must recreate the persisted timer').not.toBeNull();
  expect(Number(second!.rest_duration_seconds)).toBe(90);
  expect(new Date(second!.rest_started_at).getTime()).toBeGreaterThanOrEqual(new Date(first!.rest_started_at).getTime());
  expect(new Date(second!.rest_ends_at).getTime() - new Date(second!.rest_started_at).getTime()).toBe(90_000);
});

test('STARTED WORKOUT: changing program start date preserves an in-progress mobile workout', async ({ page, browser, workspace: f }) => {
  const rows = (await db().query(
    'SELECT id,scheduled_at::text AS scheduled_at FROM user_workouts WHERE program_id=$1 AND user_id=$2 ORDER BY scheduled_at,id',
    [f.programId, f.userId],
  )).rows as {id: number; scheduled_at: string}[];
  expect(rows.length).toBeGreaterThanOrEqual(2);
  const startedId = Number(rows[0].id);
  const untouchedId = Number(rows[1].id);
  const startedSchedule = rows[0].scheduled_at;
  const untouchedSchedule = rows[1].scheduled_at;

  // Keep USER cookies isolated from the fixture's authenticated COACH page.
  const userContext = await browser.newContext();
  const userPage = await userContext.newPage();
  try {
    await authenticate(userPage, 'user');
    const userApi = await apiFor(userPage);
    try {
      const startedAt = new Date().toISOString();
      const started = await success(await userApi.put(E.mobile.userWorkoutState(startedId), {
        data: { status: 'IN_PROGRESS', startedAt, completedAt: null, userNote: null, sets: [] },
      }), 'Start mobile workout without completed sets');
      expect(started.data.userWorkout.status).toBe('IN_PROGRESS');
      const before = await dbOne<{started_at: Date | null; completed: boolean}>(
        'SELECT started_at,completed FROM user_workouts WHERE id=$1', [startedId]);
      expect(before?.started_at, 'The mobile API must persist started_at').not.toBeNull();
      expect(before?.completed).toBe(false);
    } finally { await userApi.dispose(); }
  } finally { await userContext.close(); }

  // Use the real coach program editor; this must exercise the backend cleanup/rescheduling logic.
  await page.goto(`/coach/programs/${f.programId}`);
  const editor = page.locator('app-coach-program-editor');
  await expect(editor.locator('[name=startDate]'), 'Coach editor must be visible with COACH session intact').toBeVisible();
  const originalStart = await editor.locator('[name=startDate]').inputValue();
  const newStart = new Date(`${originalStart}T12:00:00Z`);
  newStart.setUTCDate(newStart.getUTCDate() + 2);
  const newStartText = newStart.toISOString().slice(0, 10);
  await editor.locator('[name=startDate]').fill(newStartText);
  const updatedResponse = page.waitForResponse(r => r.request().method() === 'PUT' && new URL(r.url()).pathname === E.programs.byId(f.programId));
  await editor.getByRole('button', { name: 'Mentés', exact: true }).click();
  expect((await updatedResponse).ok(), 'Program start-date update must succeed').toBe(true);

  const after = (await db().query(
    'SELECT id,scheduled_at::text AS scheduled_at,started_at FROM user_workouts WHERE id=ANY($1::bigint[]) ORDER BY id',
    [[startedId, untouchedId]],
  )).rows as {id: number; scheduled_at: string; started_at: Date | null}[];
  const protectedWorkout = after.find(row => Number(row.id) === startedId);
  const pendingWorkout = after.find(row => Number(row.id) === untouchedId);
  expect(protectedWorkout, 'Started workout must not be deleted').toBeDefined();
  expect(protectedWorkout!.started_at).not.toBeNull();
  expect(protectedWorkout!.scheduled_at).toBe(startedSchedule);
  expect(pendingWorkout, 'Unstarted workout must remain available').toBeDefined();
  expect(pendingWorkout!.started_at).toBeNull();
  expect(pendingWorkout!.scheduled_at).not.toBe(untouchedSchedule);
});
