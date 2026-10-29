import { test, expect, actor, ok } from './scenario-fixture';
import { BACKEND } from './live-fixture';
import { request } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

test('Webes munkamenet: valódi access-lejárat, HttpOnly refresh és kijelentkezés', async () => {
  const env = JSON.parse(readFileSync(join(BACKEND, 'target/live-auth-environment.json'), 'utf8'));
  const api = await request.newContext({ baseURL: env.apiURL });
  let admin: Awaited<ReturnType<typeof request.newContext>> | undefined, user: Awaited<ReturnType<typeof actor>> | undefined;
  try {
    const rootLogin = await ok(await api.post('/api/auth/login', { data: env.accounts.admin }));
    admin = await request.newContext({ baseURL: env.apiURL, extraHTTPHeaders: { Authorization: `Bearer ${rootLogin.data.accessToken}` } });
    user = await actor(admin, 'user', undefined, env.apiURL);
    const origin = { Origin: 'http://127.0.0.1:4323' };
    const logged = await ok(await api.post('/api/auth/web/login', { headers: origin, data: { username: user.username, password: user.password } }));
    expect(logged.data.refreshToken).toBeUndefined();
    const cookie = (await api.storageState()).cookies.find(c => c.name === 'workouts_refresh'); expect(cookie?.httpOnly).toBe(true);
    const headers = { Authorization: `Bearer ${logged.data.accessToken}` };
    expect((await api.get('/api/programs/my/assigned', { headers })).status()).toBe(200);
    await expect.poll(async () => (await api.get('/api/programs/my/assigned', { headers })).status(), { timeout: 14000, intervals: [500] }).toBe(401);
    const refreshed = await ok(await api.post('/api/auth/web/refresh', { headers: origin, data: {} })); expect(refreshed.data.refreshToken).toBeUndefined();
    expect((await api.get('/api/programs/my/assigned', { headers: { Authorization: `Bearer ${refreshed.data.accessToken}` } })).status()).toBe(200);
    await ok(await api.post('/api/auth/web/logout', { headers: origin, data: {} }));
    expect((await api.storageState()).cookies.filter(c => c.name === 'workouts_refresh')).toHaveLength(0);
    expect((await api.post('/api/auth/web/refresh', { headers: origin, data: {} })).status()).toBe(401);
  } finally { await user?.api.dispose(); await admin?.dispose(); await api.dispose(); }
});
