import { Pool } from 'pg';

export interface WorkoutDbRow {
  id: number;
  workout_date: string | null;
  duration_minutes: number | string | null;
  intensity_level: string | null;
  created_by_coach_id: number | null;
  name: string | null;
  description: string | null;
  language_code: string | null;
}

let pool: Pool | undefined;

function required(name: string): string {
  const value = process.env[name];

  if (!value || value === 'CHANGE_ME') {
    throw new Error(`Hiányzó E2E DB konfiguráció: ${name}`);
  }

  return value;
}

function db(): Pool {
  if (!pool) {
    pool = new Pool({
      host: required('E2E_DB_HOST'),
      port: Number(process.env.E2E_DB_PORT ?? 5432),
      database: required('E2E_DB_NAME'),
      user: required('E2E_DB_USER'),
      password: required('E2E_DB_PASSWORD'),
      ssl:
        process.env.E2E_DB_SSL === 'true'
          ? { rejectUnauthorized: false }
          : false,
      max: 2,
    });
  }

  return pool;
}

/**
 * PostgreSQL DATE érték normalizálása YYYY-MM-DD formára.
 *
 * A workout_date mezőt a SQL lekérdezésben ::text formára alakítjuk,
 * ezért normál esetben már stringként érkezik.
 *
 * A Date kezelés csak védelem arra az esetre, ha valamilyen más
 * lekérdezésből mégis Date objektum érkezne.
 */
function normalizeDate(value: string | Date | null): string | null {
  if (value == null) {
    return null;
  }

  if (value instanceof Date) {
    const year = value.getFullYear();
    const month = String(value.getMonth() + 1).padStart(2, '0');
    const day = String(value.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  return String(value).slice(0, 10);
}

export async function assertWorkoutInDatabase(
  workoutId: number,
  expected: {
    name: string;
    description: string;
    workoutDate: string;
    durationMinutes: number;
    intensityLevel: string;
  },
): Promise<WorkoutDbRow> {
  const languageCode = process.env.E2E_LANGUAGE ?? 'hu';

  const result = await db().query<WorkoutDbRow>(
    `
SELECT
w.id,
  w.workout_date::text AS workout_date,
  w.duration_minutes,
  w.intensity_level,
  w.created_by_coach_id,
  wt.name AS name,
  wt.description AS description,
  l.code AS language_code
FROM public.workouts w
LEFT JOIN public.workout_translations wt
ON wt.workout_id = w.id
AND wt.language_id = (
  SELECT l2.id
FROM public.languages l2
WHERE lower(l2.code) = lower($2)
LIMIT 1
)
LEFT JOIN public.languages l
ON l.id = wt.language_id
WHERE w.id = $1
  `,
    [workoutId, languageCode],
  );

  if (result.rowCount !== 1) {
    throw new Error(
      `A workout ${workoutId} nem található a public.workouts táblában.`,
    );
  }

  const row = result.rows[0];

  /*
   * Alap workout adatok
   */

  if (row.created_by_coach_id == null) {
    throw new Error(
      `A workout ${workoutId} created_by_coach_id értéke NULL.`,
    );
  }

  /*
   * Workout date
   */

  const actualWorkoutDate = normalizeDate(row.workout_date);

  if (actualWorkoutDate !== expected.workoutDate) {
    throw new Error(
      `workout_date eltérés: DB=${actualWorkoutDate}, expected=${expected.workoutDate}`,
    );
  }

  /*
   * Duration
   */

  const actualDuration = Number(row.duration_minutes);

  if (actualDuration !== expected.durationMinutes) {
    throw new Error(
      `duration_minutes eltérés: DB=${row.duration_minutes}, expected=${expected.durationMinutes}`,
    );
  }

  /*
   * Intensity
   */

  if (row.intensity_level !== expected.intensityLevel) {
    throw new Error(
      `intensity_level eltérés: DB=${row.intensity_level}, expected=${expected.intensityLevel}`,
    );
  }

  /*
   * Workout translation
   */

  if (row.name !== expected.name) {
    throw new Error(
      `workout_translations.name eltérés: DB=${row.name}, expected=${expected.name}`,
    );
  }

  if (row.description !== expected.description) {
    throw new Error(
      `workout_translations.description eltérés: DB=${row.description}, expected=${expected.description}`,
    );
  }

  /*
   * Translation language
   */

  const actualLanguageCode =
    row.language_code?.toLowerCase() ?? null;

  const expectedLanguageCode =
    languageCode.toLowerCase();

  if (actualLanguageCode !== expectedLanguageCode) {
    throw new Error(
      `A fordítás nyelve eltér: DB=${row.language_code}, expected=${languageCode}`,
    );
  }

  return row;
}

export async function assertWorkoutDeleted(
  workoutId: number,
): Promise<void> {
  const result = await db().query(
    `
SELECT
w.id,
  COUNT(DISTINCT wt.id)::int AS translation_count,
  COUNT(DISTINCT we.id)::int AS workout_exercise_count,
  COUNT(DISTINCT pw.id)::int AS program_workout_count,
  COUNT(DISTINCT uw.id)::int AS user_workout_count
FROM public.workouts w
LEFT JOIN public.workout_translations wt
ON wt.workout_id = w.id
LEFT JOIN public.workout_exercises we
ON we.workout_id = w.id
LEFT JOIN public.program_workouts pw
ON pw.workout_id = w.id
LEFT JOIN public.user_workouts uw
ON uw.workout_id = w.id
WHERE w.id = $1
GROUP BY w.id
  `,
    [workoutId],
  );

  if (result.rowCount !== 0) {
    const row = result.rows[0];

    throw new Error(
      `Cleanup után a workout ${workoutId} még létezik. ` +
        `translations=${row.translation_count}, ` +
        `workout_exercises=${row.workout_exercise_count}, ` +
        `program_workouts=${row.program_workout_count}, ` +
        `user_workouts=${row.user_workout_count}`,
    );
  }
}



export interface WorkoutExerciseDbRow {
  id: number;
  workout_id: number;
  exercise_id: number;
  sets: number | string;
  repetitions: number | string;
  rest_seconds: number | string;
  notes: string | null;
  order_index: number | string;
}

export async function getWorkoutExerciseInDatabase(
  workoutId: number,
  exerciseId: number,
): Promise<WorkoutExerciseDbRow | null> {
  const result = await db().query<WorkoutExerciseDbRow>(
    `
      SELECT
        id,
        workout_id,
        exercise_id,
        sets,
        repetitions,
        rest_seconds,
        notes,
        order_index
      FROM public.workout_exercises
      WHERE workout_id = $1
        AND exercise_id = $2
      LIMIT 1
    `,
    [workoutId, exerciseId],
  );

  return result.rows[0] ?? null;
}

export async function assertWorkoutExerciseInDatabase(
  workoutId: number,
  exerciseId: number,
): Promise<WorkoutExerciseDbRow> {
  const row = await getWorkoutExerciseInDatabase(workoutId, exerciseId);

  if (!row) {
    throw new Error(
      `A workout_exercises kapcsolat nem található: ` +
        `workoutId=${workoutId}, exerciseId=${exerciseId}`,
    );
  }

  return row;
}

export async function assertWorkoutExerciseDeleted(
  workoutId: number,
  exerciseId: number,
): Promise<void> {
  const row = await getWorkoutExerciseInDatabase(workoutId, exerciseId);

  if (row) {
    throw new Error(
      `A workout_exercises kapcsolat még létezik: ` +
        `id=${row.id}, workoutId=${workoutId}, exerciseId=${exerciseId}`,
    );
  }

  console.log(
    `[E2E WORKOUT-EXERCISE] DB cleanup ellenőrizve: ` +
      `workoutId=${workoutId}, exerciseId=${exerciseId}, kapcsolat=0`,
  );
}

export async function closeWorkoutDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}


export async function getWorkoutRelationCounts(
  workoutId: number,
): Promise<{
  translation_count: number;
  workout_exercise_count: number;
  program_workout_count: number;
  user_workout_count: number;
}> {
  const result = await db().query(
    `
      SELECT
        COUNT(DISTINCT wt.id)::int AS translation_count,
        COUNT(DISTINCT we.id)::int AS workout_exercise_count,
        COUNT(DISTINCT pw.id)::int AS program_workout_count,
        COUNT(DISTINCT uw.id)::int AS user_workout_count
      FROM public.workouts w
      LEFT JOIN public.workout_translations wt
        ON wt.workout_id = w.id
      LEFT JOIN public.workout_exercises we
        ON we.workout_id = w.id
      LEFT JOIN public.program_workouts pw
        ON pw.workout_id = w.id
      LEFT JOIN public.user_workouts uw
        ON uw.workout_id = w.id
      WHERE w.id = $1
    `,
    [workoutId],
  );

  return result.rows[0];
}
