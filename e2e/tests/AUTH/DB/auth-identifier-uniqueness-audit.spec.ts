import { test, expect, request } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { BASE_API_URL } from '../../helpers/e2e-next-3-helpers';
import { Pool, type PoolClient } from 'pg';
import { randomUUID } from 'node:crypto';

function pool(): Pool {
  const required = (name: string) => {
    const value = process.env[name];
    if (!value || value === 'CHANGE_ME') throw new Error(`Missing E2E DB configuration: ${name}`);
    return value;
  };
  return new Pool({ host: required('E2E_DB_HOST'), port: Number(process.env.E2E_DB_PORT ?? 5432),
    database: required('E2E_DB_NAME'), user: required('E2E_DB_USER'), password: required('E2E_DB_PASSWORD'),
    ssl: process.env.E2E_DB_SSL === 'true' ? { rejectUnauthorized: false } : false, max: 3 });
}
const key = () => `audit_${randomUUID().replaceAll('-', '').slice(0, 20)}`;
async function user(db: PoolClient, name: string, email: string): Promise<number> {
  const result = await db.query('INSERT INTO public.users(username,email,password_hash) VALUES($1,$2,$3) RETURNING id',
    [name, email, 'audit-fixture-no-login']);
  return result.rows[0].id;
}
async function coach(db: PoolClient, name: string, email: string): Promise<number> {
  const result = await db.query('INSERT INTO public.coaches(name,email,password_hash) VALUES($1,$2,$3) RETURNING id',
    [name, email, 'audit-fixture-no-login']);
  return result.rows[0].id;
}
async function rejects(db: PoolClient, operation: () => Promise<unknown>, code: string) {
  await db.query('SAVEPOINT expected_rejection');
  try { await expect(operation()).rejects.toMatchObject({ code }); }
  finally { await db.query('ROLLBACK TO SAVEPOINT expected_rejection'); }
}

test('auth aliases: global normalized uniqueness, same-owner alias, updates and delete lifecycle', async () => {
  const p = pool(); const db = await p.connect();
  try {
    await db.query('BEGIN');
    const alias = key();
    const id = await user(db, alias, alias);
    expect((await db.query('SELECT identifier FROM public.account_login_identifiers WHERE user_id=$1', [id])).rows)
      .toEqual([{ identifier: alias }]);
    await rejects(db, () => user(db, alias.toUpperCase(), `${key()}@example.invalid`), '23505');
    await rejects(db, () => user(db, key(), alias.toUpperCase()), '23505');
    await rejects(db, () => coach(db, ` ${alias.toUpperCase()} `, `${key()}@example.invalid`), '23505');
    await rejects(db, () => coach(db, key(), alias.toUpperCase()), '23505');
    const coachAlias = key(); const coachId = await coach(db, coachAlias, `${key()}@example.invalid`);
    await rejects(db, () => user(db, coachAlias.toUpperCase(), `${key()}@example.invalid`), '23505');
    await rejects(db, () => coach(db, coachAlias.toUpperCase(), `${key()}@example.invalid`), '23505');
    await rejects(db, () => db.query('UPDATE public.users SET email=$1 WHERE id=$2', [coachAlias, id]), '23505');
    expect((await db.query('SELECT identifier FROM public.account_login_identifiers WHERE user_id=$1', [id])).rows)
      .toEqual([{ identifier: alias }]);
    const replacement = `${key()}@example.invalid`;
    await db.query('UPDATE public.users SET username=$1,email=$1 WHERE id=$2', [replacement, id]);
    expect((await db.query('SELECT identifier FROM public.account_login_identifiers WHERE user_id=$1', [id])).rows)
      .toEqual([{ identifier: replacement }]);
    await coach(db, alias, `${key()}@example.invalid`); // released old alias is reusable
    await rejects(db, () => user(db, '   ', `${key()}@example.invalid`), '23514');
    await db.query('DELETE FROM public.coaches WHERE id=$1', [coachId]);
    expect((await db.query('SELECT 1 FROM public.account_login_identifiers WHERE coach_id=$1', [coachId])).rowCount).toBe(0);
  } finally { await db.query('ROLLBACK'); db.release(); await p.end(); }
});

test('auth aliases: concurrent USER/COACH claims cannot both commit', async () => {
  const p = pool(); const first = await p.connect(); const second = await p.connect();
  const alias = key(); let firstId: number | undefined;
  try {
    await first.query('BEGIN'); await second.query('BEGIN');
    await second.query("SET LOCAL statement_timeout = '10000ms'");
    firstId = await user(first, key(), alias);
    const pid = (await second.query('SELECT pg_backend_pid() AS pid')).rows[0].pid;
    const attempt = coach(second, alias.toUpperCase(), `${key()}@example.invalid`)
      .then(() => ({ code: 'ACCEPTED' }), (error: { code: string }) => ({ code: error.code }));
    await expect.poll(async () => (await p.query(
      'SELECT wait_event_type FROM pg_stat_activity WHERE pid=$1', [pid])).rows[0]?.wait_event_type,
      { timeout: 5000 }).toBe('Lock');
    await first.query('COMMIT');
    expect(await attempt).toEqual({ code: '23505' });
  } finally {
    await second.query('ROLLBACK'); await first.query('ROLLBACK');
    if (firstId !== undefined) await first.query('DELETE FROM public.users WHERE id=$1', [firstId]);
    first.release(); second.release(); await p.end();
  }
});

for (const kind of ['USER', 'COACH'] as const) {
  test(`auth login: ${kind} email is case insensitive and resolves the correct owner`, async () => {
    const identifier = process.env[`E2E_${kind}_USERNAME`];
    const password = process.env[`E2E_${kind}_PASSWORD`];
    expect(identifier, `Missing E2E_${kind}_USERNAME`).toBeTruthy();
    expect(password, `Missing E2E_${kind}_PASSWORD`).toBeTruthy();
    const p = pool();
    const api = await request.newContext({ baseURL: BASE_API_URL });
    try {
      const table = kind === 'USER' ? 'users' : 'coaches';
      const name = kind === 'USER' ? 'username' : 'name';
      const accounts = await p.query(`SELECT id,email FROM public.${table}
        WHERE lower(btrim(${name}))=lower(btrim($1)) OR lower(btrim(email))=lower(btrim($1))`, [identifier]);
      expect(accounts.rowCount).toBe(1);
      const account = accounts.rows[0];
      const response = await api.post(API_ENDPOINTS.auth.login, {
        data: { username: ` ${String(account.email).toUpperCase()} `, password },
      });
      expect(response.status()).toBe(200);
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data?.accessToken).toBeTruthy();
      const payload = JSON.parse(Buffer.from(body.data.accessToken.split('.')[1], 'base64url').toString('utf8'));
      expect(payload.accountType).toBe(kind);
      expect(Number(payload.id)).toBe(Number(account.id));
    } finally { await api.dispose(); await p.end(); }
  });
}
