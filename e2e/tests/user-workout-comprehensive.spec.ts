import { expect, test } from '@playwright/test';
import {
  apiFor, coachUserId, createProgram, createWorkout, dbOne, deleteProgram,
  deleteWorkout, login, rejected, success, suffix
} from './e2e-next-3-helpers';

test.describe('User - UserWorkout / UserWorkoutExercise endpoint matrix', () => {
  test.describe.configure({ mode: 'serial' });

  test('USER WORKOUT: assignment → automatic user_workout → GET program/exercises → scheduled → reschedule → search → DB', async ({ page }) => {
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

      const uw = await dbOne<{ id: number; scheduled_at: string; user_id: number; program_id: number; workout_id: number }>(
        `SELECT id, scheduled_at, user_id, program_id, workout_id
           FROM public.user_workouts
          WHERE user_id=$1 AND program_id=$2 AND workout_id=$3
          ORDER BY id DESC LIMIT 1`,
        [userId, programId, workoutId],
      );
      expect(uw).not.toBeNull();
      const userWorkoutId = Number(uw!.id);
      expect(Number(uw!.user_id)).toBe(userId);
      expect(Number(uw!.program_id)).toBe(programId);
      expect(Number(uw!.workout_id)).toBe(workoutId);

      await coachApi.dispose();
      await login(page, 'user');
      const userApi = await apiFor(page);

      const full = await success(
        await userApi.get(`/api/user-workout-exercises/user-program/${userId}/${programId}?language=hu`),
        'GET /api/user-workout-exercises/user-program/{userId}/{programId}',
      );
      expect(Array.isArray(full.data)).toBeTruthy();
      expect(full.data.some((x: any) =>
        Number(x.userWorkoutId ?? x.user_workout_id ?? x.id) === userWorkoutId
      )).toBeTruthy();

      const exercises = await success(
        await userApi.get(`/api/user-workout-exercises/workout/${userWorkoutId}?language=hu`),
        'GET /api/user-workout-exercises/workout/{userWorkoutId}',
      );
      expect(Array.isArray(exercises.data)).toBeTruthy();

      const scheduled = await success(
        await userApi.get('/api/user-workout-exercises/scheduled-workouts?language=hu'),
        'GET /api/user-workout-exercises/scheduled-workouts',
      );
      expect(Array.isArray(scheduled.data)).toBeTruthy();
      expect(scheduled.data.some((x: any) =>
        Number(x.userWorkoutId ?? x.user_workout_id ?? x.id) === userWorkoutId
      )).toBeTruthy();

      await success(
        await userApi.patch('/api/user-workout-exercises/reschedule-user-workout', {
          data: { userWorkoutId, scheduledAt: '2035-04-21' },
        }),
        'PATCH /api/user-workout-exercises/reschedule-user-workout',
      );

      const moved = await dbOne<{ scheduled_at: string }>(
        `SELECT scheduled_at::text AS scheduled_at FROM public.user_workouts WHERE id=$1`,
        [userWorkoutId],
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

  test('NEGATIVE: user nem módosíthat másik user workoutját', async ({ page }) => {
    await login(page, 'user');
    const api = await apiFor(page);
    await rejected(
      await api.patch('/api/user-workout-exercises/reschedule-user-workout', {
        data: { userWorkoutId: 2147483002, scheduledAt: '2035-05-01' },
      }),
      'PATCH foreign/missing user workout',
    );
    await api.dispose();
  });
});
