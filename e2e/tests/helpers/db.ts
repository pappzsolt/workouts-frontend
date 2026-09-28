import { Pool } from 'pg';
let pool: Pool | undefined;
function getPool(): Pool {
  if (!pool) {
    pool = new Pool({
      host: process.env.E2E_DB_HOST,
      port: Number(process.env.E2E_DB_PORT ?? 5432),
      database: process.env.E2E_DB_NAME,
      user: process.env.E2E_DB_USER,
      password: process.env.E2E_DB_PASSWORD,
      ssl: process.env.E2E_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 2,
    });
  }
  return pool;
}
export async function findExistingExercise(): Promise<{id:number; name:string}|null> {
  const r = await getPool().query(
    `SELECT e.id, COALESCE(et.name,'') AS name
       FROM public.exercises e
       LEFT JOIN public.exercise_translations et ON et.exercise_id=e.id
         AND et.language_id=(SELECT id FROM public.languages WHERE code=$1 LIMIT 1)
      ORDER BY e.id LIMIT 1`, [process.env.E2E_LANGUAGE ?? 'hu']);
  return r.rows[0] ?? null;
}
