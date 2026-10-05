import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { anotherCoachClientUserId, apiFor, closeDb, coachUserId, db, dbOne, login, success } from '../../helpers/e2e-next-3-helpers';
import { assign, attach, cleanupAuditFixture, createAuditFixture } from '../../helpers/audit-fixture';

test.describe.configure({ timeout: 90_000 });
test.afterAll(closeDb);
test('Assigned program: new occurrence uses each user original anchor, no duplicate assignment', async ({ page }) => {
  await login(page, 'coach');
  const api = await apiFor(page);
  const f = await createAuditFixture(api);
  try {
    const first = await coachUserId();
    const second = await anotherCoachClientUserId(first);
    const initial = await attach(api, f, 5);
    await assign(api, f, first);
    await assign(api, f, second);
    // Explicit test-only dates model older assignments without waiting for days.
    // Source rows belong exclusively to this new fixture; the scheduling under test remains API-only.
    for (const [userId, start] of [[first, '2032-01-10'], [second, '2033-02-20']] as const) {
      const changed = await db().query('UPDATE user_workouts SET scheduled_at=$3::date+4 WHERE user_id=$1 AND program_workout_id=$2', [userId,initial,start]);
      expect(changed.rowCount).toBe(1);
    }
    const before = (await db().query('SELECT id, user_id, scheduled_at::text FROM user_workouts WHERE program_workout_id=$1 ORDER BY user_id', [initial])).rows;
    const added = await attach(api, f, 14);
    const dates = (await db().query('SELECT user_id,scheduled_at::text FROM user_workouts WHERE program_workout_id=$1 ORDER BY user_id', [added])).rows;
    expect(dates).toEqual([{user_id:first,scheduled_at:'2032-01-23'},{user_id:second,scheduled_at:'2033-03-05'}].sort((a,b)=>a.user_id-b.user_id));
    expect((await db().query('SELECT id, user_id, scheduled_at::text FROM user_workouts WHERE program_workout_id=$1 ORDER BY user_id', [initial])).rows).toEqual(before);
    await assign(api, f, first);
    expect((await db().query('SELECT id, user_id, scheduled_at::text FROM user_workouts WHERE program_workout_id=$1 ORDER BY user_id', [initial])).rows).toEqual(before);
    const assigned = await success(await api.get(API_ENDPOINTS.programs.assignedUsers(f.programId)), 'Assigned user API');
    expect(assigned.data.map(Number).sort((a:number,b:number)=>a-b)).toEqual([first,second].sort((a,b)=>a-b));
    expect(Number((await dbOne('SELECT count(*) AS count FROM user_programs WHERE program_id=$1', [f.programId]))!.count)).toBe(2);
  } finally { try { await cleanupAuditFixture(api,f); } finally { await api.dispose(); } }
});

test('Empty assigned program: first occurrence uses assigned_at, not today', async ({ page }) => {
  await login(page, 'coach');
  const api = await apiFor(page);
  const f = await createAuditFixture(api);
  try {
    const userId = await coachUserId();
    await assign(api,f,userId);
    expect((await db().query("UPDATE user_programs SET assigned_at='2032-04-01 08:00:00' WHERE program_id=$1 AND user_id=$2", [f.programId,userId])).rowCount).toBe(1);
    const occurrence = await attach(api,f,9);
    expect(await dbOne('SELECT scheduled_at::text AS date FROM user_workouts WHERE program_workout_id=$1 AND user_id=$2', [occurrence,userId])).toEqual({date:'2032-04-09'});
  } finally { try { await cleanupAuditFixture(api,f); } finally { await api.dispose(); } }
});
