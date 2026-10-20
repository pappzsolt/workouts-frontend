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
       et.description AS raw_description,
       et.body_part,
       et.synonyms,
       et.instructions,
       et.tips,
       et.primary_muscles,
       et.secondary_muscles,
       l.code AS language_code,
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

export async function resolveExistingExerciseId(
  language = 'hu',
): Promise<number> {
  const configured = process.env.E2E_EXERCISE_ID?.trim();

  if (configured) {
    const id = Number(configured);
    if (!Number.isInteger(id) || id <= 0) {
      throw new Error(`E2E_EXERCISE_ID érvénytelen: ${configured}`);
    }

    const row = await getExerciseInDatabase(id, language);
    if (!row) {
      throw new Error(`Az E2E_EXERCISE_ID=${id} exercise nem található a teszt DB-ben.`);
    }
    if (!String(row.name ?? '').trim()) {
      throw new Error(
        `Az E2E_EXERCISE_ID=${id} exercise-hez nincs használható ${language} fordítás.`,
      );
    }

    return id;
  }

  const row = await dbOne<{ id: number }>(
    `SELECT e.id
       FROM public.exercises e
       JOIN public.exercise_translations et
         ON et.exercise_id = e.id
       JOIN public.languages l
         ON l.id = et.language_id
      WHERE l.code = $1
        AND NULLIF(BTRIM(et.name), '') IS NOT NULL
      ORDER BY e.id
      LIMIT 1`,
    [language],
  );

  if (!row) {
    throw new Error(
      `Nem található használható, ${language} fordítással rendelkező exercise a teszt DB-ben.`,
    );
  }

  return Number(row.id);
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
    if (key === 'description' || key === 'raw_description') {
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

/**
 * Egy gyakorlat leírásának visszaállítása közvetlenül az adatbázisban.
 * Biztonsági háló a módosító tesztekhez: ha a teszt félúton elbukik,
 * a teszt-adatbázisban ne maradjon bent a tesztszöveg.
 */
export async function restoreExerciseDescriptionInDatabase(
  id: number,
  description: string | null,
  language = 'hu',
): Promise<void> {
  await dbOne(
    `UPDATE public.exercise_translations et
        SET description = $2
      WHERE et.exercise_id = $1
        AND et.language_id = (SELECT id FROM public.languages WHERE code = $3 LIMIT 1)
        AND et.description IS DISTINCT FROM $2
      RETURNING et.id`,
    [id, description, language],
  );
}
