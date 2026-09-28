import { expect, test } from '@playwright/test';
import {
  apiFor,
  adminUserId,
  assignExercise,
  coachUserId,
  createExercise,
  createProgram,
  createWorkout,
  dbCount,
  dbOne,
  deleteExercise,
  deleteProgram,
  deleteWorkout,
  login,
  rejected,
  success,
  suffix,
} from '../../helpers/e2e-next-3-helpers';

test.describe('User - UserWorkout endpoint matrix', () => {
  test.describe.configure({ mode: 'serial' });

  test('USER WORKOUT: program assignment → auto USER_WORKOUT → create-with-exercises → GET → scheduled → reschedule → search → DB', async ({ page }) => {
    await login(page, 'coach');
    const coachApi = await apiFor(page);
    const userId = await coachUserId();

    const programId = await createProgram(coachApi, `E2E UW PROGRAM ${suffix()}`);
    const workoutId = await createWorkout(coachApi, `E2E UW WORKOUT ${suffix()}`);
    const exerciseId = await createExercise(coachApi, `E2E UW EXERCISE ${suffix()}`);

    try {
      // The user-program assignment must exist before user-workout creation.
      await success(
        await coachApi.post('/api/programs/assign', {
          data: { userId, programId },
        }),
        'POST /api/programs/assign',
      );

      // The user-program GET endpoint joins workout_exercises and
      // user_workout_exercises, so the fixture must contain an exercise.
      await success(
        await coachApi.post('/api/workout-exercises/assign', {
          params: { workoutId, exerciseId },
        }),
        'POST /api/workout-exercises/assign',
      );

      const pw = await success(
        await coachApi.post('/api/program-workouts/add', {
          data: { programId, workoutId, dayIndex: 1 },
        }),
        'POST /api/program-workouts/add',
      );

      const programWorkoutId = Number(pw.data?.id);
      expect(programWorkoutId).toBeGreaterThan(0);

      const baseline = await dbOne<{
        id: number;
        scheduled_at: string;
        user_id: number;
        program_id: number;
        workout_id: number;
        program_workout_id: number;
      }>(
        `SELECT id, scheduled_at::text AS scheduled_at, user_id, program_id, workout_id, program_workout_id
           FROM public.user_workouts
          WHERE user_id=$1 AND program_id=$2 AND workout_id=$3 AND program_workout_id=$4
          ORDER BY id DESC LIMIT 1`,
        [userId, programId, workoutId, programWorkoutId],
      );

      expect(baseline).not.toBeNull();
      const baselineUserWorkoutId = Number(baseline!.id);

      await coachApi.dispose();
      await login(page, 'user');
      const userApi = await apiFor(page);

      expect(await dbCount(
        `SELECT count(*)::text AS count
           FROM public.user_workouts
          WHERE user_id=$1 AND program_id=$2`,
        [userId, programId],
      )).toBe(1);

      // The endpoint is intentionally idempotent for the same
      // user + program-workout + scheduledAt combination, but a different
      // scheduledAt creates a separate occurrence.
      const created = await success(
        await userApi.post('/api/user-workout-exercises/create-with-exercises', {
          data: {
            userId,
            programId,
            scheduledAt: '2035-04-20',
          },
        }),
        'POST /api/user-workout-exercises/create-with-exercises',
      );

      expect(Array.isArray(created.data)).toBeTruthy();
      expect(created.data).toHaveLength(1);

      const createdUserWorkoutId = Number(created.data[0]);
      expect(Number.isInteger(createdUserWorkoutId) && createdUserWorkoutId > 0).toBeTruthy();
      expect(createdUserWorkoutId).not.toBe(baselineUserWorkoutId);

      const createdDb = await dbOne<{
        id: number;
        user_id: number;
        program_id: number;
        workout_id: number;
        program_workout_id: number;
        scheduled_at: string;
      }>(
        `SELECT id, user_id, program_id, workout_id, program_workout_id,
                scheduled_at::text AS scheduled_at
           FROM public.user_workouts
          WHERE id=$1`,
        [createdUserWorkoutId],
      );

      expect(createdDb).not.toBeNull();
      expect(Number(createdDb!.user_id)).toBe(userId);
      expect(Number(createdDb!.program_id)).toBe(programId);
      expect(Number(createdDb!.workout_id)).toBe(workoutId);
      expect(Number(createdDb!.program_workout_id)).toBe(programWorkoutId);
      expect(createdDb!.scheduled_at).toContain('2035-04-20');

      expect(await dbCount(
        `SELECT count(*)::text AS count
           FROM public.user_workouts
          WHERE user_id=$1 AND program_id=$2`,
        [userId, programId],
      )).toBe(2);

      const full = await success(
        await userApi.get(
          `/api/user-workout-exercises/user-program/${userId}/${programId}?language=hu`,
        ),
        'GET /api/user-workout-exercises/user-program/{userId}/{programId}',
      );

      expect(Array.isArray(full.data)).toBeTruthy();

      // This endpoint returns workout/exercise rows, not bare USER_WORKOUT rows.
      // Because the fixture contains one workout exercise, both occurrences
      // are represented by the corresponding user_workout_id.
      expect(
        full.data.some(
          (x: any) => Number(x.user_workout_id ?? x.userWorkoutId) === createdUserWorkoutId,
        ),
      ).toBeTruthy();

      const exercises = await success(
        await userApi.get(
          `/api/user-workout-exercises/workout/${createdUserWorkoutId}?language=hu`,
        ),
        'GET /api/user-workout-exercises/workout/{userWorkoutId}',
      );

      expect(Array.isArray(exercises.data)).toBeTruthy();
      expect(exercises.data.length).toBeGreaterThan(0);

      const scheduled = await success(
        await userApi.get('/api/user-workout-exercises/scheduled-workouts?language=hu'),
        'GET /api/user-workout-exercises/scheduled-workouts',
      );

      expect(Array.isArray(scheduled.data)).toBeTruthy();
      expect(
        scheduled.data.some(
          (x: any) => Number(x.user_workout_id ?? x.userWorkoutId) === createdUserWorkoutId,
        ),
      ).toBeTruthy();

      await success(
        await userApi.patch('/api/user-workout-exercises/reschedule-user-workout', {
          data: {
            userWorkoutId: createdUserWorkoutId,
            scheduledAt: '2035-04-21',
          },
        }),
        'PATCH /api/user-workout-exercises/reschedule-user-workout',
      );

      const moved = await dbOne<{ scheduled_at: string }>(
        `SELECT scheduled_at::text AS scheduled_at
           FROM public.user_workouts
          WHERE id=$1`,
        [createdUserWorkoutId],
      );

      expect(String(moved?.scheduled_at)).toContain('2035-04-21');

      const search = await success(
        await userApi.get(
          '/api/user-workout-exercises/scheduled-workouts/search?search=E2E&page=0&size=20&language=hu',
        ),
        'GET /api/user-workout-exercises/scheduled-workouts/search',
      );

      expect(search).toBeTruthy();
      expect(Array.isArray(search.data?.content)).toBeTruthy();
      expect(search.data.content.some(
        (x: any) => Number(x.user_workout_id ?? x.userWorkoutId) === createdUserWorkoutId,
      )).toBeTruthy();

      await userApi.dispose();
    } finally {
      await login(page, 'coach');
      const cleanup = await apiFor(page);

      // deleteProgram removes the generated USER_WORKOUT / UWE / sets first.
      await deleteProgram(cleanup, programId);

      // A program-assigned workout cannot have its exercise structure removed.
      // After the program is deleted, the relation becomes mutable again.
      await success(
        await cleanup.delete('/api/workout-exercises/delete', {
          params: { workoutId, exerciseId },
        }),
        'DELETE /api/workout-exercises/delete',
      );

      await deleteExercise(cleanup, exerciseId);
      await deleteWorkout(cleanup, workoutId);
      await cleanup.dispose();
    }
  });

  test('NEGATIVE OWNERSHIP: user nem módosíthat másik users rekordhoz tartozó workoutot', async ({ page }) => {
    await login(page, 'coach');
    const coachApi = await apiFor(page);
    const foreignUserId = await adminUserId();

    const programId = await createProgram(
      coachApi,
      `E2E FOREIGN UW PROGRAM ${suffix()}`,
    );
    const workoutId = await createWorkout(
      coachApi,
      `E2E FOREIGN UW WORKOUT ${suffix()}`,
    );
    const exerciseId = await createExercise(
      coachApi,
      `E2E FOREIGN UW EXERCISE ${suffix()}`,
    );

    try {
      await success(
        await coachApi.post('/api/workout-exercises/assign', {
          params: { workoutId, exerciseId },
        }),
        'assign foreign-workout exercise',
      );

      // A program-workout kapcsolatot még a foreign account hozzárendelése
      // előtt hozzuk létre, így a coach oldali automatikus USER_WORKOUT
      // létrehozása nem fut le foreign userre.
      const pw = await success(
        await coachApi.post('/api/program-workouts/add', {
          data: { programId, workoutId, dayIndex: 1 },
        }),
        'add foreign program workout',
      );

      const programWorkoutId = Number(pw.data?.id);
      expect(programWorkoutId).toBeGreaterThan(0);

      await coachApi.dispose();

      // Az adatbázis dumpban a második users-rekord az admin (id=319).
      // Az admin API-n keresztül jogosan létrehozható hozzá USER_WORKOUT,
      // így az ownership teszt valódi API-flow-t vizsgál, nem közvetlen DB
      // beszúrást.
      await login(page, 'admin');
      const adminApi = await apiFor(page);

      await success(
        await adminApi.post('/api/programs/assign', {
          data: { userId: foreignUserId, programId },
        }),
        'admin assigns program to foreign users record',
      );

      const created = await success(
        await adminApi.post('/api/user-workout-exercises/create-with-exercises', {
          data: {
            userId: foreignUserId,
            programId,
            scheduledAt: '2035-05-01',
          },
        }),
        'admin creates foreign user workout',
      );

      expect(Array.isArray(created.data)).toBeTruthy();
      expect(created.data).toHaveLength(1);

      const foreignUserWorkoutId = Number(created.data[0]);
      expect(foreignUserWorkoutId).toBeGreaterThan(0);

      const before = await dbOne<{ scheduled_at: string; user_id: number }>(
        `SELECT scheduled_at::text AS scheduled_at, user_id
           FROM public.user_workouts
          WHERE id=$1`,
        [foreignUserWorkoutId],
      );

      expect(before).not.toBeNull();
      expect(Number(before!.user_id)).toBe(foreignUserId);

      await adminApi.dispose();

      await login(page, 'user');
      const userApi = await apiFor(page);

      await rejected(
        await userApi.patch('/api/user-workout-exercises/reschedule-user-workout', {
          data: {
            userWorkoutId: foreignUserWorkoutId,
            scheduledAt: '2035-05-02',
          },
        }),
        'PATCH foreign user workout',
      );

      const after = await dbOne<{ scheduled_at: string; user_id: number }>(
        `SELECT scheduled_at::text AS scheduled_at, user_id
           FROM public.user_workouts
          WHERE id=$1`,
        [foreignUserWorkoutId],
      );

      expect(after?.scheduled_at).toBe(before?.scheduled_at);
      expect(Number(after?.user_id)).toBe(foreignUserId);

      await userApi.dispose();
    } finally {
      await login(page, 'coach');
      const cleanup = await apiFor(page);
      await deleteProgram(cleanup, programId);

      await success(
        await cleanup.delete('/api/workout-exercises/delete', {
          params: { workoutId, exerciseId },
        }),
        'DELETE foreign workout exercise relation',
      );

      await deleteExercise(cleanup, exerciseId);
      await deleteWorkout(cleanup, workoutId);
      await cleanup.dispose();
    }
  });
});
