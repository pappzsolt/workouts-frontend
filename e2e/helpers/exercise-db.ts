import { Pool } from 'pg';

export interface ExerciseDbRow {
  id: number;
  name: string;
  description: string | null;
  body_part: string | null;
  synonyms: string | null;
  instructions: string | null;
  tips: string | null;
  primary_muscles: string | null;
  secondary_muscles: string | null;
  image_url: string | null;
  video_url: string | null;
  muscle_group: string | null;
  equipment: string | null;
  difficulty_level: string | null;
  category: string | null;
  calories_burned_per_minute: number | string | null;
  duration_seconds: number | string | null;
  done: boolean | null;
  force_type: string | null;
  mechanic: string | null;
  is_unilateral: boolean | null;
  is_bodyweight: boolean | null;
  variation_group: string | null;
  language_code: string;
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
 * Az E2E dumpban a 1046-os exercise létezik, magyar fordítással:
 * "széles evezés csigán".
 *
 * A teszt alapértelmezésben ezt használja. E2E_EXERCISE_ID-del
 * másik meglévő exercise adható meg.
 */
export function configuredExerciseId(): number {
  const value = Number(process.env.E2E_EXERCISE_ID ?? 1046);

  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`Érvénytelen E2E_EXERCISE_ID: ${process.env.E2E_EXERCISE_ID}`);
  }

  return value;
}

export async function getExerciseBaseline(
  exerciseId: number = configuredExerciseId(),
): Promise<ExerciseDbRow> {
  const languageCode = process.env.E2E_LANGUAGE ?? 'hu';

  const result = await db().query<ExerciseDbRow>(
    `
      SELECT
        e.id,
        et.name,
        et.description,
        et.body_part,
        et.synonyms,
        et.instructions,
        et.tips,
        et.primary_muscles,
        et.secondary_muscles,
        e.image_url,
        e.video_url,
        e.muscle_group,
        e.equipment,
        e.difficulty_level,
        e.category,
        e.calories_burned_per_minute,
        e.duration_seconds,
        e.done,
        e.force_type,
        e.mechanic,
        e.is_unilateral,
        e.is_bodyweight,
        e.variation_group,
        l.code AS language_code
      FROM public.exercises e
      JOIN public.exercise_translations et
        ON et.exercise_id = e.id
      JOIN public.languages l
        ON l.id = et.language_id
      WHERE e.id = $1
        AND lower(l.code) = lower($2)
    `,
    [exerciseId, languageCode],
  );

  if (result.rowCount !== 1) {
    throw new Error(
      `Az exercise ${exerciseId} nem található a public.exercises + ` +
        `exercise_translations táblákban language=${languageCode} mellett.`,
    );
  }

  return result.rows[0];
}

export async function assertExerciseInDatabase(
  exerciseId: number,
  expected: ExerciseDbRow,
): Promise<ExerciseDbRow> {
  const actual = await getExerciseBaseline(exerciseId);

  const fields: Array<keyof ExerciseDbRow> = [
    'name',
    'description',
    'body_part',
    'synonyms',
    'instructions',
    'tips',
    'primary_muscles',
    'secondary_muscles',
    'image_url',
    'video_url',
    'muscle_group',
    'equipment',
    'difficulty_level',
    'category',
    'calories_burned_per_minute',
    'duration_seconds',
    'done',
    'force_type',
    'mechanic',
    'is_unilateral',
    'is_bodyweight',
    'variation_group',
    'language_code',
  ];

  for (const field of fields) {
    if (actual[field] !== expected[field]) {
      throw new Error(
        `Exercise ${String(field)} eltérés: ` +
          `DB=${String(actual[field])}, expected=${String(expected[field])}`,
      );
    }
  }

  return actual;
}

export async function closeExerciseDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
