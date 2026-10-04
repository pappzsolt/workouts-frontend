import { Pool } from 'pg';
let pool: Pool | undefined;
function getPool(): Pool {
  if (!pool) {
    const required = (name: string): string => {
      const value = process.env[name];
      if (!value || value === 'CHANGE_ME') {
        throw new Error(`Hiányzó E2E DB konfiguráció: ${name}`);
      }
      return value;
    };

    pool = new Pool({
      host: required('E2E_DB_HOST'),
      port: Number(process.env.E2E_DB_PORT ?? 5432),
      database: required('E2E_DB_NAME'),
      user: required('E2E_DB_USER'),
      password: required('E2E_DB_PASSWORD'),
      ssl: process.env.E2E_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 2,
    });
  }
  return pool;
}
export async function findExistingExercise(): Promise<{id:number; name:string}|null> {
  const language = process.env.E2E_LANGUAGE ?? 'hu';
  const r = await getPool().query(
    `SELECT e.id, et.name
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
  return r.rows[0] ?? null;
}
