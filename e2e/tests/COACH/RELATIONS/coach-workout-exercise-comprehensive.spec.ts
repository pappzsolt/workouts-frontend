import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import {
  apiFor,
  createExercise,
  createWorkout,
  db,
  dbCount,
  dbOne,
  deleteExercise,
  deleteWorkout,
  LANGUAGE,
  login,
  rejected,
  success,
  suffix,
} from '../../helpers/e2e-next-3-helpers';

test.describe('Coach - Workout / Exercise / Assignment endpoint matrix', () => {
  test.describe.configure({ mode: 'serial' });

  async function workoutExerciseCount(
    workoutId: number,
    exerciseId?: number,
  ): Promise<number> {
    if (exerciseId === undefined) {
      return dbCount(
        `SELECT count(*)::text AS count
           FROM public.workout_exercises
          WHERE workout_id = $1`,
        [workoutId],
      );
    }

    return dbCount(
      `SELECT count(*)::text AS count
         FROM public.workout_exercises
        WHERE workout_id = $1
          AND exercise_id = $2`,
      [workoutId, exerciseId],
    );
  }

  async function assertWorkoutGone(workoutId: number): Promise<void> {
    expect(
      await dbCount(
        'SELECT count(*)::text AS count FROM public.workout_exercises WHERE workout_id=$1',
        [workoutId],
      ),
    ).toBe(0);

    expect(
      await dbCount(
        'SELECT count(*)::text AS count FROM public.workout_translations WHERE workout_id=$1',
        [workoutId],
      ),
    ).toBe(0);

    expect(
      await dbCount(
        'SELECT count(*)::text AS count FROM public.workouts WHERE id=$1',
        [workoutId],
      ),
    ).toBe(0);
  }

  async function assertExerciseGone(exerciseId: number): Promise<void> {
    expect(
      await dbCount(
        'SELECT count(*)::text AS count FROM public.workout_exercises WHERE exercise_id=$1',
        [exerciseId],
      ),
    ).toBe(0);

    expect(
      await dbCount(
        'SELECT count(*)::text AS count FROM public.exercise_translations WHERE exercise_id=$1',
        [exerciseId],
      ),
    ).toBe(0);

    expect(
      await dbCount(
        'SELECT count(*)::text AS count FROM public.exercises WHERE id=$1',
        [exerciseId],
      ),
    ).toBe(0);
  }

  test('COMPLETE WORKOUT: create → GET → my-workouts → unique → search → update → PostgreSQL → delete', async ({
    page,
  }) => {
    await login(page, 'coach');
    const api = await apiFor(page);

    const name = `E2E COACH WORKOUT ${suffix()}`;
    let workoutId: number | undefined;

    try {
      workoutId = await createWorkout(api, name);

      const getBody = await success(
        await api.get(`${API_ENDPOINTS.workouts.byId(workoutId)}`, {
          params: { language: LANGUAGE },
        }),
        'GET /api/workouts/{id}',
      );
      expect(Number(getBody.data?.workoutId)).toBe(workoutId);

      const myBody = await success(
        await api.get(API_ENDPOINTS.workouts.my, {
          params: { language: LANGUAGE },
        }),
        'GET /api/workouts/my',
      );
      expect(
        myBody.data.some((row: any) => Number(row.id) === workoutId),
      ).toBeTruthy();

      const uniqueBody = await success(
        await api.get(API_ENDPOINTS.workouts.myUnique, {
          params: { language: LANGUAGE },
        }),
        'GET /api/workouts/my/unique',
      );
      expect(Array.isArray(uniqueBody.data)).toBeTruthy();

      const searchResponse = await api.get(API_ENDPOINTS.workouts.mySearch, {
        params: {
          search: name,
          page: 0,
          size: 6,
          language: LANGUAGE,
          sortDirection: 'asc',
        },
      });
      expect(searchResponse.ok(), await searchResponse.text()).toBeTruthy();
      const searchBody = JSON.parse(await searchResponse.text());
      expect(
        searchBody.content.some((row: any) => Number(row.id) === workoutId),
      ).toBeTruthy();

      await success(
        await api.put(`${API_ENDPOINTS.workouts.byId(workoutId)}`, {
          params: { language: LANGUAGE },
          data: {
            id: workoutId,
            name: `${name} UPDATED`,
            description: 'E2E workout update',
            workoutDate: '2035-02-16',
            durationMinutes: 95,
            intensityLevel: 'Low',
            dayIndex: 2,
            done: false,
          },
        }),
        'PUT /api/workouts/{id}',
      );

      const dbWorkout = await dbOne<{
        workout_date: string;
        duration_minutes: number;
        intensity_level: string;
        name: string;
        description: string;
      }>(
        `
          SELECT
            w.workout_date::text AS workout_date,
            w.duration_minutes,
            w.intensity_level,
            wt.name,
            wt.description
          FROM public.workouts w
          JOIN public.workout_translations wt
            ON wt.workout_id = w.id
          JOIN public.languages l
            ON l.id = wt.language_id
           AND lower(l.code) = lower($2)
          WHERE w.id = $1
          LIMIT 1
        `,
        [workoutId, LANGUAGE],
      );

      expect(dbWorkout).not.toBeNull();
      expect(dbWorkout?.workout_date).toBe('2035-02-16');
      expect(Number(dbWorkout?.duration_minutes)).toBe(95);
      expect(dbWorkout?.intensity_level).toBe('Low');
      expect(dbWorkout?.name).toBe(`${name} UPDATED`);
      expect(dbWorkout?.description).toBe('E2E workout update');

      await deleteWorkout(api, workoutId);
      await assertWorkoutGone(workoutId);
      workoutId = undefined;
    } finally {
      if (workoutId !== undefined) {
        await deleteWorkout(api, workoutId);
        await assertWorkoutGone(workoutId);
      }
      await api.dispose();
    }
  });

  test('COMPLETE EXERCISE: create → all → workouts → unique → search → update → PostgreSQL → delete', async ({
    page,
  }) => {
    await login(page, 'coach');
    const api = await apiFor(page);

    const name = `E2E COACH EXERCISE ${suffix()}`;
    let exerciseId: number | undefined;

    try {
      exerciseId = await createExercise(api, name);

      const allBody = await success(
        await api.get(API_ENDPOINTS.exercises.base, {
          params: { language: LANGUAGE },
        }),
        'GET /api/exercises',
      );
      expect(
        allBody.data.some((row: any) => Number(row.id) === exerciseId),
      ).toBeTruthy();

      const workoutsBody = await success(
        await api.get(API_ENDPOINTS.exercises.workouts, {
          params: { language: LANGUAGE },
        }),
        'GET /api/exercises/workouts',
      );
      expect(Array.isArray(workoutsBody.data)).toBeTruthy();

      const uniqueBody = await success(
        await api.get(API_ENDPOINTS.exercises.uniqueWorkouts, {
          params: { language: LANGUAGE },
        }),
        'GET /api/exercises/workouts/unique',
      );
      expect(Array.isArray(uniqueBody.data)).toBeTruthy();

      const searchBody = await success(
        await api.get(API_ENDPOINTS.exercises.search, {
          params: {
            language: LANGUAGE,
            search: name,
            searchField: 'all',
            page: 0,
            size: 6,
            sortDirection: 'asc',
          },
        }),
        'GET /api/exercises/search',
      );
      expect(
        searchBody.data.content.some(
          (row: any) => Number(row.id) === exerciseId,
        ),
      ).toBeTruthy();

      await rejected(
        await api.get(API_ENDPOINTS.exercises.search, {
          params: {
            language: LANGUAGE,
            search: name,
            page: -1,
            size: 6,
          },
        }),
        'GET exercise-search page=-1',
      );

      await rejected(
        await api.get(API_ENDPOINTS.exercises.search, {
          params: {
            language: LANGUAGE,
            search: name,
            page: 0,
            size: 0,
          },
        }),
        'GET exercise-search size=0',
      );

      await success(
        await api.put(`${API_ENDPOINTS.exercises.byId(exerciseId)}`, {
          params: { language: LANGUAGE },
          data: {
            id: exerciseId,
            name,
            description: 'E2E exercise update',
            imageUrl: null,
            videoUrl: null,
            muscleGroup: 'back',
            equipment: 'cable',
            difficultyLevel: 'intermediate',
            category: 'strength',
            caloriesBurnedPerMinute: 6.5,
            durationSeconds: 75,
            done: false,
            forceType: 'pull',
            mechanic: 'compound',
            isUnilateral: false,
            isBodyweight: false,
            variationGroup: null,
            bodyPart: 'back',
            synonyms: null,
            instructions: null,
            tips: null,
            primaryMuscles: 'latissimus dorsi',
            secondaryMuscles: null,
          },
        }),
        'PUT /api/exercises/{id}',
      );

      const dbExercise = await dbOne<{
        name: string;
        description: string;
        calories_burned_per_minute: number;
        duration_seconds: number;
      }>(
        `
          SELECT
            et.name,
            et.description,
            e.calories_burned_per_minute,
            e.duration_seconds
          FROM public.exercises e
          JOIN public.exercise_translations et
            ON et.exercise_id = e.id
          JOIN public.languages l
            ON l.id = et.language_id
           AND lower(l.code) = lower($2)
          WHERE e.id = $1
          LIMIT 1
        `,
        [exerciseId, LANGUAGE],
      );

      expect(dbExercise).not.toBeNull();
      expect(dbExercise?.name).toBe(name);
      expect(dbExercise?.description).toBe('E2E exercise update');
      expect(Number(dbExercise?.calories_burned_per_minute)).toBe(6.5);
      expect(Number(dbExercise?.duration_seconds)).toBe(75);

      await deleteExercise(api, exerciseId);
      await assertExerciseGone(exerciseId);
      exerciseId = undefined;
    } finally {
      if (exerciseId !== undefined) {
        await deleteExercise(api, exerciseId);
        await assertExerciseGone(exerciseId);
      }
      await api.dispose();
    }
  });

  test('COMPLETE ASSIGNMENT: assign → defaults → GET → duplicate → reorder → delete → PostgreSQL', async ({
    page,
  }) => {
    await login(page, 'coach');
    const api = await apiFor(page);

    const workoutName = `E2E ASSIGN WORKOUT ${suffix()}`;
    const exerciseName = `E2E ASSIGN EXERCISE ${suffix()}`;
    const exerciseName2 = `E2E ASSIGN EXERCISE 2 ${suffix()}`;

    let workoutId: number | undefined;
    let exerciseId: number | undefined;
    let exerciseId2: number | undefined;

    try {
      workoutId = await createWorkout(api, workoutName);
      exerciseId = await createExercise(api, exerciseName);
      exerciseId2 = await createExercise(api, exerciseName2);

      await success(
        await api.post(API_ENDPOINTS.workoutExercises.base, {
          params: { workoutId, exerciseId },
        }),
        'POST /api/workout-exercises',
      );

      let first = await dbOne<{
        sets: number;
        repetitions: number;
        rest_seconds: number;
        order_index: number;
      }>(
        `
          SELECT sets, repetitions, rest_seconds, order_index
          FROM public.workout_exercises
          WHERE workout_id=$1 AND exercise_id=$2
        `,
        [workoutId, exerciseId],
      );

      expect(first).not.toBeNull();
      expect(Number(first?.sets)).toBe(3);
      expect(Number(first?.repetitions)).toBe(10);
      expect(Number(first?.rest_seconds)).toBe(60);
      expect(Number(first?.order_index)).toBe(0);

      await success(
        await api.post(API_ENDPOINTS.workoutExercises.base, {
          params: { workoutId, exerciseId: exerciseId2 },
        }),
        'POST /api/workout-exercises second',
      );

      const second = await dbOne<{ order_index: number }>(
        `
          SELECT order_index
          FROM public.workout_exercises
          WHERE workout_id=$1 AND exercise_id=$2
        `,
        [workoutId, exerciseId2],
      );
      expect(Number(second?.order_index)).toBe(1);

      const workoutBody = await success(
        await api.get(`${API_ENDPOINTS.exercises.workout(workoutId)}`, {
          params: { language: LANGUAGE },
        }),
        'GET /api/exercises/workouts/{workoutId}',
      );
      expect(Number(workoutBody.data?.id)).toBe(workoutId);
      expect(
        workoutBody.data.exercises.some(
          (row: any) => Number(row?.exercise?.id) === exerciseId,
        ),
      ).toBeTruthy();
      expect(
        workoutBody.data.exercises.some(
          (row: any) => Number(row?.exercise?.id) === exerciseId2,
        ),
      ).toBeTruthy();

      await rejected(
        await api.post(API_ENDPOINTS.workoutExercises.base, {
          params: { workoutId, exerciseId },
        }),
        'duplicate workout-exercise assignment',
      );
      expect(await workoutExerciseCount(workoutId, exerciseId)).toBe(1);

      await success(
        await api.put(API_ENDPOINTS.workoutExercises.order, {
          params: { workoutId, exerciseId: exerciseId2, orderIndex: 0 },
        }),
        'PUT order-index 1→0',
      );

      first = await dbOne<{ order_index: number }>(
        `SELECT order_index FROM public.workout_exercises
          WHERE workout_id=$1 AND exercise_id=$2`,
        [workoutId, exerciseId],
      );
      const moved = await dbOne<{ order_index: number }>(
        `SELECT order_index FROM public.workout_exercises
          WHERE workout_id=$1 AND exercise_id=$2`,
        [workoutId, exerciseId2],
      );
      expect(Number(first?.order_index)).toBe(1);
      expect(Number(moved?.order_index)).toBe(0);

      await rejected(
        await api.put(API_ENDPOINTS.workoutExercises.order, {
          params: { workoutId, exerciseId, orderIndex: -1 },
        }),
        'PUT negative order-index',
      );

      await success(
        await api.delete(API_ENDPOINTS.workoutExercises.base, {
          params: { workoutId, exerciseId },
        }),
        'DELETE first workout-exercise relation',
      );
      await success(
        await api.delete(API_ENDPOINTS.workoutExercises.base, {
          params: { workoutId, exerciseId: exerciseId2 },
        }),
        'DELETE second workout-exercise relation',
      );

      expect(await workoutExerciseCount(workoutId)).toBe(0);

      await rejected(
        await api.delete(API_ENDPOINTS.workoutExercises.base, {
          params: { workoutId, exerciseId },
        }),
        'DELETE missing workout-exercise relation',
      );

      await deleteExercise(api, exerciseId2);
      await assertExerciseGone(exerciseId2);
      exerciseId2 = undefined;

      await deleteExercise(api, exerciseId);
      await assertExerciseGone(exerciseId);
      exerciseId = undefined;

      await deleteWorkout(api, workoutId);
      await assertWorkoutGone(workoutId);
      workoutId = undefined;
    } finally {
      // Cleanup kizárólag az alkalmazás API-ján keresztül történik.
      // Ha az API nem tudja eltávolítani a saját tesztadatot, az tesztelési
      // vagy backend hiba, nem rejtjük el közvetlen SQL DELETE-tel.
      if (workoutId !== undefined) {
        for (const currentExerciseId of [exerciseId, exerciseId2]) {
          if (currentExerciseId === undefined) continue;

          const relationExists = await workoutExerciseCount(
            workoutId,
            currentExerciseId,
          );

          if (relationExists > 0) {
            await success(
              await api.delete(API_ENDPOINTS.workoutExercises.base, {
                params: {
                  workoutId,
                  exerciseId: currentExerciseId,
                },
              }),
              `cleanup DELETE workout-exercise ${workoutId}/${currentExerciseId}`,
            );
          }
        }
      }

      if (exerciseId2 !== undefined) {
        await deleteExercise(api, exerciseId2);
        await assertExerciseGone(exerciseId2);
      }

      if (exerciseId !== undefined) {
        await deleteExercise(api, exerciseId);
        await assertExerciseGone(exerciseId);
      }

      if (workoutId !== undefined) {
        await deleteWorkout(api, workoutId);
        await assertWorkoutGone(workoutId);
      }

      await api.dispose();
    }
  });

  test('NEGATIVE MATRIX: invalid IDs and invalid relations are rejected without creating rows', async ({
    page,
  }) => {
    await login(page, 'coach');
    const api = await apiFor(page);

    const invalidId = 2147483001;

    try {
      await rejected(
        await api.put(`${API_ENDPOINTS.workouts.byId(invalidId)}`, {
          params: { language: LANGUAGE },
          data: {
            id: invalidId,
            name: 'E2E INVALID WORKOUT',
            description: 'must not exist',
            workoutDate: '2035-01-01',
            durationMinutes: 30,
            intensityLevel: 'Low',
            dayIndex: 1,
            done: false,
          },
        }),
        'PUT invalid workout ID',
      );

      await rejected(
        await api.delete(`${API_ENDPOINTS.workouts.byId(invalidId)}`),
        'DELETE invalid workout ID',
      );

      await rejected(
        await api.put(`${API_ENDPOINTS.exercises.byId(invalidId)}`, {
          params: { language: LANGUAGE },
          data: {
            id: invalidId,
            name: 'E2E INVALID EXERCISE',
            description: 'must not exist',
          },
        }),
        'PUT invalid exercise ID',
      );

      await rejected(
        await api.delete(`${API_ENDPOINTS.exercises.byId(invalidId)}`),
        'DELETE invalid exercise ID',
      );

      const invalidWorkoutBefore = await dbCount(
        'SELECT count(*)::text AS count FROM public.workouts WHERE id=$1',
        [invalidId],
      );
      const invalidExerciseBefore = await dbCount(
        'SELECT count(*)::text AS count FROM public.exercises WHERE id=$1',
        [invalidId],
      );
      expect(invalidWorkoutBefore).toBe(0);
      expect(invalidExerciseBefore).toBe(0);

      await rejected(
        await api.post(API_ENDPOINTS.workoutExercises.base, {
          params: { workoutId: invalidId, exerciseId: invalidId },
        }),
        'POST assign invalid workout/exercise IDs',
      );

      expect(
        await dbCount(
          `SELECT count(*)::text AS count
             FROM public.workout_exercises
            WHERE workout_id=$1 OR exercise_id=$2`,
          [invalidId, invalidId],
        ),
      ).toBe(0);

      await rejected(
        await api.put(API_ENDPOINTS.workoutExercises.order, {
          params: {
            workoutId: invalidId,
            exerciseId: invalidId,
            orderIndex: 0,
          },
        }),
        'PUT order-index invalid IDs',
      );
    } finally {
      await api.dispose();
    }
  });

  test('NEGATIVE VALIDATION: empty exercise name is rejected and no translation is created', async ({
    page,
  }) => {
    await login(page, 'coach');
    const api = await apiFor(page);

    const marker = `E2E EMPTY EXERCISE ${suffix()}`;

    try {
      expect(
        await dbCount(
          'SELECT count(*)::text AS count FROM public.exercise_translations WHERE name=$1',
          [marker],
        ),
      ).toBe(0);

      await rejected(
        await api.post(API_ENDPOINTS.exercises.base, {
          params: { language: LANGUAGE },
          data: {
            name: '',
            description: marker,
          },
        }),
        'POST /api/exercises empty name',
      );

      expect(
        await dbCount(
          'SELECT count(*)::text AS count FROM public.exercise_translations WHERE name=$1',
          [marker],
        ),
      ).toBe(0);
    } finally {
      await api.dispose();
    }
  });
});
