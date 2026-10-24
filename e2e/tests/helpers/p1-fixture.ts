import { randomUUID } from 'node:crypto';
import { test as base, expect, request, type APIRequestContext, type Page } from '@playwright/test';
import { API_ENDPOINTS as E } from './api-endpoints';
import { apiFor, BASE_API_URL, db, dbOne, login, success } from './e2e-next-3-helpers';
import { loginControls } from './auth-session';
import { setTestLanguage } from './read-only';
import { assign, attach, cleanupAuditFixture, createAuditFixture, type AuditFixture } from './audit-fixture';

export type Account = { username: string; email: string; password: string; id: number; coachId: number };
export function accountIdentity() {
  const username = `e2e_p1_${randomUUID().replaceAll('-', '')}`;
  return { username, email: `${username}@example.invalid`, password: `P1-${randomUUID()}!` };
}

/** No member DELETE API exists. Delete only this random test identity, never shared E2E users. */
export async function cleanupAccount(identity: Pick<Account, 'username' | 'email'>) {
  const client = await db().connect();
  try {
    await client.query('BEGIN');
    const users = await client.query('SELECT id FROM users WHERE username=$1 AND email=$2', [identity.username, identity.email]);
    const ids = users.rows.map(row => row.id);
    await client.query('DELETE FROM registration_requests WHERE login_name=$1 AND email=$2', [identity.username, identity.email]);
    await client.query("DELETE FROM password_reset_email_outbox WHERE account_type='USER' AND account_id=ANY($1::int[])", [ids]);
    await client.query("DELETE FROM password_reset_tokens WHERE account_type='USER' AND account_id=ANY($1::int[])", [ids]);
    await client.query("DELETE FROM refresh_token_families WHERE account_type='USER' AND account_id=ANY($1::int[])", [ids]);
    await client.query("DELETE FROM account_token_versions WHERE account_type='USER' AND account_id=ANY($1::int[])", [ids]);
    await client.query('DELETE FROM users WHERE id=ANY($1::int[]) AND username=$2 AND email=$3', [ids, identity.username, identity.email]);
    await client.query('COMMIT');
    expect((await client.query('SELECT id FROM users WHERE username=$1 OR email=$2', [identity.username, identity.email])).rows).toEqual([]);
    expect((await client.query('SELECT id FROM registration_requests WHERE login_name=$1 OR email=$2', [identity.username, identity.email])).rows).toEqual([]);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally { client.release(); }
}

/** Signs in a newly created fixture through the actual form; never injects browser tokens. */
export async function loginAccount(page: Page, account: Pick<Account, 'username' | 'password' | 'id'>): Promise<APIRequestContext> {
  await page.context().clearCookies({ name: 'workouts_refresh' });
  await page.goto('/login');
  const controls = loginControls(page);
  await controls.usernameInput.fill(account.username);
  await controls.passwordInput.fill(account.password);
  const pending = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/auth/web/login');
  await controls.submitButton.click();
  const response = await pending;
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(body.data.refreshToken).toBeUndefined();
  const token = body.data.accessToken;
  expect(typeof token).toBe('string');
  const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
  expect(Number(payload.id)).toBe(Number(account.id));
  expect(String(payload.roles).split(',')).toContain('ROLE_USER');
  await expect(page).toHaveURL(/\/user\/dashboard$/);
  const cookie = (await page.context().cookies()).find(c => c.name === 'workouts_refresh');
  expect(cookie?.httpOnly).toBe(true);
  return request.newContext({ baseURL: BASE_API_URL, extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
}

export type Plan = AuditFixture & { owner: APIRequestContext; coach: APIRequestContext; account: Account; workouts: any[]; sets: any[] };
export const test = base.extend<{ account: Account; plan: Plan }>({
  account: async ({ page }, use) => {
    const identity = accountIdentity();
    await setTestLanguage(page);
    await login(page, 'admin');
    const admin = await apiFor(page);
    try {
      const coach = await dbOne('SELECT id FROM coaches WHERE name=$1', [process.env.E2E_COACH_USERNAME]);
      const role = await dbOne("SELECT id FROM roles WHERE name IN ('USER','ROLE_USER') ORDER BY id LIMIT 1");
      expect(coach).not.toBeNull(); expect(role).not.toBeNull();
      await success(await admin.post(E.members.base, { data: {
        type: 'user', username: identity.username, email: identity.email, passwordHash: identity.password,
        coachId: coach.id, roleIds: [role.id], age: 30,
      } }), 'Create isolated P1 account');
      const stored = await dbOne('SELECT id,coach_id FROM users WHERE username=$1 AND email=$2', [identity.username, identity.email]);
      expect(stored).not.toBeNull(); expect(stored.coach_id).toBe(coach.id);
      await use({ ...identity, id: stored.id, coachId: coach.id });
    } finally {
      try { await cleanupAccount(identity); } finally { await admin.dispose(); }
    }
  },
  plan: async ({ page, account }, use) => {
    await login(page, 'coach');
    const coach = await apiFor(page);
    let fixture: AuditFixture | undefined;
    let owner: APIRequestContext | undefined;
    let assigned = false;
    try {
      fixture = await createAuditFixture(coach);
      await success(await coach.put(E.userPrograms.byId(fixture.programId), { data: {
        userId: null, programName: `P1 ${account.username}`, programDescription: 'Isolated acceptance fixture',
        durationDays: 30, startDate: '2025-03-03', difficultyLevel: 'intermediate', languageCode: 'hu', workouts: null,
      } }), 'Set deterministic program dates');
      await success(await coach.put('/api/workout-exercises/prescription', {
        params: { workoutId: fixture.workoutId, exerciseId: fixture.exerciseId },
        data: { sets: 3, repetitions: 10, restSeconds: 300 },
      }), 'Prescribe exactly three sets');
      await attach(coach, fixture, 1); await attach(coach, fixture, 8);
      await assign(coach, fixture, account.id);
      assigned = true;
      owner = await loginAccount(page, account);
      const workouts = (await db().query('SELECT * FROM user_workouts WHERE program_id=$1 AND user_id=$2 ORDER BY scheduled_at,id', [fixture.programId, account.id])).rows;
      expect(workouts).toHaveLength(2);
      const sets = (await db().query(`SELECT s.*, e.user_workout_id FROM user_workout_exercise_sets s
        JOIN user_workout_exercises e ON e.id=s.user_workout_exercise_id
        JOIN user_workouts w ON w.id=e.user_workout_id WHERE w.program_id=$1 AND w.user_id=$2 ORDER BY w.id,s.set_number`, [fixture.programId, account.id])).rows;
      for (const workout of workouts) expect(sets.filter(s => s.user_workout_id === workout.id)).toHaveLength(3);
      await use({ ...fixture, owner, coach, account, workouts, sets });
    } finally {
      try {
        if (fixture) {
          // Remove this account's completed history through the owner API before template cleanup.
          // Also recover a client if setup failed before its normal login.
          if (assigned) {
            if (!owner) owner = await loginAccount(page, account);
            await success(await owner.delete(E.programs.myById(fixture.programId)), 'Remove P1 personal execution history');
          }
          await cleanupAuditFixture(coach, fixture);
        }
      } finally { await owner?.dispose(); await coach.dispose(); }
    }
  },
});
export { expect };
