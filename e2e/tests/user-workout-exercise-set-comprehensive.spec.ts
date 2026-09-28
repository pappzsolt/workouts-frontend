import { expect, test } from '@playwright/test';
import {
  apiFor, assignExercise, coachUserId, createExercise, createProgram, createWorkout,
  dbOne, deleteExercise, deleteProgram, deleteWorkout, login, rejected, success, suffix
} from './e2e-next-3-helpers';

test.describe('UserWorkoutExerciseSet endpoint matrix', () => {
  test.describe.configure({ mode: 'serial' });

  test('SETS: auto-created UWE → GET sets → CREATE → UPDATE → ADD → DELETE → DB/progress', async ({ page }) => {
    await login(page, 'coach');
    const coachApi = await apiFor(page);

    const userId = await coachUserId();
    const programId = await createProgram(coachApi, `E2E SET PROGRAM ${suffix()}`);
    const workoutId = await createWorkout(coachApi, `E2E SET WORKOUT ${suffix()}`);
    const exerciseId = await createExercise(coachApi, `E2E SET EXERCISE ${suffix()}`);
    let userWorkoutExerciseId = 0;

    try {
      await assignExercise(coachApi, workoutId, exerciseId);

      await success(await coachApi.post('/api/programs/assign', {
        data: { userId, programId },
      }), 'POST /api/programs/assign');

      const pw = await success(await coachApi.post('/api/program-workouts/add', {
        data: { programId, workoutId, dayIndex: 1 },
      }), 'POST /api/program-workouts/add');

      const programWorkoutId = Number(pw.data?.id);
      expect(programWorkoutId).toBeGreaterThan(0);

      const uw = await dbOne<{ id: number }>(
        `SELECT id FROM public.user_workouts
          WHERE user_id=$1 AND program_id=$2 AND workout_id=$3
          ORDER BY id DESC LIMIT 1`,
        [userId, programId, workoutId],
      );
      expect(uw).not.toBeNull();
      const userWorkoutId = Number(uw!.id);

      const uwe = await dbOne<{ id: number; workout_exercise_id: number }>(
        `SELECT id, workout_exercise_id
           FROM public.user_workout_exercises
          WHERE user_workout_id=$1
            AND workout_exercise_id IN (
              SELECT id FROM public.workout_exercises
               WHERE workout_id=$2 AND exercise_id=$3
            )
          ORDER BY id DESC LIMIT 1`,
        [userWorkoutId, workoutId, exerciseId],
      );
      expect(uwe).not.toBeNull();
      userWorkoutExerciseId = Number(uwe!.id);

      const initial = await success(
        await coachApi.get(`/api/user-workout-exercise-sets/${userWorkoutExerciseId}`),
        'GET /api/user-workout-exercise-sets/{userWorkoutExerciseId}',
      );
      expect(Array.isArray(initial.data)).toBeTruthy();
      expect(initial.data.length).toBeGreaterThan(0);

      const beforeCount = await dbOne<{ count: string }>(
        `SELECT count(*)::text AS count FROM public.user_workout_exercise_sets WHERE user_workout_exercise_id=$1`,
        [userWorkoutExerciseId],
      );
      const createBody = await success(
        await coachApi.post('/api/user-workout-exercise-sets/create', {
          data: {
            userWorkoutId,
            workoutExerciseId: Number(uwe!.workout_exercise_id),
            sets: [
              { setNumber: 99, targetRepetitions: 12, targetWeightKg: 20.5 }
            ],
          },
        }),
        'POST /api/user-workout-exercise-sets/create',
      );
      expect(Number(createBody.data)).toBe(userWorkoutExerciseId);

      const createdSet = await dbOne<{ id: number; target_repetitions: number; target_weight_kg: string }>(
        `SELECT id, target_repetitions, target_weight_kg
           FROM public.user_workout_exercise_sets
          WHERE user_workout_exercise_id=$1 AND set_number=99`,
        [userWorkoutExerciseId],
      );
      expect(createdSet).not.toBeNull();
      const setId = Number(createdSet!.id);
      expect(Number(createdSet!.target_repetitions)).toBe(12);
      expect(Number(createdSet!.target_weight_kg)).toBe(20.5);
      expect(Number(beforeCount?.count)).toBeGreaterThan(0);

      await success(
        await coachApi.put(`/api/user-workout-exercise-sets/${setId}`, {
          data: {
            setNumber: 99,
            targetRepetitions: 10,
            targetWeightKg: 22.5,
            actualRepetitions: 10,
            actualWeightKg: 22.5,
            completed: true,
            notes: 'E2E SET UPDATE',
          },
        }),
        'PUT /api/user-workout-exercise-sets/{id}',
      );

      const updated = await dbOne<any>(
        `SELECT target_repetitions, target_weight_kg, actual_repetitions,
                actual_weight_kg, completed, completed_at, notes
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

      const added = await success(
        await coachApi.post(`/api/user-workout-exercise-sets/${userWorkoutExerciseId}/add`),
        'POST /api/user-workout-exercise-sets/{id}/add',
      );
      const addedSetId = Number(added.data);
      expect(addedSetId).toBeGreaterThan(0);
      expect(await dbOne<{ count: string }>(
        `SELECT count(*)::text AS count FROM public.user_workout_exercise_sets
          WHERE id=$1 AND user_workout_exercise_id=$2`,
        [addedSetId, userWorkoutExerciseId],
      ).then(r => Number(r?.count))).toBe(1);

      await success(
        await coachApi.delete(`/api/user-workout-exercise-sets/${addedSetId}`),
        'DELETE /api/user-workout-exercise-sets/{id}',
      );
      expect(await dbOne<{ count: string }>(
        `SELECT count(*)::text AS count FROM public.user_workout_exercise_sets WHERE id=$1`,
        [addedSetId],
      ).then(r => Number(r?.count))).toBe(0);

      const finalSets = await success(
        await coachApi.get(`/api/user-workout-exercise-sets/${userWorkoutExerciseId}`),
        'GET sets after update/add/delete',
      );
      expect(finalSets.data.some((x: any) => Number(x.id) === setId)).toBeTruthy();
    } finally {
      await deleteProgram(coachApi, programId);
      await deleteExercise(coachApi, exerciseId);
      await deleteWorkout(coachApi, workoutId);
      await coachApi.dispose();
    }
  });

  test('NEGATIVE: hibás workoutExercise nem hozható létre másik workout user workoutjához', async ({ page }) => {
    await login(page, 'user');
    const api = await apiFor(page);
    await rejected(
      await api.post('/api/user-workout-exercise-sets/create', {
        data: {
          userWorkoutId: 2147483001,
          workoutExerciseId: 2147483002,
          sets: [{ setNumber: 1, targetRepetitions: 10, targetWeightKg: null }],
        },
      }),
      'POST invalid user-workout-exercise set context',
    );
    await api.dispose();
  });
});
