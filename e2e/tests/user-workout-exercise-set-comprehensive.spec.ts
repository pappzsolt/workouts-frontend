import { expect, test } from '@playwright/test';
import {
  apiFor, anotherUserId, assignExercise, coachUserId, createExercise, createProgram,
  createWorkout, dbCount, dbOne, deleteExercise, deleteProgram, deleteWorkout, login,
  rejected, success, suffix,
} from './e2e-next-3-helpers';

test.describe('UserWorkoutExerciseSet endpoint matrix', () => {
  test.describe.configure({ mode: 'serial' });

  test('SETS: auto-created UWE → GET → CREATE → UPDATE completed/progress → ADD → DELETE → DB', async ({ page }) => {
    await login(page, 'coach');
    const coachApi = await apiFor(page);
    const userId = await coachUserId();
    const programId = await createProgram(coachApi, `E2E SET PROGRAM ${suffix()}`);
    const workoutId = await createWorkout(coachApi, `E2E SET WORKOUT ${suffix()}`);
    const exerciseId = await createExercise(coachApi, `E2E SET EXERCISE ${suffix()}`);
    let userWorkoutExerciseId = 0;

    try {
      await assignExercise(coachApi, workoutId, exerciseId);
      await success(await coachApi.post('/api/programs/assign', { data: { userId, programId } }), 'POST /api/programs/assign');
      const pw = await success(await coachApi.post('/api/program-workouts/add', { data: { programId, workoutId, dayIndex: 1 } }), 'POST /api/program-workouts/add');
      const programWorkoutId = Number(pw.data?.id);
      expect(programWorkoutId).toBeGreaterThan(0);

      const uw = await dbOne<{ id: number }>(
        `SELECT id FROM public.user_workouts WHERE user_id=$1 AND program_workout_id=$2 ORDER BY id DESC LIMIT 1`,
        [userId, programWorkoutId],
      );
      expect(uw).not.toBeNull();
      const userWorkoutId = Number(uw!.id);

      const uwe = await dbOne<{ id: number; workout_exercise_id: number }>(
        `SELECT id, workout_exercise_id FROM public.user_workout_exercises
          WHERE user_workout_id=$1 AND workout_exercise_id IN
            (SELECT id FROM public.workout_exercises WHERE workout_id=$2 AND exercise_id=$3)
          ORDER BY id DESC LIMIT 1`,
        [userWorkoutId, workoutId, exerciseId],
      );
      expect(uwe).not.toBeNull();
      userWorkoutExerciseId = Number(uwe!.id);

      const initial = await success(await coachApi.get(`/api/user-workout-exercise-sets/${userWorkoutExerciseId}`), 'GET sets');
      expect(Array.isArray(initial.data)).toBeTruthy();
      expect(initial.data.length).toBeGreaterThan(0);

      const beforeCount = await dbCount(`SELECT count(*)::text AS count FROM public.user_workout_exercise_sets WHERE user_workout_exercise_id=$1`, [userWorkoutExerciseId]);
      const created = await success(await coachApi.post('/api/user-workout-exercise-sets/create', {
        data: { userWorkoutId, workoutExerciseId: Number(uwe!.workout_exercise_id), sets: [{ setNumber: 99, targetRepetitions: 12, targetWeightKg: 20.5 }] },
      }), 'POST /api/user-workout-exercise-sets/create');
      expect(Number(created.data)).toBe(userWorkoutExerciseId);

      const set = await dbOne<{ id: number; target_repetitions: number; target_weight_kg: string; completed: boolean }>(
        `SELECT id, target_repetitions, target_weight_kg, completed FROM public.user_workout_exercise_sets WHERE user_workout_exercise_id=$1 AND set_number=99`,
        [userWorkoutExerciseId],
      );
      expect(set).not.toBeNull();
      const setId = Number(set!.id);
      expect(Number(set!.target_repetitions)).toBe(12);
      expect(Number(set!.target_weight_kg)).toBe(20.5);
      expect(set!.completed).toBe(false);
      expect(beforeCount).toBeGreaterThan(0);

      await success(await coachApi.put(`/api/user-workout-exercise-sets/${setId}`, {
        data: { setNumber: 99, targetRepetitions: 10, targetWeightKg: 22.5, actualRepetitions: 10, actualWeightKg: 22.5, completed: true, notes: 'E2E SET UPDATE' },
      }), 'PUT set completed=true');

      const updated = await dbOne<any>(
        `SELECT target_repetitions, target_weight_kg, actual_repetitions, actual_weight_kg, completed, completed_at, notes
           FROM public.user_workout_exercise_sets WHERE id=$1`,
        [setId],
      );
      expect(Number(updated?.target_repetitions)).toBe(10);
      expect(Number(updated?.target_weight_kg)).toBe(22.5);
      expect(Number(updated?.actual_repetitions)).toBe(10);
      expect(Number(updated?.actual_weight_kg)).toBe(22.5);
      expect(updated?.completed).toBe(true);
      expect(updated?.completed_at).not.toBeNull();
      expect(updated?.notes).toBe('E2E SET UPDATE');

      const progress = await dbOne<{ exercise_completed: boolean; sets_done: number }>(
        `SELECT completed AS exercise_completed, sets_done FROM public.user_workout_exercises WHERE id=$1`,
        [userWorkoutExerciseId],
      );
      expect(progress).not.toBeNull();
      expect(Number(progress!.sets_done)).toBeGreaterThanOrEqual(1);

      const added = await success(await coachApi.post(`/api/user-workout-exercise-sets/${userWorkoutExerciseId}/add`), 'POST add set');
      const addedSetId = Number(added.data);
      expect(addedSetId).toBeGreaterThan(0);
      expect(await dbCount(`SELECT count(*)::text AS count FROM public.user_workout_exercise_sets WHERE id=$1 AND user_workout_exercise_id=$2`, [addedSetId, userWorkoutExerciseId])).toBe(1);

      await success(await coachApi.delete(`/api/user-workout-exercise-sets/${addedSetId}`), 'DELETE set');
      expect(await dbCount(`SELECT count(*)::text AS count FROM public.user_workout_exercise_sets WHERE id=$1`, [addedSetId])).toBe(0);

      const finalSets = await success(await coachApi.get(`/api/user-workout-exercise-sets/${userWorkoutExerciseId}`), 'GET final sets');
      expect(finalSets.data.some((x: any) => Number(x.id) === setId)).toBeTruthy();

      // A completed/actual set szándékosan történeti USER_WORKOUT állapotot hoz létre.
      // A backend ezt nem engedi programtörléskor törölni. Cleanup előtt ugyanazon API
      // kontrakton keresztül visszaállítjuk a fixture-t nem megkezdett állapotba.
      await success(await coachApi.put(`/api/user-workout-exercise-sets/${setId}`, {
        data: {
          completed: false,
          clearActualRepetitions: true,
          clearActualWeightKg: true,
          clearNotes: true,
        },
      }), 'PUT set reset for cleanup');

      const cleanupState = await dbOne<{
        completed: boolean;
        completed_at: string | null;
        actual_repetitions: number | null;
        actual_weight_kg: string | null;
        notes: string | null;
      }>(
        `SELECT completed, completed_at, actual_repetitions, actual_weight_kg, notes
           FROM public.user_workout_exercise_sets
          WHERE id=$1`,
        [setId],
      );
      expect(cleanupState?.completed).toBe(false);
      expect(cleanupState?.completed_at).toBeNull();
      expect(cleanupState?.actual_repetitions).toBeNull();
      expect(cleanupState?.actual_weight_kg).toBeNull();
      expect(cleanupState?.notes).toBeNull();
    } finally {
      await deleteProgram(coachApi, programId);
      await deleteExercise(coachApi, exerciseId);
      await deleteWorkout(coachApi, workoutId);
      await coachApi.dispose();
    }
  });

  test('NEGATIVE OWNERSHIP: user nem olvashat/módosíthat/törölhet másik user setjét', async ({ page }) => {
    await login(page, 'coach');
    const coachApi = await apiFor(page);
    const ownUserId = await coachUserId();
    const foreignUserId = await anotherUserId(ownUserId);
    const programId = await createProgram(coachApi, `E2E FOREIGN SET PROGRAM ${suffix()}`);
    const workoutId = await createWorkout(coachApi, `E2E FOREIGN SET WORKOUT ${suffix()}`);
    const exerciseId = await createExercise(coachApi, `E2E FOREIGN SET EXERCISE ${suffix()}`);

    try {
      await assignExercise(coachApi, workoutId, exerciseId);
      await success(await coachApi.post('/api/programs/assign', { data: { userId: foreignUserId, programId } }), 'assign foreign user');
      const pw = await success(await coachApi.post('/api/program-workouts/add', { data: { programId, workoutId, dayIndex: 1 } }), 'add foreign program workout');
      const programWorkoutId = Number(pw.data?.id);
      const uw = await dbOne<{ id: number }>(`SELECT id FROM public.user_workouts WHERE user_id=$1 AND program_workout_id=$2 ORDER BY id DESC LIMIT 1`, [foreignUserId, programWorkoutId]);
      expect(uw).not.toBeNull();
      const userWorkoutId = Number(uw!.id);
      const uwe = await dbOne<{ id: number }>(`SELECT id FROM public.user_workout_exercises WHERE user_workout_id=$1 ORDER BY id DESC LIMIT 1`, [userWorkoutId]);
      expect(uwe).not.toBeNull();
      const userWorkoutExerciseId = Number(uwe!.id);
      const set = await dbOne<{ id: number; completed: boolean }>(`SELECT id, completed FROM public.user_workout_exercise_sets WHERE user_workout_exercise_id=$1 ORDER BY id DESC LIMIT 1`, [userWorkoutExerciseId]);
      expect(set).not.toBeNull();
      const setId = Number(set!.id);

      await coachApi.dispose();
      await login(page, 'user');
      const userApi = await apiFor(page);

      await rejected(await userApi.get(`/api/user-workout-exercise-sets/${userWorkoutExerciseId}`), 'GET foreign user set');
      await rejected(await userApi.put(`/api/user-workout-exercise-sets/${setId}`, {
        data: { setNumber: 1, targetRepetitions: 999, targetWeightKg: 99, actualRepetitions: null, actualWeightKg: null, completed: true, notes: 'MUST NOT UPDATE' },
      }), 'PUT foreign user set');
      await rejected(await userApi.delete(`/api/user-workout-exercise-sets/${setId}`), 'DELETE foreign user set');

      const after = await dbOne<{ completed: boolean; notes: string | null }>(`SELECT completed, notes FROM public.user_workout_exercise_sets WHERE id=$1`, [setId]);
      expect(after?.completed).toBe(set!.completed);
      expect(after?.notes).not.toBe('MUST NOT UPDATE');
      await userApi.dispose();
    } finally {
      await login(page, 'coach');
      const cleanup = await apiFor(page);
      await deleteProgram(cleanup, programId);
      await deleteExercise(cleanup, exerciseId);
      await deleteWorkout(cleanup, workoutId);
      await cleanup.dispose();
    }
  });
});
