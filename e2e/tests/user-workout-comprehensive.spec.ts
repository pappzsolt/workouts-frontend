import { expect, test } from '@playwright/test';
import {
  apiFor, anotherUserId, coachUserId, createProgram, createWorkout, currentUserId,
  dbCount, dbOne, deleteProgram, deleteWorkout, login, rejected, success, suffix,
} from './e2e-next-3-helpers';

test.describe('User - UserWorkout endpoint matrix', () => {
  test.describe.configure({ mode: 'serial' });

  test('USER WORKOUT: program assignment → auto USER_WORKOUT → create-with-exercises → GET → scheduled → reschedule → search → DB', async ({ page }) => {
    await login(page, 'coach');
    const coachApi = await apiFor(page);
    const userId = await coachUserId();
    const programId = await createProgram(coachApi, `E2E UW PROGRAM ${suffix()}`);
    const workoutId = await createWorkout(coachApi, `E2E UW WORKOUT ${suffix()}`);

    try {
      await success(await coachApi.post('/api/programs/assign', {
        data: { userId, programId },
      }), 'POST /api/programs/assign');

      const pw = await success(await coachApi.post('/api/program-workouts/add', {
        data: { programId, workoutId, dayIndex: 1 },
      }), 'POST /api/program-workouts/add');
      const programWorkoutId = Number(pw.data?.id);
      expect(programWorkoutId).toBeGreaterThan(0);

      const userWorkout = await dbOne<{ id: number; scheduled_at: string; user_id: number; program_id: number; workout_id: number; program_workout_id: number }>(
        `SELECT id, scheduled_at, user_id, program_id, workout_id, program_workout_id
           FROM public.user_workouts
          WHERE user_id=$1 AND program_id=$2 AND workout_id=$3 AND program_workout_id=$4
          ORDER BY id DESC LIMIT 1`,
        [userId, programId, workoutId, programWorkoutId],
      );
      expect(userWorkout).not.toBeNull();
      const userWorkoutId = Number(userWorkout!.id);
      expect(Number(userWorkout!.user_id)).toBe(userId);
      expect(Number(userWorkout!.program_id)).toBe(programId);
      expect(Number(userWorkout!.workout_id)).toBe(workoutId);
      expect(Number(userWorkout!.program_workout_id)).toBe(programWorkoutId);

      await coachApi.dispose();
      await login(page, 'user');
      const userApi = await apiFor(page);
      const actualUserId = await currentUserId();
      expect(actualUserId).toBe(userId);

      // A backend contract szerint ez az endpoint a program ÖSSZES workout-occurrence
      // ID-ját adja vissza. A program assign már létrehozott egy másik occurrence-t;
      // az explicit scheduledAt=2035-04-20 ezért egy új, külön USER_WORKOUT lehet.
      const beforeCount = await dbCount(
        `SELECT count(*)::text AS count
           FROM public.user_workouts
          WHERE user_id=$1 AND program_id=$2`,
        [userId, programId],
      );
      expect(beforeCount).toBe(1);

      const created = await success(await userApi.post('/api/user-workout-exercises/create-with-exercises', {
        data: { userId, programId, scheduledAt: '2035-04-20' },
      }), 'POST /api/user-workout-exercises/create-with-exercises');
      expect(Array.isArray(created.data)).toBeTruthy();
      expect(created.data).toHaveLength(1);

      const createdUserWorkoutId = Number(created.data[0]);
      expect(Number.isInteger(createdUserWorkoutId) && createdUserWorkoutId > 0).toBeTruthy();
      expect(createdUserWorkoutId).not.toBe(userWorkoutId);

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
        await userApi.get(`/api/user-workout-exercises/user-program/${userId}/${programId}?language=hu`),
        'GET /api/user-workout-exercises/user-program/{userId}/{programId}',
      );
      expect(Array.isArray(full.data)).toBeTruthy();
      expect(full.data.some((x: any) => Number(x.userWorkoutId ?? x.user_workout_id ?? x.id) === createdUserWorkoutId)).toBeTruthy();

      const exercises = await success(
        await userApi.get(`/api/user-workout-exercises/workout/${createdUserWorkoutId}?language=hu`),
        'GET /api/user-workout-exercises/workout/{userWorkoutId}',
      );
      expect(Array.isArray(exercises.data)).toBeTruthy();

      const scheduled = await success(
        await userApi.get('/api/user-workout-exercises/scheduled-workouts?language=hu'),
        'GET /api/user-workout-exercises/scheduled-workouts',
      );
      expect(Array.isArray(scheduled.data)).toBeTruthy();
      expect(scheduled.data.some((x: any) => Number(x.userWorkoutId ?? x.user_workout_id ?? x.id) === createdUserWorkoutId)).toBeTruthy();

      await success(await userApi.patch('/api/user-workout-exercises/reschedule-user-workout', {
        data: { userWorkoutId: createdUserWorkoutId, scheduledAt: '2035-04-21' },
      }), 'PATCH /api/user-workout-exercises/reschedule-user-workout');

      const moved = await dbOne<{ scheduled_at: string }>(
        `SELECT scheduled_at::text AS scheduled_at FROM public.user_workouts WHERE id=$1`,
        [createdUserWorkoutId],
      );
      expect(String(moved?.scheduled_at)).toContain('2035-04-21');

      const search = await success(
        await userApi.get('/api/user-workout-exercises/scheduled-workouts/search?search=E2E&page=0&size=20&language=hu'),
        'GET /api/user-workout-exercises/scheduled-workouts/search',
      );
      expect(search).toBeTruthy();

      await userApi.dispose();
    } finally {
      await login(page, 'coach');
      const cleanup = await apiFor(page);
      await deleteProgram(cleanup, programId);
      await deleteWorkout(cleanup, workoutId);
      await cleanup.dispose();
    }
  });

  test('NEGATIVE OWNERSHIP: user nem módosíthat ténylegesen másik user workoutját', async ({ page }) => {
    await login(page, 'coach');
    const coachApi = await apiFor(page);
    const ownUserId = await coachUserId();
    const foreignUserId = await anotherUserId(ownUserId);
    const programId = await createProgram(coachApi, `E2E FOREIGN UW PROGRAM ${suffix()}`);
    const workoutId = await createWorkout(coachApi, `E2E FOREIGN UW WORKOUT ${suffix()}`);

    try {
      await success(await coachApi.post('/api/programs/assign', { data: { userId: foreignUserId, programId } }), 'assign foreign user');
      const pw = await success(await coachApi.post('/api/program-workouts/add', { data: { programId, workoutId, dayIndex: 1 } }), 'add foreign program workout');
      const programWorkoutId = Number(pw.data?.id);
      const foreignUw = await dbOne<{ id: number }>(
        `SELECT id FROM public.user_workouts WHERE user_id=$1 AND program_workout_id=$2 ORDER BY id DESC LIMIT 1`,
        [foreignUserId, programWorkoutId],
      );
      expect(foreignUw).not.toBeNull();
      const foreignUserWorkoutId = Number(foreignUw!.id);

      await coachApi.dispose();
      await login(page, 'user');
      const userApi = await apiFor(page);

      const before = await dbOne<{ scheduled_at: string }>(
        `SELECT scheduled_at::text AS scheduled_at FROM public.user_workouts WHERE id=$1`,
        [foreignUserWorkoutId],
      );
      expect(before).not.toBeNull();

      await rejected(
        await userApi.patch('/api/user-workout-exercises/reschedule-user-workout', {
          data: { userWorkoutId: foreignUserWorkoutId, scheduledAt: '2035-05-01' },
        }),
        'PATCH foreign user workout',
      );

      const after = await dbOne<{ scheduled_at: string }>(
        `SELECT scheduled_at::text AS scheduled_at FROM public.user_workouts WHERE id=$1`,
        [foreignUserWorkoutId],
      );
      expect(after?.scheduled_at).toBe(before?.scheduled_at);
      await userApi.dispose();
    } finally {
      await login(page, 'coach');
      const cleanup = await apiFor(page);
      await deleteProgram(cleanup, programId);
      await deleteWorkout(cleanup, workoutId);
      await cleanup.dispose();
    }
  });
});
