import { Client } from 'pg';

export interface DbExercise {
  id: number;
  name: string;
}

function dbConfigured(): boolean {
  return Boolean(
    process.env.E2E_DB_HOST &&
      process.env.E2E_DB_NAME &&
      process.env.E2E_DB_USER &&
      process.env.E2E_DB_PASSWORD,
  );
}

/**
 * Reads one real exercise from PostgreSQL.
 * This helper is READ ONLY and is used only to make the UI search test
 * independent from hard-coded exercise IDs/names.
 */
export async function findExistingExercise(): Promise<DbExercise | null> {
  if (!dbConfigured()) {
    return null;
  }

  const client = new Client({
    host: process.env.E2E_DB_HOST,
    port: Number(process.env.E2E_DB_PORT ?? 5432),
    database: process.env.E2E_DB_NAME,
    user: process.env.E2E_DB_USER,
    password: process.env.E2E_DB_PASSWORD,
    ssl: process.env.E2E_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  });

  await client.connect();

  try {
    const language = process.env.E2E_LANGUAGE ?? 'hu';

    const result = await client.query<DbExercise>(
      `
        SELECT
          e.id,
          et.name
        FROM exercises e
        JOIN exercise_translations et
          ON et.exercise_id = e.id
        JOIN languages l
          ON l.id = et.language_id
        WHERE l.code = $1
        ORDER BY e.id
        LIMIT 1
      `,
      [language],
    );

    return result.rows[0] ?? null;
  } finally {
    await client.end();
  }
}
