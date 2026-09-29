import { dbOne } from './e2e-next-3-helpers';

export async function getExerciseInDatabase(
  id: number,
  language = 'hu',
): Promise<any | null> {
  return dbOne(
    `SELECT
       e.id,
       COALESCE(et.name, '') AS name,
       COALESCE(et.description, '') AS description,
       l.code AS language_code,
       e.muscle_group,
       e.equipment,
       e.difficulty_level,
       e.category,
       e.calories_burned_per_minute,
       e.duration_seconds
     FROM public.exercises e
     LEFT JOIN public.exercise_translations et
       ON et.exercise_id = e.id
      AND et.language_id = (
        SELECT id
        FROM public.languages
        WHERE code = $2
        LIMIT 1
      )
     LEFT JOIN public.languages l
       ON l.id = et.language_id
     WHERE e.id = $1`,
    [id, language],
  );
}

export async function assertExerciseDeleted(id: number): Promise<void> {
  const row = await getExerciseInDatabase(id);
  if (row) {
    throw new Error(`Exercise ${id} still exists`);
  }
}

/**
 * Verifies the translated description and returns the actual DB row.
 * The caller needs the row for the subsequent unchanged-fields assertion.
 */
export async function assertExerciseDescriptionInDatabase(
  id: number,
  description: string,
  language = 'hu',
): Promise<any> {
  const row = await getExerciseInDatabase(id, language);

  if (!row) {
    throw new Error(`Exercise ${id} not found`);
  }

  if (String(row.description ?? '') !== String(description)) {
    throw new Error(
      `Exercise ${id} description mismatch: expected ${JSON.stringify(description)}, received ${JSON.stringify(row.description)}`,
    );
  }

  return row;
}

/**
 * Compares two already-fetched DB snapshots.
 * Only the description is allowed to differ.
 */
export function assertExerciseUnchangedExceptDescription(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
): void {
  if (!after) {
    throw new Error('Exercise after-state is missing');
  }

  for (const key of Object.keys(before ?? {})) {
    if (key === 'description') {
      continue;
    }

    const beforeValue = before[key];
    const afterValue = after[key];

    if (String(afterValue ?? '') !== String(beforeValue ?? '')) {
      throw new Error(
        `Exercise ${before.id ?? ''}: ${key} changed unexpectedly: ${JSON.stringify(beforeValue)} -> ${JSON.stringify(afterValue)}`,
      );
    }
  }
}

export async function closeExerciseDatabase(): Promise<void> {}
