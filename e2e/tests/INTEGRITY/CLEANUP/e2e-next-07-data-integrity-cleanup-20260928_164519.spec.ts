import { test, expect } from '@playwright/test';
import { apiFor, dbOne, dbCount, currentUserId, coachUserId, login, success, rejected, createProgram, createWorkout, createExercise, assignExercise, deleteProgram, deleteWorkout, deleteExercise, suffix, LANGUAGE } from '../../helpers/e2e-next-3-helpers';


test('DATA INTEGRITY: created program/workout/exercise relation is removed through application APIs', async ({ page }) => {
  await login(page, 'coach');
  const api = await apiFor(page);
  const programId = await createProgram(api);
  const workoutId = await createWorkout(api);
  const exerciseId = await createExercise(api);

  try {
    await assignExercise(api, workoutId, exerciseId);

    expect(await dbCount(
      `SELECT COUNT(*)::text AS count FROM public.workout_exercises WHERE workout_id=$1 AND exercise_id=$2`,
      [workoutId, exerciseId])).toBe(1);

    expect(await dbCount(`SELECT COUNT(*)::text AS count FROM public.workouts WHERE id=$1`, [workoutId])).toBe(1);
    expect(await dbCount(`SELECT COUNT(*)::text AS count FROM public.exercises WHERE id=$1`, [exerciseId])).toBe(1);
    expect(await dbCount(`SELECT COUNT(*)::text AS count FROM public.programs WHERE id=$1`, [programId])).toBe(1);
  } finally {
    await deleteWorkout(api, workoutId);
    await deleteExercise(api, exerciseId);
    await deleteProgram(api, programId);
  }

  expect(await dbCount(`SELECT COUNT(*)::text AS count FROM public.workout_exercises WHERE workout_id=$1 OR exercise_id=$2`, [workoutId, exerciseId])).toBe(0);
  expect(await dbCount(`SELECT COUNT(*)::text AS count FROM public.workouts WHERE id=$1`, [workoutId])).toBe(0);
  expect(await dbCount(`SELECT COUNT(*)::text AS count FROM public.exercises WHERE id=$1`, [exerciseId])).toBe(0);
  expect(await dbCount(`SELECT COUNT(*)::text AS count FROM public.programs WHERE id=$1`, [programId])).toBe(0);
});
