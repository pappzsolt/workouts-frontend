import { Pool } from 'pg';

export interface ExerciseDbRow {
  id: number;
  language_code: string;
  name: string | null;
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
  calories_burned_per_minute: string | number | null;
  duration_seconds: string | number | null;
  done: boolean | null;
  force_type: string | null;
  mechanic: string | null;
  is_unilateral: boolean | null;
  is_bodyweight: boolean | null;
  variation_group: string | null;
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

export async function getExerciseInDatabase(
  exerciseId: number,
  languageCode = process.env.E2E_LANGUAGE ?? 'hu',
): Promise<ExerciseDbRow> {
  const result = await db().query<ExerciseDbRow>(
    `
      SELECT
        e.id,

        l.code AS language_code,

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
        e.variation_group

      FROM public.exercises e

      JOIN public.exercise_translations et
        ON et.exercise_id = e.id

      JOIN public.languages l
        ON l.id = et.language_id
       AND lower(l.code) = lower($2)

      WHERE e.id = $1
      LIMIT 1
    `,
    [exerciseId, languageCode],
  );

  if (result.rowCount !== 1) {
    throw new Error(
      `Az exercise ${exerciseId} nem található a public.exercises táblában.`,
    );
  }

  const row = result.rows[0];

  if (!row.language_code) {
    throw new Error(
      `Az exercise ${exerciseId} esetén nincs ${languageCode} nyelvű translation.`,
    );
  }

  return row;
}

export async function assertExerciseDescriptionInDatabase(
  exerciseId: number,
  expectedDescription: string | null,
  languageCode = process.env.E2E_LANGUAGE ?? 'hu',
): Promise<ExerciseDbRow> {
  const row = await getExerciseInDatabase(exerciseId, languageCode);

  if (row.description !== expectedDescription) {
    throw new Error(
      `exercise_translations.description eltérés: ` +
        `DB=${JSON.stringify(row.description)}, ` +
        `expected=${JSON.stringify(expectedDescription)}`,
    );
  }

  return row;
}

export function assertExerciseUnchangedExceptDescription(
  before: ExerciseDbRow,
  after: ExerciseDbRow,
): void {
  const fields: Array<keyof ExerciseDbRow> = [
    'id',
    'language_code',
    'name',
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
  ];

  for (const field of fields) {
    if (before[field] !== after[field]) {
      throw new Error(
        `Az exercise módosításakor a "${field}" is megváltozott: ` +
          `előtte=${JSON.stringify(before[field])}, ` +
          `utána=${JSON.stringify(after[field])}`,
      );
    }
  }
}

export async function closeExerciseDatabase(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = undefined;
  }
}
