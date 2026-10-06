import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { expect, test } from '@playwright/test';
import {
  apiFor,
  coachUserId,
  dbOne,
  login,
  rejected,
  success,
} from '../../helpers/e2e-next-3-helpers';

const LANGUAGE = 'hu';

test.describe('User - Program Statistics endpoint matrix', () => {

  test('STATISTICS: program + workout activity + exercise strength progress + response contract', async ({
    page,
  }) => {
    await login(page, 'user');
    const api = await apiFor(page);

    try {
      const programStats = await success(
        await api.get(`${API_ENDPOINTS.statistics.userProgram}?language=${LANGUAGE}`),
        'GET /api/user/program-statistics',
      );

      expect(programStats.data).toBeTruthy();
      expect(Number(programStats.data.totalPrograms)).toBeGreaterThanOrEqual(0);
      expect(Number(programStats.data.completedPrograms)).toBeGreaterThanOrEqual(0);
      expect(Array.isArray(programStats.data.programs)).toBeTruthy();
      expect(Number(programStats.data.completedPrograms)).toBeLessThanOrEqual(
        Number(programStats.data.totalPrograms),
      );

      for (const program of programStats.data.programs) {
        expect(Number(program.programId)).toBeGreaterThan(0);
        expect(typeof program.programName).toBe('string');
        expect(Number(program.totalWorkouts)).toBeGreaterThanOrEqual(0);
        expect(Number(program.completedWorkouts)).toBeGreaterThanOrEqual(0);
        expect(Number(program.incompleteWorkouts)).toBeGreaterThanOrEqual(0);

        expect(Number(program.completedWorkouts)).toBeLessThanOrEqual(
          Number(program.totalWorkouts),
        );

        expect(Number(program.incompleteWorkouts)).toBeLessThanOrEqual(
          Number(program.totalWorkouts),
        );

        expect(Boolean(program.completed)).toBe(
          Number(program.totalWorkouts) > 0 &&
            Number(program.completedWorkouts) === Number(program.totalWorkouts),
        );
      }

      const activity = await success(
        await api.get(
          `${API_ENDPOINTS.statistics.userProgramWorkouts}?from=2035-01-01&to=2035-12-31`,
        ),
        'GET /api/user/program-statistics/workouts',
      );

      expect(activity.data).toBeTruthy();
      expect(Array.isArray(activity.data.weeklyActivity)).toBeTruthy();
      expect(Array.isArray(activity.data.monthlyActivity)).toBeTruthy();
      expect(activity.data.weeklyVolume).toBeTruthy();

      for (const item of [...activity.data.weeklyActivity, ...activity.data.monthlyActivity]) {
        expect(item.periodStart).toBeTruthy();
        expect(item.periodEnd).toBeTruthy();
        expect(Number(item.workoutCount)).toBeGreaterThanOrEqual(0);
        expect(Number(item.activeDays)).toBeGreaterThanOrEqual(0);
        expect(Number(item.completedSets)).toBeGreaterThanOrEqual(0);
        expect(Number(item.totalVolume)).toBeGreaterThanOrEqual(0);
      }

      expect(activity.data.weeklyVolume.currentWeekVolume).toBeDefined();
      expect(activity.data.weeklyVolume.previousWeekVolume).toBeDefined();
      expect(activity.data.weeklyVolume.percentageChange).toBeDefined();

      const userId = await coachUserId();

      const exercise = await dbOne<{ exercise_id: number }>(
        `SELECT uwe.workout_exercise_id AS exercise_id
         FROM public.user_workout_exercises uwe
                JOIN public.user_workouts uw ON uw.id = uwe.user_workout_id
         WHERE uw.user_id = $1
         ORDER BY uwe.id
           LIMIT 1`,
        [userId],
      );

      if (!exercise) {
        throw new Error(
          'A strength-progress E2E teszthez a teszt usernek legalább egy user_workout_exercise rekorddal kell rendelkeznie.',
        );
      }

      const workoutExercise = await dbOne<{ exercise_id: number }>(
        `SELECT exercise_id
         FROM public.workout_exercises
         WHERE id = $1`,
        [Number(exercise.exercise_id)],
      );

      expect(workoutExercise).not.toBeNull();

      const exerciseId = Number(workoutExercise!.exercise_id);

      expect(exerciseId).toBeGreaterThan(0);

      const strength = await success(
        await api.get(
          `${API_ENDPOINTS.statistics.userExerciseStrength(exerciseId)}?from=2035-01-01&to=2035-12-31&language=${LANGUAGE}`,
        ),
        'GET /api/user/program-statistics/exercises/{exerciseId}/strength-progress',
      );

      expect(Array.isArray(strength.data)).toBeTruthy();

      for (const row of strength.data) {
        expect(Number(row.exerciseId)).toBe(exerciseId);
        expect(typeof row.exerciseName).toBe('string');
        expect(row.performedAt).toBeTruthy();
        expect(Number(row.bestWeightKg)).toBeGreaterThanOrEqual(0);
        expect(Number(row.repetitions)).toBeGreaterThan(0);
        expect(Number(row.estimatedOneRepMax)).toBeGreaterThanOrEqual(0);
      }
    } finally {
      await api.dispose();
    }
  });

  test('NEGATIVE VALIDATION + ROLE: fordított dátumtartomány és coach hozzáférés elutasítva', async ({
    page,
  }) => {
    await login(page, 'user');
    const userApi = await apiFor(page);

    try {
      await rejected(
        await userApi.get(
          `${API_ENDPOINTS.statistics.userProgramWorkouts}?from=2035-12-31&to=2035-01-01`,
        ),
        'GET workouts invalid date range', 400,
      );

      await rejected(
        await userApi.get(
          `${API_ENDPOINTS.statistics.userExerciseStrength(0)}?from=2035-01-01&to=2035-12-31&language=${LANGUAGE}`,
        ),
        'GET strength progress invalid exercise id', 400,
      );
    } finally {
      await userApi.dispose();
    }

    await login(page, 'coach');
    const coachApi = await apiFor(page);

    try {
      await rejected(
        await coachApi.get(`${API_ENDPOINTS.statistics.userProgram}?language=${LANGUAGE}`),
        'GET program statistics as coach', 403,
      );

      await rejected(
        await coachApi.get(
          `${API_ENDPOINTS.statistics.userProgramWorkouts}?from=2035-01-01&to=2035-12-31`,
        ),
        'GET workout statistics as coach', 403,
      );
    } finally {
      await coachApi.dispose();
    }
  });
});
