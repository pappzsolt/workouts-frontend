import { test, expect, plan, complete, result, signIn, API, unique, response, date } from './scenario-fixture';
import { request } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BACKEND } from './live-fixture';

for (const route of ['summary', 'workouts', 'strength'] as const) {
  test(`Statisztika ${route}: saját eredmény, idegen user elkülönítése és szerepkörök`, async ({ page, actors: a }) => {
    const p = await plan(a.coach, a.user, { days: [1], sets: 1, exercises: 1 }); await complete(a.user, p.scheduled[0].user_workout_id, 40);
    const path = route === 'summary' ? '/api/user/program-statistics' : route === 'workouts' ? `/api/user/program-statistics/workouts?from=${date(-7)}&to=${date(1)}` : `/api/user/program-statistics/exercises/${p.exercises[0].id}/strength-progress?from=${date(-7)}&to=${date(1)}`;
    const own = await result(a.user.api, path), foreign = await result(a.outsider.api, path);
    if (route === 'summary') { expect(own.totalPrograms).toBe(1); expect(own.completedPrograms).toBe(1); expect(own.programs[0].completedWorkouts).toBe(1); expect(foreign.totalPrograms).toBe(0); expect(JSON.stringify(own)).toContain(p.name); expect(JSON.stringify(foreign)).not.toContain(p.name); }
    else if (route === 'workouts') { expect(own.weeklyActivity.reduce((n: number, r: any) => n + r.workoutCount, 0)).toBe(1); expect(own.weeklyActivity.reduce((n: number, r: any) => n + r.totalVolume, 0)).toBe(320); expect(foreign.weeklyActivity.every((r: any) => r.workoutCount === 0 && r.totalVolume === 0)).toBe(true); }
    else { expect(own).toHaveLength(1); expect(own[0].bestWeightKg).toBe(40); expect(own[0].repetitions).toBe(8); expect(own[0].estimatedOneRepMax).toBeCloseTo(40 * (1 + 8 / 30), 1); expect(foreign).toEqual([]); }
    const anonymous = await request.newContext({ baseURL: API }); try { expect((await anonymous.get(path)).status()).toBe(401); } finally { await anonymous.dispose(); }
    expect((await a.coach.api.get(path)).status()).toBe(403); expect((await a.admin.get(path)).status()).toBe(200);
    await signIn(page, a.user); const api = page.waitForResponse(r => new URL(r.url()).pathname === '/api/user/program-statistics'); await page.goto('/user/program-statistics'); expect((await api).status()).toBe(200);
    await expect(page.locator('app-user-program-statistics')).toContainText(p.name);
  });
}

async function authFixture() {
  const descriptor = JSON.parse(readFileSync(join(BACKEND, 'target/live-auth-environment.json'), 'utf8'));
  const api = await request.newContext({ baseURL: descriptor.apiURL });
  const auth = await (await api.post('/api/auth/login', { data: descriptor.accounts.admin })).json(); expect(auth.success).toBe(true);
  const headers = { Authorization: `Bearer ${auth.data.accessToken}` };
  const roles = (await (await api.get('/api/roles', { headers })).json()).data;
  const username = unique('auth'), password = 'Auth-password-123!', email = `${username}@example.test`;
  const created = await api.post('/api/members', { headers, data: { type: 'user', username, password, email, roleIds: [roles.find((r: any) => r.name === 'USER').id] } }); expect(created.status()).toBe(200);
  return { api, username, password, email, base: descriptor.apiURL };
}

test('Valódi tokenlejárat: lejárt access tiltott, refresh új access tokent ad', async () => {
  const a = await authFixture(); try {
    const login = await (await a.api.post('/api/auth/login', { data: { username: a.username, password: a.password } })).json(); expect(login.success).toBe(true);
    const headers = { Authorization: `Bearer ${login.data.accessToken}` };
    expect((await a.api.get('/api/programs/my/assigned', { headers })).status()).toBe(200);
    await expect.poll(async () => (await a.api.get('/api/programs/my/assigned', { headers })).status(), { timeout: 14000, intervals: [500] }).toBe(401);
    const refreshed = await a.api.post('/api/auth/refresh', { data: { refreshToken: login.data.refreshToken } }); expect(refreshed.status()).toBe(200);
    const token = (await refreshed.json()).data.accessToken;
    expect((await a.api.get('/api/programs/my/assigned', { headers: { Authorization: `Bearer ${token}` } })).status()).toBe(200);
  } finally { await a.api.dispose(); }
});

test('Valódi refresh-lejárat: az időkorlát után a munkamenet nem hosszabbítható', async () => {
  const a = await authFixture(); try {
    const auth = await (await a.api.post('/api/auth/login', { data: { username: a.username, password: a.password } })).json();
    const expiry = JSON.parse(Buffer.from(auth.data.refreshToken.split('.')[1], 'base64url').toString()).exp * 1000;
    await expect.poll(() => Date.now(), { timeout: 24000, intervals: [500] }).toBeGreaterThan(expiry + 1000);
    expect((await a.api.post('/api/auth/refresh', { data: { refreshToken: auth.data.refreshToken } })).status()).toBe(401);
  } finally { await a.api.dispose(); }
});

test('Fiókzárolás: hibás próbálkozások, helyes jelszó tiltása, időzített feloldás', async () => {
  const a = await authFixture(); try {
    for (let i = 0; i < 3; i++) { const r = await a.api.post('/api/auth/login', { data: { username: a.username, password: 'Wrong-password-123!' } }); expect([401, 429]).toContain(r.status()); }
    expect((await a.api.post('/api/auth/login', { data: { username: a.username, password: a.password } })).status()).toBe(429);
    await expect.poll(async () => (await a.api.post('/api/auth/login', { data: { username: a.username, password: a.password } })).status(), { timeout: 6000, intervals: [600] }).toBe(200);
  } finally { await a.api.dispose(); }
});

test('Két böngészős munkamenet: kijelentkezés csak a saját tokencsaládot vonja vissza', async ({ page, browser, actors: a }) => {
  await signIn(page, a.user); const other = await browser.newContext({ baseURL: 'http://127.0.0.1:4323' });
  try { const second = await other.newPage(); await second.addInitScript(() => localStorage.setItem('language', 'hu')); await signIn(second, a.user);
    const logged = response(page, 'POST', '/api/auth/web/logout'); await page.getByRole('banner').getByRole('button', { name: 'Kijelentkezés', exact: true }).click(); expect((await logged).status()).toBe(200);
    await second.reload(); await expect(second).toHaveURL(/\/user\/dashboard$/); await page.goto('/user/profile'); await expect(page).toHaveURL(/\/login$/);
  } finally { await other.close(); }
});

test('Elfelejtett jelszó: valódi hálózatkimaradás után az űrlap újrapróbálható', async ({ page, context, actors: a }) => {
  await page.goto('/forgot-password'); await page.locator('#forgot-password-email').fill(a.user.email); await context.setOffline(true);
  await page.locator('app-forgot-password button[type=submit]').click(); await expect(page.locator('app-forgot-password app-message[type=error]')).toBeVisible();
  await expect(page.locator('#forgot-password-email')).toHaveValue(a.user.email); await context.setOffline(false);
  const retry = response(page, 'POST', '/api/auth/forgot-password'); await page.locator('app-forgot-password button[type=submit]').click(); expect((await retry).status()).toBe(200);
  await expect(page.locator('app-forgot-password app-message[type=success]')).toBeVisible();
});

test('SMTP-hiba: valódi 451-es elutasítás után az outbox kézbesít, a reset token használható', async () => {
  const a = await authFixture(); const mailbox = await request.newContext({ baseURL: 'http://127.0.0.1:8026' });
  try {
    const before = await (await mailbox.post('/delivery-failures?count=1')).json();
    expect((await a.api.post('/api/auth/forgot-password', { data: { email: a.email } })).status()).toBe(200);
    await expect.poll(async () => (await (await mailbox.get('/delivery-failures')).json()).rejectedDeliveries, { timeout: 15000 }).toBe(before.rejectedDeliveries + 1);
    let messages: any[] = []; await expect.poll(async () => { messages = await (await mailbox.get('/messages', { params: { to: a.email } })).json(); return messages.length; }, { timeout: 15000 }).toBe(1);
    let raw = messages[0].raw; const split = raw.indexOf('\r\n\r\n');
    const headers = raw.slice(0, split), body = raw.slice(split + 4);
    if (/Content-Transfer-Encoding:\s*base64/i.test(headers)) raw = Buffer.from(body.replace(/\s/g, ''), 'base64').toString();
    else if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(headers)) raw = body.replace(/=\r\n/g, '').replace(/=([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
    else raw = body;
    const token = raw.match(/reset-password\?token=([a-f0-9]+)/i)?.[1]; expect(token).toBeTruthy();
    expect((await a.api.post('/api/auth/reset-password', { data: { token, newPassword: 'SMTP-changed-password-456!' } })).status()).toBe(200);
    expect((await a.api.post('/api/auth/login', { data: { username: a.username, password: 'SMTP-changed-password-456!' } })).status()).toBe(200);
  } finally { await mailbox.post('/delivery-failures?count=0'); await mailbox.dispose(); await a.api.dispose(); }
});
