import { expect, type APIRequestContext } from '@playwright/test';
import { API_ENDPOINTS } from './api-endpoints';
import { createProgram, db, deleteProgram, suffix, success } from './e2e-next-3-helpers';
export type ProgramListFixture = { prefix: string; ids: number[]; names: string[] };
/** Fixture setup uses only real API writes; cleanup touches only this test's programs. */
export async function createProgramListFixture(api: APIRequestContext, count: number, userId?: number): Promise<ProgramListFixture> {
  const f: ProgramListFixture = { prefix: `E2E LIST ${suffix()}`, ids: [], names: [] };
  try {
    if (userId !== undefined) {
      const owner = await db().query('SELECT u.id FROM users u JOIN coaches c ON c.id=u.coach_id WHERE u.id=$1 AND c.name=$2', [userId, process.env.E2E_COACH_USERNAME]);
      expect(owner.rows, 'E2E_USER must be a client of E2E_COACH for these fixtures').toHaveLength(1);
    }
    for (let i=1; i<=count; i++) {
      const name = `${f.prefix} ${String(i).padStart(2, '0')}`;
      const id = await createProgram(api, name);
      f.ids.push(id); f.names.push(name);
      if (userId !== undefined) await success(await api.post(API_ENDPOINTS.programs.assign, { data: { programId:id, userId } }), 'Fixture assignment');
    }
    const rows = await db().query('SELECT id FROM programs WHERE id=ANY($1::int[]) ORDER BY id', [f.ids]);
    expect(rows.rows.map(row => row.id)).toEqual([...f.ids].sort((a,b)=>a-b));
    return f;
  } catch (error) {
    try { await cleanupProgramListFixture(api, f); }
    catch (cleanupError) { throw new AggregateError([error, cleanupError], 'Fixture creation and cleanup failed'); }
    throw error;
  }
}
export async function cleanupProgramListFixture(api: APIRequestContext, f: ProgramListFixture): Promise<void> {
  const errors: unknown[]=[];
  for (const id of f.ids) { try { await deleteProgram(api,id); } catch(error) { errors.push(error); } }
  if(errors.length) throw new AggregateError(errors,'Program fixture cleanup failed');
  const rows=await db().query('SELECT id FROM programs WHERE id=ANY($1::int[]) UNION ALL SELECT program_id FROM user_programs WHERE program_id=ANY($1::int[])',[f.ids]);
  expect(rows.rows,'Fixture programs and assignments must be deleted').toEqual([]);
}
