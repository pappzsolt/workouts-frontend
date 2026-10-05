import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { apiFor, closeDb, createWorkout, db, deleteWorkout, login, rejected, success, suffix } from '../../helpers/e2e-next-3-helpers';
import { attach, cleanupAuditFixture, createAuditFixture } from '../../helpers/audit-fixture';

test.describe.configure({ timeout: 90_000 });
test.afterAll(closeDb);
test('Occurrence identity: repeated workout, occupied day, update exclusion, sparse delete', async ({ page }) => {
  await login(page, 'coach');
  const api = await apiFor(page);
  const f = await createAuditFixture(api);
  const other = await createWorkout(api);
  try {
    const one = await attach(api, f, 1);
    const five = await attach(api, f, 5);
    const nine = await attach(api, f, 9);
    const fourteen = await attach(api, f, 14);
    expect(new Set([one, five, nine, fourteen]).size).toBe(4);
    const copyName = `E2E rejected copy ${suffix()}`;
    await rejected(await api.post(API_ENDPOINTS.workouts.copy, { params: { language: 'hu' }, data: { sourceWorkoutId: f.workoutId, programId: f.programId, workoutName: copyName, workoutDate: '2035-03-01', dayIndex: 5 } }), 'Copy to occupied program day', 409);
    expect((await db().query('SELECT workout_id FROM workout_translations WHERE name=$1', [copyName])).rows).toHaveLength(0);
    await rejected(await api.post(API_ENDPOINTS.programWorkouts.base, { data: { programId: f.programId, workoutId: other, dayIndex: 0 } }), 'Non-positive day index', 400);
    await rejected(await api.post(API_ENDPOINTS.programWorkouts.base, { data: { programId: f.programId, workoutId: other, dayIndex: 5 } }), 'Other workout on occupied day', 409);
    await rejected(await api.put(API_ENDPOINTS.programWorkouts.updateById(nine), { data: { dayIndex: 5 } }), 'Move to occupied day', 409);
    await success(await api.put(API_ENDPOINTS.programWorkouts.updateById(nine), { data: { dayIndex: 9 } }), 'Retain own day');
    await success(await api.delete(API_ENDPOINTS.programWorkouts.deleteById(five)), 'Delete exactly one occurrence');
    const rows = (await db().query('SELECT id,workout_id,day_index FROM program_workouts WHERE program_id=$1 ORDER BY day_index', [f.programId])).rows;
    expect(rows).toEqual([
      { id: one, workout_id: f.workoutId, day_index: 1 },
      { id: nine, workout_id: f.workoutId, day_index: 9 },
      { id: fourteen, workout_id: f.workoutId, day_index: 14 },
    ]);
    const body = await success(await api.get(API_ENDPOINTS.programWorkouts.base, { params: { programId: f.programId } }), 'Read occurrences');
    expect(body.data.map((row: any) => row.id).sort((a: number,b: number) => a-b)).toEqual([one,nine,fourteen].sort((a,b)=>a-b));
    const attempts = await Promise.all([f.workoutId,other].map(workoutId => api.post(API_ENDPOINTS.programWorkouts.base, {data:{programId:f.programId,workoutId,dayIndex:20}})));
    expect(attempts.map(response=>response.status()).sort((a,b)=>a-b)).toEqual([200,409]);
    for(const response of attempts) {
      if(response.status()===409) await rejected(response,'Concurrent occupied-day write',409);
      else await success(response,'Concurrent winning write');
    }
    expect((await db().query('SELECT id FROM program_workouts WHERE program_id=$1 AND day_index=20',[f.programId])).rows).toHaveLength(1);
  } finally {
    try { await cleanupAuditFixture(api, f); } finally { try { await deleteWorkout(api, other); } finally { await api.dispose(); } }
  }
});
