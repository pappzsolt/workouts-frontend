import { expect, request, test, type APIRequestContext } from '@playwright/test';
import {
  apiFor,
  createExercise,
  createProgram,
  createWorkout,
  dbCount,
  dbOne,
  deleteExercise,
  deleteProgram,
  deleteWorkout,
  login,
  success,
  LANGUAGE,
  suffix,
  currentUserId,
  anotherCoachClientUserId,
  db,
} from '../../helpers/e2e-next-3-helpers';

const BASE_API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';

type MobileEnvelope = {
  success: boolean;
  data: any;
  message: string | null;
};

async function rawJson(response: any): Promise<MobileEnvelope> {
  const text = await response.text();
  expect(text, `HTTP ${response.status()} response body must not be empty`).not.toBe('');
  let body: MobileEnvelope;
  try {
    body = JSON.parse(text);
  } catch {
    throw new Error(`Mobile API nem JSON választ adott: HTTP ${response.status()} ${text}`);
  }
  return body;
}

async function mobileSuccess(response: any, label: string): Promise<MobileEnvelope> {
  const body = await rawJson(response);
  expect(response.ok(), `${label}: HTTP ${response.status()} ${JSON.stringify(body)}`).toBeTruthy();
  expect(body.success, `${label}: success=false`).toBeTruthy();
  return body;
}

async function mobileRejected(response: any, label: string): Promise<MobileEnvelope> {
  const body = await rawJson(response);
  expect(response.ok(), `${label}: unexpected HTTP ${response.status()}`).toBeFalsy();
  expect(body.success, `${label}: error response must have success=false`).toBeFalsy();
  return body;
}

async function unauthenticatedApi(): Promise<APIRequestContext> {
  return request.newContext({ baseURL: BASE_API_URL });
}

async function findOwnedUserWorkout(userId: number, withSets = false) {
  return dbOne<{
    id: number;
    program_id: number;
    program_workout_id: number;
    workout_id: number;
    scheduled_at: string;
    completed: boolean;
    performed_at: string | null;
  }>(
    `SELECT uw.id,
            uw.program_id,
            uw.program_workout_id,
            uw.workout_id,
            uw.scheduled_at::text AS scheduled_at,
            uw.completed,
            uw.performed_at::text AS performed_at
       FROM public.user_workouts uw
      WHERE uw.user_id = $1
        ${withSets ? `
        AND EXISTS (
          SELECT 1
            FROM public.user_workout_exercises uwe
            JOIN public.user_workout_exercise_sets s
              ON s.user_workout_exercise_id = uwe.id
           WHERE uwe.user_workout_id = uw.id
        )` : ''}
      ORDER BY uw.id DESC
      LIMIT 1`,
    [userId],
  );
}

async function findForeignUserWorkout(userId: number) {
  return dbOne<{ id: number; user_id: number }>(
    `SELECT uw.id, uw.user_id
       FROM public.user_workouts uw
      WHERE uw.user_id <> $1
      ORDER BY uw.id DESC
      LIMIT 1`,
    [userId],
  );
}

async function findForeignSet(userId: number, ownUserWorkoutId: number) {
  return dbOne<{ id: number; user_workout_id: number; user_id: number }>(
    `SELECT s.id,
            uwe.user_workout_id,
            uw.user_id
       FROM public.user_workout_exercise_sets s
       JOIN public.user_workout_exercises uwe
         ON uwe.id = s.user_workout_exercise_id
       JOIN public.user_workouts uw
         ON uw.id = uwe.user_workout_id
      WHERE uw.user_id <> $1
        AND uwe.user_workout_id <> $2
      ORDER BY s.id DESC
      LIMIT 1`,
    [userId, ownUserWorkoutId],
  );
}

async function createAssignedFixture(
  coachApi: APIRequestContext,
  userId: number,
  prefix: string,
  workoutCount = 1,
  exerciseCount = 1,
) {
  const programs: number[] = [];
  const workouts: number[] = [];
  const exercises: number[] = [];

  for (let i = 0; i < workoutCount; i++) {
    programs.push(await createProgram(coachApi, `${prefix} PROGRAM ${i + 1} ${suffix()}`));
  }

  const workoutId = await createWorkout(coachApi, `${prefix} WORKOUT ${suffix()}`);
  workouts.push(workoutId);

  for (let i = 0; i < exerciseCount; i++) {
    const exerciseId = await createExercise(coachApi, `${prefix} EXERCISE ${i + 1} ${suffix()}`);
    exercises.push(exerciseId);
    await success(
      await coachApi.post('/api/workout-exercises', {
        params: { workoutId, exerciseId },
      }),
      `assign ${prefix} exercise ${exerciseId}`,
    );
  }

  for (const programId of programs) {
    await success(
      await coachApi.post('/api/programs/assign', {
        data: { userId, programId },
      }),
      `assign ${prefix} program ${programId}`,
    );

    await success(
      await coachApi.post('/api/program-workouts', {
        data: { programId, workoutId, dayIndex: programs.indexOf(programId) + 1 },
      }),
      `add ${prefix} program-workout ${programId}`,
    );
  }

  const rows = await dbOne<{ count: string }>(
    `SELECT COUNT(*)::text AS count
       FROM public.user_workouts
      WHERE user_id = $1
        AND program_id = ANY($2::int[])`,
    [userId, programs],
  );
  expect(Number(rows?.count ?? 0)).toBeGreaterThanOrEqual(programs.length);

  return { programs, workouts, exercises, workoutId };
}

async function cleanupFixture(
  coachApi: APIRequestContext,
  fixture: { programs: number[]; workouts: number[]; exercises: number[] },
  ownerUserApi?: APIRequestContext,
) {
  for (const programId of fixture.programs) {
    // Coach program deletion intentionally preserves performed/history USER_WORKOUTs.
    // For a WRITE-test fixture, remove only the test user's execution history
    // through the real user-facing DELETE /api/programs/my/{id} endpoint first.
    // This keeps the backend history-preservation rule intact and avoids direct
    // DB mutation from the E2E test.
    const historical = await dbOne<{ count: string }>(
      `SELECT COUNT(*)::text AS count
         FROM public.user_workouts uw
        WHERE uw.program_id = $1
          AND (uw.completed = true
               OR uw.performed_at IS NOT NULL
               OR EXISTS (
                    SELECT 1
                      FROM public.user_workout_exercises uwe
                     WHERE uwe.user_workout_id = uw.id
                       AND (uwe.completed = true
                            OR uwe.sets_done > 0
                            OR EXISTS (
                                 SELECT 1
                                   FROM public.user_workout_exercise_sets s
                                  WHERE s.user_workout_exercise_id = uwe.id
                                    AND (s.completed = true
                                         OR s.started_at IS NOT NULL
                                         OR s.completed_at IS NOT NULL
                                         OR s.actual_repetitions IS NOT NULL
                                         OR s.actual_weight_kg IS NOT NULL)
                            ))
               ))`,
      [programId],
    );

    if (Number(historical?.count ?? 0) > 0) {
      expect(
        ownerUserApi,
        `Performed E2E fixture requires owner user cleanup API: program ${programId}`,
      ).toBeDefined();

      await success(
        await ownerUserApi!.delete(`/api/programs/my/${programId}`),
        `DELETE /api/programs/my/${programId} (E2E history cleanup)`,
      );
    }

    await deleteProgram(coachApi, programId);
  }

  for (const workoutId of fixture.workouts) {
    for (const exerciseId of fixture.exercises) {
      const relation = await dbOne<{ count: string }>(
        `SELECT COUNT(*)::text AS count
           FROM public.workout_exercises
          WHERE workout_id = $1
            AND exercise_id = $2`,
        [workoutId, exerciseId],
      );

      if (Number(relation?.count ?? 0) > 0) {
        const response = await coachApi.delete('/api/workout-exercises', {
          params: { workoutId, exerciseId },
        });
        expect(response.ok(), `cleanup workout-exercise ${workoutId}/${exerciseId}`).toBeTruthy();
      }
    }
  }

  for (const exerciseId of fixture.exercises) {
    await deleteExercise(coachApi, exerciseId);
  }

  for (const workoutId of fixture.workouts) {
    await deleteWorkout(coachApi, workoutId);
  }
}

test.describe('MOBILE v1 REST API – strict E2E contract', () => {
  test.describe.configure({ mode: 'serial' });

  test('SNAPSHOT: full user-scoped canonical read model + DB consistency', async ({ page }) => {
    await login(page, 'coach');
    const coachApi = await apiFor(page);
    const userId = await currentUserId();
    const fixture = await createAssignedFixture(coachApi, userId, 'MOBILE SNAPSHOT', 2, 1);

    try {
        await coachApi.dispose();
        await login(page, 'user');
        const api = await apiFor(page);
  
        const assigned = await dbOne<{ ids: number[] }>(
        `SELECT COALESCE(array_agg(program_id ORDER BY program_id), ARRAY[]::int[]) AS ids
           FROM public.user_programs
          WHERE user_id = $1
            AND status = 'assigned'`,
        [userId],
      );
      const expectedProgramIds = (assigned?.ids ?? []).map(Number);
  
      const body = await mobileSuccess(
        await api.get('/api/mobile/v1/snapshot', { params: { language: LANGUAGE } }),
        'GET /api/mobile/v1/snapshot',
      );
  
      const data = body.data;
      expect(data).toBeTruthy();
      expect(Date.parse(data.generatedAt)).not.toBeNaN();
  
      const programs = Array.isArray(data.programs) ? data.programs : [];
      const workouts = Array.isArray(data.workouts) ? data.workouts : [];
      const workoutExercises = Array.isArray(data.workoutExercises) ? data.workoutExercises : [];
      const userWorkouts = Array.isArray(data.userWorkouts) ? data.userWorkouts : [];
      const userWorkoutSets = Array.isArray(data.userWorkoutSets) ? data.userWorkoutSets : [];
      const exercises = Array.isArray(data.exercises) ? data.exercises : [];
  
      expect(programs.map((x: any) => Number(x.programId)).sort((a: number, b: number) => a - b))
        .toEqual(expectedProgramIds);
  
      if (expectedProgramIds.length === 0) {
        expect(programs).toEqual([]);
        expect(workouts).toEqual([]);
        expect(workoutExercises).toEqual([]);
        expect(userWorkouts).toEqual([]);
        expect(userWorkoutSets).toEqual([]);
        expect(exercises).toEqual([]);
        return;
      }
  
      const programIdSet = new Set(expectedProgramIds);
      for (const program of programs) {
        expect(programIdSet.has(Number(program.programId))).toBeTruthy();
        expect(typeof program.name).toBe('string');
        expect(typeof program.durationDays).toBe('number');
        expect(typeof program.progressPercent).toBe('number');
        expect(program.progressPercent).toBeGreaterThanOrEqual(0);
        expect(program.progressPercent).toBeLessThanOrEqual(100);
      }
  
      const programWorkoutIds = new Set<number>();
      for (const workout of workouts) {
        const programId = Number(workout.programId);
        expect(programIdSet.has(programId)).toBeTruthy();
        expect(Number(workout.programWorkoutId)).toBeGreaterThan(0);
        expect(programWorkoutIds.has(Number(workout.programWorkoutId))).toBeFalsy();
        programWorkoutIds.add(Number(workout.programWorkoutId));
        expect(Number(workout.workoutId)).toBeGreaterThan(0);
        expect(Number(workout.dayIndex)).toBeGreaterThanOrEqual(0);
        expect(Number(workout.orderIndex)).toBeGreaterThanOrEqual(1);
      }
  
      const userWorkoutIds = new Set<number>();
      for (const uw of userWorkouts) {
        expect(programIdSet.has(Number(uw.programId))).toBeTruthy();
        expect(Number(uw.userWorkoutId)).toBeGreaterThan(0);
        userWorkoutIds.add(Number(uw.userWorkoutId));
        expect(programWorkoutIds.has(Number(uw.programWorkoutId))).toBeTruthy();
        expect(typeof uw.status).toBe('string');
        expect(['SCHEDULED', 'IN_PROGRESS', 'COMPLETED']).toContain(uw.status);
        expect(uw.userWorkoutId).toBeTruthy();
      }
  
      for (const set of userWorkoutSets) {
        expect(userWorkoutIds.has(Number(set.userWorkoutId))).toBeTruthy();
        expect(Number(set.userWorkoutSetId)).toBeGreaterThan(0);
        expect(Number(set.userWorkoutExerciseId)).toBeGreaterThan(0);
        expect(Number(set.setNumber)).toBeGreaterThan(0);
        expect(typeof set.isRequired).toBe('boolean');
        expect(typeof set.exerciseKey).toBe('string');
        expect(set.exerciseKey).toMatch(/^exercise-\d+$/);
      }
  
      const exerciseIds = new Set<number>();
      for (const exercise of exercises) {
        const id = Number(exercise.exerciseId);
        expect(id).toBeGreaterThan(0);
        expect(exerciseIds.has(id)).toBeFalsy();
        exerciseIds.add(id);
        expect(exercise.exerciseKey).toBe(`exercise-${id}`);
        expect(Array.isArray(exercise.imageFiles)).toBeTruthy();
        expect(exercise.imageFiles.every((x: unknown) => typeof x === 'string')).toBeTruthy();
      }
  
      for (const we of workoutExercises) {
        expect(programWorkoutIds.size).toBeGreaterThan(0);
        expect(Number(we.workoutExerciseId)).toBeGreaterThan(0);
        expect(Number(we.workoutId)).toBeGreaterThan(0);
        expect(exerciseIds.has(Number(we.exerciseId))).toBeTruthy();
        expect(we.exerciseKey).toBe(`exercise-${Number(we.exerciseId)}`);
        expect(Number(we.orderIndex)).toBeGreaterThanOrEqual(0);
        expect(Number(we.targetSets)).toBeGreaterThan(0);
        expect(Number(we.targetReps)).toBeGreaterThan(0);
      }
  
      const dbUserWorkoutCount = await dbCount(
        `SELECT COUNT(*)::text AS count
           FROM public.user_workouts
          WHERE user_id = $1
            AND program_id = ANY($2::int[])`,
        [userId, expectedProgramIds],
      );
      expect(userWorkouts).toHaveLength(dbUserWorkoutCount);
  
      const dbSetCount = await dbCount(
        `SELECT COUNT(*)::text AS count
           FROM public.user_workout_exercise_sets s
           JOIN public.user_workout_exercises uwe ON uwe.id = s.user_workout_exercise_id
           JOIN public.user_workouts uw ON uw.id = uwe.user_workout_id
          WHERE uw.user_id = $1
            AND uw.program_id = ANY($2::int[])`,
        [userId, expectedProgramIds],
      );
      expect(userWorkoutSets).toHaveLength(dbSetCount);
  
      // Same workout template may occur in multiple programs; programWorkoutId
      // is the canonical discriminator and must keep the two assignments separate.
      const duplicateTemplate = await dbOne<{ workout_id: number; count: string }>(
        `SELECT workout_id, COUNT(*)::text AS count
           FROM public.program_workouts
          WHERE program_id = ANY($1::int[])
          GROUP BY workout_id
         HAVING COUNT(*) > 1
          ORDER BY COUNT(*) DESC
          LIMIT 1`,
        [expectedProgramIds],
      );
  
      if (duplicateTemplate) {
        const responseRows = workouts.filter((x: any) => Number(x.workoutId) === Number(duplicateTemplate.workout_id));
        expect(new Set(responseRows.map((x: any) => Number(x.programWorkoutId))).size)
          .toBe(responseRows.length);
      }
  
      await api.dispose();
    } finally {
      await login(page, 'coach');
      const cleanupApi = await apiFor(page);
      await cleanupFixture(cleanupApi, fixture);
      await cleanupApi.dispose();
    }
  });
  
  test('SNAPSHOT: generated exerciseKey and DB-backed exercise deduplication are mandatory', async ({ page }) => {
    await login(page, 'user');
    const userId = await currentUserId();
    const api = await apiFor(page);

    const body = await mobileSuccess(
      await api.get('/api/mobile/v1/snapshot', { params: { language: LANGUAGE } }),
      'snapshot exercise contract',
    );

    const exercises = body.data.exercises as any[];
    const dbRows = await dbOne<{ missing: string }>(
      `SELECT COUNT(*)::text AS missing
         FROM public.exercises e
         JOIN public.workout_exercises we ON we.exercise_id = e.id
         JOIN public.program_workouts pw ON pw.workout_id = we.workout_id
         JOIN public.user_programs up ON up.program_id = pw.program_id
        WHERE up.user_id = $1
          AND up.status = 'assigned'
          AND e.id IS NULL`,
      [userId],
    );
    expect(Number(dbRows?.missing ?? 0)).toBe(0);

    for (const exercise of exercises) {
      expect(exercise.exerciseKey).toBe(`exercise-${Number(exercise.exerciseId)}`);
      expect(Array.isArray(exercise.imageFiles)).toBeTruthy();
    }

    const ids = exercises.map((x) => Number(x.exerciseId));
    expect(new Set(ids).size).toBe(ids.length);

    await api.dispose();
  });

  test('DETAIL: six exercises / sixteen concrete sets acceptance fixture is exact', async ({ page }) => {
    await login(page, 'user');
    const userId = await currentUserId();
    const api = await apiFor(page);

    const candidate = await dbOne<{ id: number }>(
      `SELECT uw.id
         FROM public.user_workouts uw
        WHERE uw.user_id = $1
          AND (
            SELECT COUNT(*)
              FROM public.user_workout_exercises uwe
             WHERE uwe.user_workout_id = uw.id
          ) = 6
          AND (
            SELECT COUNT(*)
              FROM public.user_workout_exercise_sets s
              JOIN public.user_workout_exercises uwe
                ON uwe.id = s.user_workout_exercise_id
             WHERE uwe.user_workout_id = uw.id
          ) = 16
        ORDER BY uw.id DESC
        LIMIT 1`,
      [userId],
    );

    expect(
      candidate,
      'A specifikáció 6 exercise / 16 set acceptance fixture nincs jelen a tesztadatbázisban.',
    ).not.toBeNull();

    const body = await mobileSuccess(
      await api.get(`/api/mobile/v1/user-workouts/${candidate!.id}`, {
        params: { language: LANGUAGE },
      }),
      'GET exact 6/16 acceptance fixture',
    );

    expect(body.data.workoutExercises).toHaveLength(6);
    expect(body.data.userWorkoutSets).toHaveLength(16);

    const exerciseIds = body.data.exercises.map((x: any) => Number(x.exerciseId));
    expect(new Set(exerciseIds).size).toBe(exerciseIds.length);

    await api.dispose();
  });

  test('DETAIL: canonical single-workout response matches DB and is user-scoped', async ({ page }) => {
    // Create both sides of the ownership boundary through the real coach API.
    // The test must never depend on a pre-existing foreign user_workout in the dump.
    await login(page, 'coach');
    const coachApi = await apiFor(page);
    const userId = await currentUserId();
    const foreignUserId = await anotherCoachClientUserId(userId);

    const ownFixture = await createAssignedFixture(coachApi, userId, 'MOBILE DETAIL OWN', 1, 1);
    const foreignFixture = await createAssignedFixture(
      coachApi,
      foreignUserId,
      'MOBILE DETAIL FOREIGN',
      1,
      1,
    );

    try {
      await coachApi.dispose();
      await login(page, 'user');
      const api = await apiFor(page);

      const fixture = await findOwnedUserWorkout(userId, true);
      expect(fixture, 'Szigorú detail teszthez létrehozott saját user_workout hiányzik.').not.toBeNull();
      expect(ownFixture.programs).toContain(Number(fixture!.program_id));

      const body = await mobileSuccess(
        await api.get(`/api/mobile/v1/user-workouts/${fixture!.id}`, {
          params: { language: LANGUAGE },
        }),
        'GET user-workout detail',
      );

      const data = body.data;
      expect(Number(data.userWorkout.userWorkoutId)).toBe(Number(fixture!.id));
      expect(Number(data.userWorkout.programId)).toBe(Number(fixture!.program_id));
      expect(Number(data.userWorkout.programWorkoutId)).toBe(Number(fixture!.program_workout_id));
      expect(Number(data.userWorkout.workoutId)).toBe(Number(fixture!.workout_id));
      expect(data.userWorkout.scheduledDate).toBe(fixture!.scheduled_at.slice(0, 10));

      const sets = data.userWorkoutSets as any[];
      const setDbCount = await dbCount(
        `SELECT COUNT(*)::text AS count
           FROM public.user_workout_exercise_sets s
           JOIN public.user_workout_exercises uwe ON uwe.id = s.user_workout_exercise_id
          WHERE uwe.user_workout_id = $1`,
        [fixture!.id],
      );
      expect(sets).toHaveLength(setDbCount);

      const workoutExerciseIds = (data.workoutExercises as any[]).map((x) => Number(x.workoutExerciseId));
      const dbWorkoutExercises = await dbCount(
        `SELECT COUNT(*)::text AS count FROM public.workout_exercises WHERE workout_id = $1`,
        [fixture!.workout_id],
      );
      expect(workoutExerciseIds.length).toBe(dbWorkoutExercises);
      expect(new Set(workoutExerciseIds).size).toBe(workoutExerciseIds.length);

      for (const we of data.workoutExercises as any[]) {
        expect(we.exerciseKey).toBe(`exercise-${Number(we.exerciseId)}`);
        expect(Number(we.workoutId)).toBe(Number(fixture!.workout_id));
        expect(Number(we.targetSets)).toBeGreaterThan(0);
        expect(Number(we.targetReps)).toBeGreaterThan(0);
      }

      const exerciseIds = (data.exercises as any[]).map((x) => Number(x.exerciseId));
      expect(new Set(exerciseIds).size).toBe(exerciseIds.length);
      for (const exercise of data.exercises as any[]) {
        expect(exercise.exerciseKey).toBe(`exercise-${Number(exercise.exerciseId)}`);
        expect(Array.isArray(exercise.imageFiles)).toBeTruthy();
      }

      const foreign = await dbOne<{ id: number; user_id: number }>(
        `SELECT id, user_id
           FROM public.user_workouts
          WHERE user_id = $1
          ORDER BY id DESC
          LIMIT 1`,
        [foreignUserId],
      );
      expect(foreign, 'A foreign ownership fixture user_workout rekordja hiányzik.').not.toBeNull();

      const foreignResponse = await api.get(`/api/mobile/v1/user-workouts/${foreign!.id}`, {
        params: { language: LANGUAGE },
      });
      const foreignBody = await mobileRejected(foreignResponse, 'foreign user-workout detail');
      expect([401, 403, 404]).toContain(foreignResponse.status());
      expect(foreignBody.data).toBeNull();

      const missingResponse = await api.get('/api/mobile/v1/user-workouts/2147483647', {
        params: { language: LANGUAGE },
      });
      const missingBody = await mobileRejected(missingResponse, 'missing user-workout detail');
      expect([400, 404]).toContain(missingResponse.status());
      expect(missingBody.data).toBeNull();

      await api.dispose();
    } finally {
      await login(page, 'coach');
      const cleanupApi = await apiFor(page);
      await cleanupFixture(cleanupApi, foreignFixture);
      await cleanupFixture(cleanupApi, ownFixture);
      await cleanupApi.dispose();
    }
  });

  test('AUTH: all three mobile endpoints reject missing credentials', async () => {
    const api = await unauthenticatedApi();
    try {
      for (const endpoint of [
        '/api/mobile/v1/snapshot?language=hu',
        '/api/mobile/v1/user-workouts/1?language=hu',
      ]) {
        const response = await api.get(endpoint);
        expect(response.status(), `${endpoint} must reject unauthenticated request`).toBeGreaterThanOrEqual(401);
        expect(response.status()).toBeLessThan(500);
      }

      const response = await api.put('/api/mobile/v1/user-workouts/1/state', {
        data: { status: 'IN_PROGRESS', startedAt: null, completedAt: null, userNote: null, sets: [] },
      });
      expect(response.status()).toBeGreaterThanOrEqual(401);
      expect(response.status()).toBeLessThan(500);
    } finally {
      await api.dispose();
    }
  });

  test('STATE: actual set update → DB → canonical response → targets unchanged → idempotent retry', async ({ page }) => {
    await login(page, 'coach');
    const coachApi = await apiFor(page);
    const userId = await currentUserId();

    const fixture = await createAssignedFixture(
      coachApi,
      userId,
      'MOBILE STATE',
      1,
      1,
    );

    try {
      await coachApi.dispose();
      await login(page, 'user');
      const userApi = await apiFor(page);

      const fixtureRow = await dbOne<{ id: number }>(
        `SELECT id
           FROM public.user_workouts
          WHERE user_id = $1
            AND program_id = $2
          ORDER BY id DESC
          LIMIT 1`,
        [userId, fixture.programs[0]],
      );
      expect(fixtureRow).not.toBeNull();

      const set = await dbOne<{
        id: number;
        target_repetitions: number;
        target_weight_kg: string | null;
        actual_repetitions: number | null;
        actual_weight_kg: string | null;
        completed: boolean;
        notes: string | null;
      }>(
        `SELECT s.id,
                s.target_repetitions,
                s.target_weight_kg::text,
                s.actual_repetitions,
                s.actual_weight_kg::text,
                s.completed,
                s.notes
           FROM public.user_workout_exercise_sets s
           JOIN public.user_workout_exercises uwe ON uwe.id = s.user_workout_exercise_id
          WHERE uwe.user_workout_id = $1
          ORDER BY s.id
          LIMIT 1`,
        [fixtureRow!.id],
      );
      expect(set).not.toBeNull();

      const beforeTarget = {
        reps: set!.target_repetitions,
        weight: set!.target_weight_kg,
      };

      const requestBody = {
        status: 'IN_PROGRESS',
        startedAt: '2035-06-01T10:00:00Z',
        completedAt: null,
        userNote: 'mobile strict E2E state',
        sets: [
          {
            userWorkoutSetId: Number(set!.id),
            actualReps: 11,
            actualWeightKg: 52.5,
            completed: false,
            notes: 'first set',
          },
        ],
      };

      const first = await mobileSuccess(
        await userApi.put(`/api/mobile/v1/user-workouts/${fixtureRow!.id}/state`, {
          data: requestBody,
        }),
        'PUT state first update',
      );

      expect(first.data.userWorkout.status).toBe('IN_PROGRESS');
      expect(first.data.userWorkout.startedAt).toBe('2035-06-01T10:00:00Z');
      expect(first.data.userWorkout.completedAt).toBeNull();

      const afterFirst = await dbOne<any>(
        `SELECT uw.completed,
                uw.performed_at::text AS performed_at,
                uw.notes,
                s.actual_repetitions,
                s.actual_weight_kg::text AS actual_weight_kg,
                s.completed AS set_completed,
                s.notes AS set_notes,
                s.target_repetitions,
                s.target_weight_kg::text AS target_weight_kg
           FROM public.user_workouts uw
           JOIN public.user_workout_exercises uwe ON uwe.user_workout_id = uw.id
           JOIN public.user_workout_exercise_sets s ON s.user_workout_exercise_id = uwe.id
          WHERE uw.id = $1
            AND s.id = $2`,
        [fixtureRow!.id, set!.id],
      );

      expect(afterFirst).not.toBeNull();
      expect(afterFirst.actual_repetitions).toBe(11);
      expect(Number(afterFirst.actual_weight_kg)).toBe(52.5);
      expect(afterFirst.set_completed).toBe(false);
      expect(afterFirst.set_notes).toBe('first set');
      expect(afterFirst.target_repetitions).toBe(beforeTarget.reps);
      expect(afterFirst.target_weight_kg).toBe(beforeTarget.weight);

      const firstDbSnapshot = JSON.stringify(afterFirst);

      const second = await mobileSuccess(
        await userApi.put(`/api/mobile/v1/user-workouts/${fixtureRow!.id}/state`, {
          data: requestBody,
        }),
        'PUT state idempotent retry',
      );
      expect(second.data.userWorkout.status).toBe('IN_PROGRESS');

      const afterSecond = await dbOne<any>(
        `SELECT uw.completed,
                uw.performed_at::text AS performed_at,
                uw.notes,
                s.actual_repetitions,
                s.actual_weight_kg::text AS actual_weight_kg,
                s.completed AS set_completed,
                s.notes AS set_notes,
                s.target_repetitions,
                s.target_weight_kg::text AS target_weight_kg
           FROM public.user_workouts uw
           JOIN public.user_workout_exercises uwe ON uwe.user_workout_id = uw.id
           JOIN public.user_workout_exercise_sets s ON s.user_workout_exercise_id = uwe.id
          WHERE uw.id = $1
            AND s.id = $2`,
        [fixtureRow!.id, set!.id],
      );
      expect(JSON.stringify(afterSecond)).toBe(firstDbSnapshot);

      await userApi.dispose();
    } finally {
      await login(page, 'user');
      const ownerApi = await apiFor(page);
      await login(page, 'coach');
      const cleanupApi = await apiFor(page);
      await cleanupFixture(cleanupApi, fixture, ownerApi);
      await cleanupApi.dispose();
      await ownerApi.dispose();
    }
  });

  test('STATE: COMPLETED transition → completedAt + programProgress + all supplied sets', async ({ page }) => {
    await login(page, 'coach');
    const coachApi = await apiFor(page);
    const userId = await currentUserId();
    const fixture = await createAssignedFixture(coachApi, userId, 'MOBILE COMPLETE', 1, 1);

    try {
      const row = await dbOne<{ id: number }>(
        `SELECT id
           FROM public.user_workouts
          WHERE user_id = $1 AND program_id = $2
          ORDER BY id DESC LIMIT 1`,
        [userId, fixture.programs[0]],
      );
      expect(row).not.toBeNull();

      const sets = await db().query<{ id: number }>(
        `SELECT s.id
           FROM public.user_workout_exercise_sets s
           JOIN public.user_workout_exercises uwe ON uwe.id = s.user_workout_exercise_id
          WHERE uwe.user_workout_id = $1
          ORDER BY s.id`,
        [row!.id],
      );
      expect(sets.rows.length).toBeGreaterThan(0);

      await coachApi.dispose();
      await login(page, 'user');
      const userApi = await apiFor(page);

      const startedAt = '2035-07-01T10:00:00Z';
      const completedAt = '2035-07-01T11:00:00Z';

      await mobileSuccess(
        await userApi.put(`/api/mobile/v1/user-workouts/${row!.id}/state`, {
          data: {
            status: 'IN_PROGRESS',
            startedAt,
            completedAt: null,
            userNote: 'strict completion E2E start',
            sets: [],
          },
        }),
        'PUT IN_PROGRESS before COMPLETED',
      );

      const response = await mobileSuccess(
        await userApi.put(`/api/mobile/v1/user-workouts/${row!.id}/state`, {
          data: {
            status: 'COMPLETED',
            startedAt,
            completedAt,
            userNote: 'strict completion E2E',
            sets: sets.rows.map((s, index) => ({
              userWorkoutSetId: Number(s.id),
              actualReps: 10 + index,
              actualWeightKg: 50 + index,
              completed: true,
              notes: index === 0 ? 'completion set' : null,
            })),
          },
        }),
        'PUT COMPLETED state',
      );

      expect(response.data.userWorkout.status).toBe('COMPLETED');
      expect(response.data.userWorkout.completedAt).toBe(completedAt);
      expect(response.data.programProgress.programId).toBe(fixture.programs[0]);
      expect(response.data.programProgress.completedWorkouts).toBeGreaterThanOrEqual(1);
      expect(response.data.programProgress.totalWorkouts).toBeGreaterThanOrEqual(1);
      expect(response.data.programProgress.progressPercent).toBeGreaterThanOrEqual(0);
      expect(response.data.programProgress.progressPercent).toBeLessThanOrEqual(100);

      const workoutDb = await dbOne<any>(
        `SELECT completed, performed_at::text AS performed_at, notes
           FROM public.user_workouts
          WHERE id = $1`,
        [row!.id],
      );
      expect(workoutDb?.completed).toBe(true);
      expect(workoutDb?.performed_at).toContain('2035-07-01 11:00:00');
      expect(workoutDb?.notes).toBe('strict completion E2E');

      const persistedSets = await db().query<any>(
        `SELECT s.id,
                s.actual_repetitions,
                s.actual_weight_kg::text AS actual_weight_kg,
                s.completed,
                s.notes
           FROM public.user_workout_exercise_sets s
           JOIN public.user_workout_exercises uwe ON uwe.id = s.user_workout_exercise_id
          WHERE uwe.user_workout_id = $1
          ORDER BY s.id`,
        [row!.id],
      );
      expect(persistedSets.rows).toHaveLength(sets.rows.length);
      for (const [index, persisted] of persistedSets.rows.entries()) {
        expect(persisted.actual_repetitions).toBe(10 + index);
        expect(Number(persisted.actual_weight_kg)).toBe(50 + index);
        expect(persisted.completed).toBe(true);
      }

      await userApi.dispose();
    } finally {
      await login(page, 'user');
      const ownerApi = await apiFor(page);
      await login(page, 'coach');
      const cleanupApi = await apiFor(page);
      await cleanupFixture(cleanupApi, fixture, ownerApi);
      await cleanupApi.dispose();
      await ownerApi.dispose();
    }
  });

  test('STATE: foreign set is rejected atomically and own state is unchanged', async ({ page }) => {
    await login(page, 'coach');
    const coachApi = await apiFor(page);
    const userId = await currentUserId();
    const fixture = await createAssignedFixture(coachApi, userId, 'MOBILE ROLLBACK', 1, 1);
    const foreignUserId = await anotherCoachClientUserId(userId);
    const foreignFixture = await createAssignedFixture(
      coachApi,
      foreignUserId,
      'MOBILE ROLLBACK FOREIGN',
      1,
      1,
    );

    try {
      const ownWorkout = await dbOne<{ id: number }>(
        `SELECT id
           FROM public.user_workouts
          WHERE user_id = $1 AND program_id = $2
          ORDER BY id DESC LIMIT 1`,
        [userId, fixture.programs[0]],
      );
      expect(ownWorkout).not.toBeNull();

      const ownSet = await dbOne<{ id: number; actual_repetitions: number | null; notes: string | null }>(
        `SELECT s.id, s.actual_repetitions, s.notes
           FROM public.user_workout_exercise_sets s
           JOIN public.user_workout_exercises uwe ON uwe.id = s.user_workout_exercise_id
          WHERE uwe.user_workout_id = $1
          ORDER BY s.id LIMIT 1`,
        [ownWorkout!.id],
      );
      expect(ownSet).not.toBeNull();

      const foreignSet = await dbOne<{
        id: number;
        user_workout_id: number;
        user_id: number;
      }>(
        `SELECT s.id,
                uwe.user_workout_id,
                uw.user_id
           FROM public.user_workout_exercise_sets s
           JOIN public.user_workout_exercises uwe
             ON uwe.id = s.user_workout_exercise_id
           JOIN public.user_workouts uw
             ON uw.id = uwe.user_workout_id
          WHERE uw.user_id = $1
          ORDER BY s.id DESC
          LIMIT 1`,
        [foreignUserId],
      );
      expect(
        foreignSet,
        'A rollback foreign fixture user_workout_set rekordja hiányzik.',
      ).not.toBeNull();

      const before = await dbOne<any>(
        `SELECT uw.completed,
                uw.performed_at::text AS performed_at,
                uw.notes,
                s.actual_repetitions,
                s.actual_weight_kg::text AS actual_weight_kg,
                s.completed AS set_completed,
                s.notes AS set_notes
           FROM public.user_workouts uw
           JOIN public.user_workout_exercises uwe ON uwe.user_workout_id = uw.id
           JOIN public.user_workout_exercise_sets s
             ON s.user_workout_exercise_id = uwe.id
            AND s.id = $2
          WHERE uw.id = $1
            AND uwe.user_workout_id = uw.id`,
        [ownWorkout!.id, ownSet!.id],
      );
      expect(before).not.toBeNull();

      await coachApi.dispose();
      await login(page, 'user');
      const userApi = await apiFor(page);

      const rejectedResponse = await userApi.put(
        `/api/mobile/v1/user-workouts/${ownWorkout!.id}/state`,
        {
          data: {
            status: 'IN_PROGRESS',
            startedAt: '2035-08-01T10:00:00Z',
            completedAt: null,
            userNote: 'must rollback',
            sets: [
              {
                userWorkoutSetId: Number(ownSet!.id),
                actualReps: 99,
                actualWeightKg: 99,
                completed: false,
                notes: 'must rollback',
              },
              {
                userWorkoutSetId: Number(foreignSet!.id),
                actualReps: 1,
                actualWeightKg: 1,
                completed: false,
                notes: 'foreign',
              },
            ],
          },
        },
      );

      await mobileRejected(rejectedResponse, 'foreign set ownership');
      expect([400, 401, 403, 404]).toContain(rejectedResponse.status());

      const after = await dbOne<any>(
        `SELECT uw.completed,
                uw.performed_at::text AS performed_at,
                uw.notes,
                s.actual_repetitions,
                s.actual_weight_kg::text AS actual_weight_kg,
                s.completed AS set_completed,
                s.notes AS set_notes
           FROM public.user_workouts uw
           JOIN public.user_workout_exercises uwe ON uwe.user_workout_id = uw.id
           JOIN public.user_workout_exercise_sets s
             ON s.user_workout_exercise_id = uwe.id
            AND s.id = $2
          WHERE uw.id = $1
            AND uwe.user_workout_id = uw.id`,
        [ownWorkout!.id, ownSet!.id],
      );
      expect(after).toEqual(before);

      await userApi.dispose();
    } finally {
      await login(page, 'coach');
      const cleanupApi = await apiFor(page);
      await cleanupFixture(cleanupApi, foreignFixture);
      await cleanupFixture(cleanupApi, fixture);
      await cleanupApi.dispose();
    }
  });

  test('STATE: invalid transitions and invalid set payloads are rejected without mutation', async ({ page }) => {
    await login(page, 'coach');
    const coachApi = await apiFor(page);
    const userId = await currentUserId();
    const fixture = await createAssignedFixture(coachApi, userId, 'MOBILE NEGATIVE', 1, 1);

    try {
      const row = await dbOne<{ id: number }>(
        `SELECT id
           FROM public.user_workouts
          WHERE user_id = $1 AND program_id = $2
          ORDER BY id DESC LIMIT 1`,
        [userId, fixture.programs[0]],
      );
      expect(row).not.toBeNull();

      await coachApi.dispose();
      await login(page, 'user');
      const userApi = await apiFor(page);

      const invalidStatus = await userApi.put(`/api/mobile/v1/user-workouts/${row!.id}/state`, {
        data: { status: 'BROKEN', startedAt: null, completedAt: null, userNote: null, sets: [] },
      });
      await mobileRejected(invalidStatus, 'invalid status');
      expect(invalidStatus.status()).toBe(400);

      const duplicateSet = await dbOne<{ id: number }>(
        `SELECT s.id
           FROM public.user_workout_exercise_sets s
           JOIN public.user_workout_exercises uwe ON uwe.id = s.user_workout_exercise_id
          WHERE uwe.user_workout_id = $1
          ORDER BY s.id LIMIT 1`,
        [row!.id],
      );
      expect(duplicateSet).not.toBeNull();

      const duplicate = await userApi.put(`/api/mobile/v1/user-workouts/${row!.id}/state`, {
        data: {
          status: 'IN_PROGRESS',
          startedAt: '2035-09-01T10:00:00Z',
          completedAt: null,
          userNote: null,
          sets: [
            { userWorkoutSetId: Number(duplicateSet!.id), actualReps: 10, actualWeightKg: 10, completed: false, notes: null },
            { userWorkoutSetId: Number(duplicateSet!.id), actualReps: 11, actualWeightKg: 11, completed: false, notes: null },
          ],
        },
      });
      await mobileRejected(duplicate, 'duplicate set id');
      expect(duplicate.status()).toBe(400);

      const negative = await userApi.put(`/api/mobile/v1/user-workouts/${row!.id}/state`, {
        data: {
          status: 'IN_PROGRESS',
          startedAt: '2035-09-01T10:00:00Z',
          completedAt: null,
          userNote: null,
          sets: [
            { userWorkoutSetId: Number(duplicateSet!.id), actualReps: -1, actualWeightKg: -1, completed: false, notes: null },
          ],
        },
      });
      await mobileRejected(negative, 'negative set values');
      expect(negative.status()).toBe(400);

      await userApi.dispose();
    } finally {
      await login(page, 'coach');
      const cleanupApi = await apiFor(page);
      await cleanupFixture(cleanupApi, fixture);
      await cleanupApi.dispose();
    }
  });

  test('OWNERSHIP: another user cannot read or update the workout, and no data is exposed', async ({ page }) => {
    await login(page, 'coach');
    const coachApi = await apiFor(page);
    const userId = await currentUserId();
    const foreignUserId = await anotherCoachClientUserId(userId);
    const foreignFixture = await createAssignedFixture(
      coachApi,
      foreignUserId,
      'MOBILE OWNERSHIP FOREIGN',
      1,
      1,
    );

    const foreign = await dbOne<{ id: number; user_id: number }>(
      `SELECT id, user_id
         FROM public.user_workouts
        WHERE user_id = $1
        ORDER BY id DESC
        LIMIT 1`,
      [foreignUserId],
    );
    expect(foreign, 'Az ownership fixture user_workout rekordja hiányzik.').not.toBeNull();

    try {
      await coachApi.dispose();
      await login(page, 'user');
      const api = await apiFor(page);

      const read = await api.get(`/api/mobile/v1/user-workouts/${foreign!.id}`, {
        params: { language: LANGUAGE },
      });
      const readBody = await mobileRejected(read, 'foreign detail ownership');
      expect([401, 403, 404]).toContain(read.status());
      expect(readBody.data).toBeNull();

      const update = await api.put(`/api/mobile/v1/user-workouts/${foreign!.id}/state`, {
        data: {
          status: 'IN_PROGRESS',
          startedAt: '2035-10-01T10:00:00Z',
          completedAt: null,
          userNote: 'must not leak',
          sets: [],
        },
      });
      const updateBody = await mobileRejected(update, 'foreign state ownership');
      expect([401, 403, 404]).toContain(update.status());
      expect(updateBody.data).toBeNull();

      await api.dispose();
    } finally {
      await login(page, 'coach');
      const cleanupApi = await apiFor(page);
      await cleanupFixture(cleanupApi, foreignFixture);
      await cleanupApi.dispose();
    }
  });

  test('AUTH: malformed credentials are rejected by all three endpoints', async () => {
    const api = await request.newContext({
      baseURL: BASE_API_URL,
      extraHTTPHeaders: {
        Authorization: 'Bearer not-a-valid-jwt',
      },
    });

    try {
      for (const endpoint of [
        '/api/mobile/v1/snapshot?language=hu',
        '/api/mobile/v1/user-workouts/1?language=hu',
      ]) {
        const response = await api.get(endpoint);
        expect(response.status()).toBeGreaterThanOrEqual(401);
        expect(response.status()).toBeLessThan(500);
      }

      const response = await api.put('/api/mobile/v1/user-workouts/1/state', {
        data: { status: 'IN_PROGRESS', startedAt: null, completedAt: null, userNote: null, sets: [] },
      });
      expect(response.status()).toBeGreaterThanOrEqual(401);
      expect(response.status()).toBeLessThan(500);
    } finally {
      await api.dispose();
    }
  });
});
