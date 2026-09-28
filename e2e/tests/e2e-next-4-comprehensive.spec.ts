import { expect, test } from '@playwright/test';
import {
  apiFor,
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
} from './e2e-next-3-helpers';

/**
 * Next E2E block – endpoint coverage that was not covered by the previous
 * comprehensive suites.
 *
 * No test weakens an assertion to accommodate a backend failure. Every
 * successful endpoint is verified through its response and PostgreSQL state.
 */
test.describe('E2E NEXT 4 - remaining core endpoint matrix', () => {
  test.describe.configure({ mode: 'serial' });

  test('USER PROGRAM READ: my → all → assigned-programs → progress → DB', async ({ page }) => {
    await login(page, 'coach');
    const coachApi = await apiFor(page);
    const userId = await coachUserId();

    const programId = await createProgram(coachApi, `E2E NEXT4 READ PROGRAM ${suffix()}`);
    const workoutId = await createWorkout(coachApi, `E2E NEXT4 READ WORKOUT ${suffix()}`);
    let relationId = 0;

    try {
      await success(
        await coachApi.post('/api/programs/assign', {
          data: { userId, programId },
        }),
        'POST /api/programs/assign',
      );

      const relation = await success(
        await coachApi.post('/api/program-workouts/add', {
          data: { programId, workoutId, dayIndex: 1 },
        }),
        'POST /api/program-workouts/add',
      );
      relationId = Number(relation.data?.id);
      expect(relationId).toBeGreaterThan(0);

      await login(page, 'user');
      const userApi = await apiFor(page);

      const myPrograms = await success(
        await userApi.get(`/api/programs/my?language=hu`),
        'GET /api/programs/my',
      );
      expect(Array.isArray(myPrograms.data)).toBeTruthy();
      expect(myPrograms.data.some((p: any) => Number(p.programId ?? p.id) === programId)).toBeTruthy();

      const allPrograms = await success(
        await userApi.get('/api/programs/all?language=hu'),
        'GET /api/programs/all',
      );
      expect(Array.isArray(allPrograms.data)).toBeTruthy();
      expect(allPrograms.data.some((p: any) => Number(p.programId ?? p.id) === programId)).toBeTruthy();

      const assigned = await success(
        await userApi.get('/api/programs/my/assigned-programs?language=hu'),
        'GET /api/programs/my/assigned-programs',
      );
      expect(Array.isArray(assigned.data)).toBeTruthy();
      expect(assigned.data.some((p: any) => Number(p.programId ?? p.id) === programId)).toBeTruthy();

      const progress = await success(
        await userApi.get(`/api/programs/my/assigned-programs/progress?programIds=${programId}`),
        'GET /api/programs/my/assigned-programs/progress',
      );
      expect(Array.isArray(progress.data)).toBeTruthy();
      expect(progress.data).toHaveLength(1);
      expect(Number(progress.data[0].programId)).toBe(programId);
      expect(Number(progress.data[0].totalWorkouts)).toBe(1);
      expect(Number(progress.data[0].completedWorkouts)).toBe(0);
      expect(Number(progress.data[0].progressPercent)).toBe(0);

      const dbAssignment = await dbOne<{ status: string; count: string }>(
        `SELECT max(status) AS status, count(*)::text AS count
           FROM public.user_programs
          WHERE user_id=$1 AND program_id=$2`,
        [userId, programId],
      );
      expect(Number(dbAssignment?.count)).toBe(1);
      expect(dbAssignment?.status).toBe('assigned');

      await userApi.dispose();
    } finally {
      await login(page, 'coach');
      const cleanupApi = await apiFor(page);
      if (relationId > 0) {
        await success(
          await cleanupApi.delete(`/api/program-workouts/id/${relationId}`),
          'cleanup DELETE /api/program-workouts/id/{id}',
        );
      }
      await deleteProgram(cleanupApi, programId);
      await deleteWorkout(cleanupApi, workoutId);
      await cleanupApi.dispose();
      await coachApi.dispose();
    }
  });

  test('USER PROGRAM DELETE: user törli a saját hozzárendelését, a program törzsadata megmarad', async ({ page }) => {
    await login(page, 'coach');
    const coachApi = await apiFor(page);
    const userId = await coachUserId();
    const programId = await createProgram(coachApi, `E2E NEXT4 DELETE PROGRAM ${suffix()}`);

    try {
      await success(
        await coachApi.post('/api/programs/assign', {
          data: { userId, programId },
        }),
        'POST /api/programs/assign',
      );

      expect(
        await dbCount(
          `SELECT count(*)::text AS count FROM public.user_programs WHERE user_id=$1 AND program_id=$2`,
          [userId, programId],
        ),
      ).toBe(1);

      await login(page, 'user');
      const userApi = await apiFor(page);

      await success(
        await userApi.delete(`/api/programs/my/${programId}`),
        'DELETE /api/programs/my/{id}',
      );

      expect(
        await dbCount(
          `SELECT count(*)::text AS count FROM public.user_programs WHERE user_id=$1 AND program_id=$2`,
          [userId, programId],
        ),
      ).toBe(0);

      // A törlés után a USER már nem jogosult a program lekérésére.
      // Ezt külön ellenőrizzük, majd COACH kontextusban igazoljuk, hogy
      // maga a PROGRAM rekord valóban megmaradt.
      await rejected(
        await userApi.get(`/api/programs/${programId}?language=hu`),
        'GET /api/programs/{id} after user delete must be forbidden for USER',
      );

      const program = await success(
        await coachApi.get(`/api/programs/${programId}?language=hu`),
        'GET /api/programs/{id} after user delete as COACH',
      );
      expect(Number(program.data?.programId ?? program.data?.id)).toBe(programId);

      expect(
        await dbCount(
          `SELECT count(*)::text AS count FROM public.programs WHERE id=$1`,
          [programId],
        ),
      ).toBe(1);

      await userApi.dispose();
    } finally {
      await login(page, 'coach');
      const cleanupApi = await apiFor(page);
      await deleteProgram(cleanupApi, programId);
      await cleanupApi.dispose();
      await coachApi.dispose();
    }
  });

  test('USER EXERCISE COMPLETION: user-workout exercise GET → set-completed → PostgreSQL', async ({ page }) => {
    await login(page, 'coach');
    const coachApi = await apiFor(page);
    const userId = await coachUserId();

    const programId = await createProgram(coachApi, `E2E NEXT4 COMPLETION PROGRAM ${suffix()}`);
    const workoutId = await createWorkout(coachApi, `E2E NEXT4 COMPLETION WORKOUT ${suffix()}`);
    const exerciseId = await createExercise(coachApi, `E2E NEXT4 COMPLETION EXERCISE ${suffix()}`);
    let relationId = 0;

    try {
      await success(
        await coachApi.post('/api/programs/assign', {
          data: { userId, programId },
        }),
        'POST /api/programs/assign',
      );

      await success(
        await coachApi.post('/api/workout-exercises/assign', {
          params: { workoutId, exerciseId },
        }),
        'POST /api/workout-exercises/assign',
      );

      const relation = await success(
        await coachApi.post('/api/program-workouts/add', {
          data: { programId, workoutId, dayIndex: 1 },
        }),
        'POST /api/program-workouts/add',
      );
      relationId = Number(relation.data?.id);
      expect(relationId).toBeGreaterThan(0);

      const userWorkout = await dbOne<{ id: number }>(
        `SELECT id FROM public.user_workouts
          WHERE user_id=$1 AND program_id=$2 AND program_workout_id=$3
          ORDER BY id DESC LIMIT 1`,
        [userId, programId, relationId],
      );
      expect(userWorkout).not.toBeNull();
      const userWorkoutId = Number(userWorkout!.id);

      const userWorkoutExercise = await dbOne<{ id: number }>(
        `SELECT uwe.id
           FROM public.user_workout_exercises uwe
           JOIN public.workout_exercises we ON we.id=uwe.workout_exercise_id
          WHERE uwe.user_workout_id=$1 AND we.exercise_id=$2
          LIMIT 1`,
        [userWorkoutId, exerciseId],
      );
      expect(userWorkoutExercise).not.toBeNull();

      const set = await dbOne<{ id: number }>(
        `SELECT id
           FROM public.user_workout_exercise_sets
          WHERE user_workout_exercise_id=$1
          ORDER BY set_number
          LIMIT 1`,
        [Number(userWorkoutExercise!.id)],
      );
      expect(set).not.toBeNull();
      const setId = Number(set!.id);

      await login(page, 'user');
      const userApi = await apiFor(page);

      const workoutView = await success(
        await userApi.get(`/api/exercises/my-workout/user-workout/${userWorkoutId}?language=hu`),
        'GET /api/exercises/my-workout/user-workout/{userWorkoutId}',
      );
      expect(workoutView.data).toBeTruthy();

      await success(
        await userApi.patch('/api/exercises/set-completed', {
          data: {
            userWorkoutId,
            programId,
            workoutId,
            exerciseId,
            setId,
            completed: true,
            actualRepetitions: 10,
            actualWeightKg: 50,
            notes: 'E2E NEXT4 completion',
          },
        }),
        'PATCH /api/exercises/set-completed',
      );

      const updatedSet = await dbOne<{
        completed: boolean;
        actual_repetitions: number;
        actual_weight_kg: string;
        notes: string;
        completed_at: string | null;
      }>(
        `SELECT completed, actual_repetitions, actual_weight_kg, notes, completed_at
           FROM public.user_workout_exercise_sets
          WHERE id=$1`,
        [setId],
      );
      expect(updatedSet?.completed).toBe(true);
      expect(Number(updatedSet?.actual_repetitions)).toBe(10);
      expect(Number(updatedSet?.actual_weight_kg)).toBe(50);
      expect(updatedSet?.notes).toBe('E2E NEXT4 completion');
      expect(updatedSet?.completed_at).not.toBeNull();

      await userApi.dispose();
    } finally {
      /*
       * A set-completed call creates performed USER_WORKOUT history.
       * ProgramWorkoutService deliberately blocks deletion of an occurrence
       * while such USER_WORKOUT rows still reference it (FK/history
       * preservation). Therefore cleanup must first use the real USER
       * program-delete flow, which removes the user's own execution data
       * transactionally. Only then can the coach delete the occurrence.
       */
      await login(page, 'user');
      const userCleanupApi = await apiFor(page);

      const assignmentExists = await dbCount(
        `SELECT count(*)::text AS count
           FROM public.user_programs
          WHERE user_id=$1 AND program_id=$2`,
        [userId, programId],
      );

      if (assignmentExists === 1) {
        await success(
          await userCleanupApi.delete(`/api/programs/my/${programId}`),
          'cleanup DELETE /api/programs/my/{id}',
        );
      }

      await userCleanupApi.dispose();

      await login(page, 'coach');
      const cleanupApi = await apiFor(page);

      if (relationId > 0) {
        await success(
          await cleanupApi.delete(`/api/program-workouts/id/${relationId}`),
          'cleanup DELETE /api/program-workouts/id/{id}',
        );
      }

      await deleteProgram(cleanupApi, programId);

      /*
       * Az exercise még workout_exercises kapcsolaton keresztül a
       * teszt-workouthoz tartozik. A backend ExerciseService ezt
       * szándékosan nem engedi törölni, amíg ilyen kapcsolat létezik.
       *
       * Ezért a domain szerinti helyes cleanup sorrend:
       *   1. workout törlése -> workout_exercises kapcsolatok törlődnek
       *   2. exercise törlése
       */
      await deleteWorkout(cleanupApi, workoutId);
      await deleteExercise(cleanupApi, exerciseId);

      await cleanupApi.dispose();
      await coachApi.dispose();
    }
  });

  test('WORKOUT COPY: teljes workout + exercise-ek + program-workout kapcsolat + PostgreSQL', async ({ page }) => {
    await login(page, 'coach');
    const api = await apiFor(page);

    const programId = await createProgram(api, `E2E NEXT4 COPY PROGRAM ${suffix()}`);
    const sourceWorkoutId = await createWorkout(api, `E2E NEXT4 COPY SOURCE ${suffix()}`);
    const exerciseId = await createExercise(api, `E2E NEXT4 COPY EXERCISE ${suffix()}`);
    let copiedWorkoutId = 0;

    try {
      await success(
        await api.post('/api/workout-exercises/assign', {
          params: { workoutId: sourceWorkoutId, exerciseId },
        }),
        'POST /api/workout-exercises/assign source',
      );

      const copied = await success(
        await api.post('/api/workout-copy?language=hu', {
          data: {
            sourceWorkoutId,
            programId,
            workoutName: `E2E NEXT4 COPIED ${suffix()}`,
            workoutDate: '2035-03-15',
            dayIndex: 2,
          },
        }),
        'POST /api/workout-copy',
      );
      copiedWorkoutId = Number(copied.data);
      expect(copiedWorkoutId).toBeGreaterThan(0);
      expect(copiedWorkoutId).not.toBe(sourceWorkoutId);

      const copiedWorkout = await dbOne<{ id: number; workout_date: string; created_by_coach_id: number }>(
        `SELECT
             id,
             TO_CHAR(workout_date, 'YYYY-MM-DD') AS workout_date,
             created_by_coach_id
           FROM public.workouts
          WHERE id=$1`,
        [copiedWorkoutId],
      );
      expect(copiedWorkout).not.toBeNull();
      expect(copiedWorkout?.workout_date).toBe('2035-03-15');

      const copiedTranslation = await dbOne<{ name: string }>(
        `SELECT name FROM public.workout_translations WHERE workout_id=$1 AND language_id=(SELECT id FROM public.languages WHERE code='hu' LIMIT 1) LIMIT 1`,
        [copiedWorkoutId],
      );
      expect(copiedTranslation?.name).toContain('E2E NEXT4 COPIED');

      const sourceExerciseCount = await dbCount(
        `SELECT count(*)::text AS count FROM public.workout_exercises WHERE workout_id=$1`,
        [sourceWorkoutId],
      );
      const copiedExerciseCount = await dbCount(
        `SELECT count(*)::text AS count FROM public.workout_exercises WHERE workout_id=$1`,
        [copiedWorkoutId],
      );
      expect(copiedExerciseCount).toBe(sourceExerciseCount);
      expect(copiedExerciseCount).toBeGreaterThan(0);

      const copiedExercise = await dbOne<{ exercise_id: number; sets: number; repetitions: number; rest_seconds: number }>(
        `SELECT exercise_id, sets, repetitions, rest_seconds
           FROM public.workout_exercises
          WHERE workout_id=$1
          LIMIT 1`,
        [copiedWorkoutId],
      );
      const sourceExercise = await dbOne<{ exercise_id: number; sets: number; repetitions: number; rest_seconds: number }>(
        `SELECT exercise_id, sets, repetitions, rest_seconds
           FROM public.workout_exercises
          WHERE workout_id=$1
          LIMIT 1`,
        [sourceWorkoutId],
      );
      expect(copiedExercise).toEqual(sourceExercise);

      const programWorkout = await dbOne<{ program_id: number; workout_id: number; day_index: number }>(
        `SELECT program_id, workout_id, day_index
           FROM public.program_workouts
          WHERE program_id=$1 AND workout_id=$2`,
        [programId, copiedWorkoutId],
      );
      expect(Number(programWorkout?.program_id)).toBe(programId);
      expect(Number(programWorkout?.workout_id)).toBe(copiedWorkoutId);
      expect(Number(programWorkout?.day_index)).toBe(2);
    } finally {
      if (copiedWorkoutId > 0) {
        const left = await dbCount(
          `SELECT count(*)::text AS count FROM public.program_workouts WHERE workout_id=$1`,
          [copiedWorkoutId],
        );
        if (left > 0) {
          await success(
            await api.delete(`/api/program-workouts/${programId}/${copiedWorkoutId}`),
            'cleanup copied program-workout',
          );
        }
      }
      await deleteProgram(api, programId);

      /*
       * Az exercise-t a SOURCE és a COPIED workout is használhatja.
       * Az ExerciseService helyesen megtagadja az exercise törlését,
       * amíg bármely workout_exercises kapcsolat létezik.
       *
       * Ezért a cleanup sorrendje kötelező:
       *   1. copied workout törlése
       *   2. source workout törlése
       *   3. exercise törlése
       *
       * Így nem kerül meg a backend domain szabálya, hanem a teszt
       * a valós törlési függőségi sorrendet követi.
       */
      if (copiedWorkoutId > 0) {
        await deleteWorkout(api, copiedWorkoutId);
      }

      await deleteWorkout(api, sourceWorkoutId);
      await deleteExercise(api, exerciseId);
      await api.dispose();
    }
  });

  test('PROGRAM CREATOR ASSIGN: /user-programs/assign létrehozza a programot és a user_programs kapcsolatot', async ({ page }) => {
    await login(page, 'coach');
    const api = await apiFor(page);
    const userId = await coachUserId();
    let programId = 0;

    try {
      const created = await success(
        await api.post('/api/user-programs/assign', {
          data: {
            userId,
            programName: `E2E NEXT4 CREATOR ASSIGN ${suffix()}`,
            programDescription: 'E2E ProgramCreator assign',
            durationDays: 30,
            startDate: '2035-04-01',
            difficultyLevel: 'intermediate',
            languageCode: 'hu',
            workouts: null,
          },
        }),
        'POST /api/user-programs/assign',
      );
      programId = Number(created.data);
      expect(programId).toBeGreaterThan(0);

      const program = await dbOne<{ id: number; coach_id: number }>(
        `SELECT id, coach_id FROM public.programs WHERE id=$1`,
        [programId],
      );
      expect(Number(program?.id)).toBe(programId);
      expect(Number(program?.coach_id)).toBeGreaterThan(0);

      const assignment = await dbOne<{ count: string; status: string }>(
        `SELECT count(*)::text AS count, max(status) AS status
           FROM public.user_programs
          WHERE user_id=$1 AND program_id=$2`,
        [userId, programId],
      );
      expect(Number(assignment?.count)).toBe(1);
      expect(assignment?.status).toBe('assigned');
    } finally {
      if (programId > 0) {
        await deleteProgram(api, programId);
      }
      await api.dispose();
    }
  });

  test('PROGRAM-WORKOUT BULK DELETE: program összes workout-kapcsolata törlődik, a workout rekordok megmaradnak', async ({ page }) => {
    await login(page, 'coach');
    const api = await apiFor(page);

    const programId = await createProgram(api, `E2E NEXT4 BULK DELETE PROGRAM ${suffix()}`);
    const workout1 = await createWorkout(api, `E2E NEXT4 BULK W1 ${suffix()}`);
    const workout2 = await createWorkout(api, `E2E NEXT4 BULK W2 ${suffix()}`);

    try {
      await success(
        await api.post('/api/program-workouts/add', {
          data: { programId, workoutId: workout1, dayIndex: 1 },
        }),
        'POST program-workout #1',
      );
      await success(
        await api.post('/api/program-workouts/add', {
          data: { programId, workoutId: workout2, dayIndex: 2 },
        }),
        'POST program-workout #2',
      );

      expect(
        await dbCount(
          `SELECT count(*)::text AS count FROM public.program_workouts WHERE program_id=$1`,
          [programId],
        ),
      ).toBe(2);

      await success(
        await api.delete(`/api/program-workouts/${programId}`),
        'DELETE /api/program-workouts/{programId}',
      );

      expect(
        await dbCount(
          `SELECT count(*)::text AS count FROM public.program_workouts WHERE program_id=$1`,
          [programId],
        ),
      ).toBe(0);

      expect(
        await dbCount(`SELECT count(*)::text AS count FROM public.workouts WHERE id=$1`, [workout1]),
      ).toBe(1);
      expect(
        await dbCount(`SELECT count(*)::text AS count FROM public.workouts WHERE id=$1`, [workout2]),
      ).toBe(1);
    } finally {
      await deleteProgram(api, programId);
      await deleteWorkout(api, workout1);
      await deleteWorkout(api, workout2);
      await api.dispose();
    }
  });
});
