import { test, expect, login, apiFor, ok, workoutBody, environment } from './live-fixture';
import { randomUUID } from 'node:crypto';

for (const language of ['hu', 'en', 'de']) {
  test(`Valódi API: coach böngészőben edzést hoz létre, szerkeszt és visszaolvas (${language})`, async ({ page, coach }) => {
    await login(page, 'coach'); await page.goto('/coach/workouts/new');
    const name = `Live ${language} ${randomUUID().slice(0, 8)}`; let id: number | undefined;
    try {
      await page.locator('app-language-selector select').first().selectOption(language);
      await page.locator('#workoutName').fill(name); await page.locator('#description').fill('Valódi böngészős leírás');
      await page.locator('#workoutDate').fill('2026-10-25'); await page.locator('#durationMinutes').fill('45');
      const created = page.waitForResponse(r => new URL(r.url()).pathname === '/api/workouts' && r.request().method() === 'POST');
      await page.locator('app-newworkout button[type=submit]').click();
      const response = await created; expect(response.status()).toBe(200); const body = await response.json();
      id = body.data.id; expect(id).toBeGreaterThan(0);
      expect(new URL(response.url()).searchParams.get('language')).toBe(language);
      await expect(page).toHaveURL(new RegExp(`/coach/workouts/${id}/edit$`));
      await expect(page.locator('#workoutName')).toHaveValue(name);
      await page.locator('#workoutName').fill(`${name} updated`); await page.locator('#description').fill('Módosított leírás');
      const saved = page.waitForResponse(r => new URL(r.url()).pathname === `/api/workouts/${id}` && r.request().method() === 'PUT');
      await page.locator('app-coach-workout-edit button[type=submit]').click(); expect((await saved).status()).toBe(200);
      const persisted = await ok(await coach.get(`/api/workouts/${id}`, { params: { language } }));
      expect(persisted.data.workoutName).toBe(`${name} updated`); expect(persisted.data.workoutDescription).toBe('Módosított leírás');
      await page.reload(); await expect(page.locator('#workoutName')).toHaveValue(`${name} updated`);
    } finally { if (id) await ok(await coach.delete(`/api/workouts/${id}`)); }
  });
}

test('Valódi API: hibás új-edzés űrlap nem küld írást, javítás után menthető', async ({ page, coach }) => {
  await login(page, 'coach'); await page.goto('/coach/workouts/new');
  const writes: string[] = [];
  page.on('request', r => { if (r.method() === 'POST' && new URL(r.url()).pathname === '/api/workouts') writes.push(r.url()); });
  await expect(page.locator('app-newworkout button[type=submit]')).toBeDisabled();
  expect(writes).toEqual([]);
  await page.locator('#workoutName').fill(`Live validation ${randomUUID().slice(0, 8)}`); await page.locator('#workoutDate').fill('2026-10-25');
  const created = page.waitForResponse(r => new URL(r.url()).pathname === '/api/workouts' && r.request().method() === 'POST');
  await page.locator('app-newworkout button[type=submit]').click(); const response = await created;
  expect(response.status()).toBe(200); const id = (await response.json()).data.id;
  try { await expect(page).toHaveURL(new RegExp(`/coach/workouts/${id}/edit$`)); expect(writes).toHaveLength(1); }
  finally { await ok(await coach.delete(`/api/workouts/${id}`)); }
});

test('Valódi API: másik coach edzését a böngésző nem tudja módosítani', async ({ page, coach }) => {
  const id = (await ok(await coach.post('/api/workouts', { data: workoutBody(`Private ${randomUUID()}`) }))).data.id;
  try {
    await login(page, 'otherCoach');
    const denied = page.waitForResponse(r => new URL(r.url()).pathname === `/api/workouts/${id}` && r.request().method() === 'GET');
    await page.goto(`/coach/workouts/${id}/edit`); expect((await denied).status()).toBe(403);
    await expect(page.locator('app-coach-workout-edit app-message').first()).toBeVisible();
    await expect(page.locator('app-coach-workout-edit button[type=submit]')).toBeDisabled();
    const persisted = await ok(await coach.get(`/api/workouts/${id}`)); expect(persisted.data.workoutName).toContain('Private');
  } finally { await ok(await coach.delete(`/api/workouts/${id}`)); }
});

for (const role of ['coach', 'user', 'admin']) {
  test(`Valódi API: HttpOnly munkamenet újratöltés után helyreáll (${role})`, async ({ page }) => {
    await login(page, role);
    const refreshed = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/web/refresh');
    await page.reload(); expect((await refreshed).status()).toBe(200);
    await expect(page).toHaveURL(new RegExp(`/${role}/dashboard$`));
    expect((await page.context().cookies()).find(c => c.name === 'workouts_refresh')?.httpOnly).toBe(true);
  });
}

test('Valódi API: coach és user nem kérhet adminisztrátori regisztrációs listát', async () => {
  for (const role of ['coach', 'user']) {
    const api = await apiFor(role);
    try { expect((await api.get('/api/admin/registrations')).status()).toBe(403); }
    finally { await api.dispose(); }
  }
});

test('Valódi API: admin jóváhagyás előtt nincs belépés, utána valódi user munkamenet jön létre', async ({ page }) => {
  const name = `live_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const password = 'Live-registration-123!'; const admin = await apiFor('admin');
  await page.goto('/register');
  await page.locator('#register-username').fill(name); await page.locator('#register-email').fill(`${name}@example.test`);
  await page.locator('#register-password').fill(password); await page.locator('#register-password-confirmation').fill(password);
  const sent = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/register' && r.request().method() === 'POST');
  await page.locator('app-register button[type=submit]').click(); expect((await sent).status()).toBe(202);
  await expect(page.getByRole('status')).toBeVisible();
  try {
    const list = await ok(await admin.get('/api/admin/registrations', { params: { status: 'PENDING', page: 0, size: 50 } }));
    const application = list.data.content.find((row: any) => row.username === name); expect(application).toBeTruthy();
    const pending = await page.request.post('http://127.0.0.1:8099/api/auth/login', { data: { username: name, password } }); expect(pending.status()).toBe(401);
    const coachId = (await environment()).accounts.coach.id;
    await ok(await admin.post(`/api/admin/registrations/${application.id}/approve`, { data: { coachId } }));
    await page.goto('/login'); await page.locator('#login-username').fill(name); await page.locator('#login-password').fill(password);
    const logged = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/web/login' && r.request().method() === 'POST');
    await page.locator('app-login button[type=submit]').click(); expect((await logged).status()).toBe(200);
    await expect(page).toHaveURL(/\/user\/dashboard$/);
  } finally { await admin.dispose(); }
});

test('Valódi API: kijelentkezés törli a HttpOnly cookie-t és a munkamenet nem frissíthető újra', async ({ page }) => {
  await login(page, 'coach');
  const originalCookie = (await page.context().cookies()).find(cookie => cookie.name === 'workouts_refresh');
  expect(originalCookie).toBeTruthy();
  const loggedOut = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/web/logout' && r.request().method() === 'POST');
  await page.getByRole('banner').getByRole('button', { name: 'Kijelentkezés', exact: true }).click();
  expect((await loggedOut).status()).toBe(200); await expect(page).toHaveURL(/\/login$/);
  expect((await page.context().cookies()).filter(c => c.name === 'workouts_refresh')).toHaveLength(0);
  const refreshStatus = await page.evaluate(async () => (await fetch('http://127.0.0.1:8099/api/auth/web/refresh', {
    method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}',
  })).status);
  expect(refreshStatus).toBe(401);
  const revoked = await page.request.post('http://127.0.0.1:8099/api/auth/web/refresh', {
    headers: { Origin: 'http://127.0.0.1:4323', Cookie: `workouts_refresh=${originalCookie!.value}` }, data: {},
  });
  expect(revoked.status()).toBe(401);
  await page.goto('/coach/workouts'); await expect(page).toHaveURL(/\/login$/);
});

test('Valódi API: edzői regisztráció adminelutasítás után sem hoz létre beléphető fiókot', async ({ page }) => {
  const name = `Rejected Coach ${randomUUID().slice(0, 8)}`; const password = 'Rejected-password-123!';
  const admin = await apiFor('admin');
  try {
    await page.goto('/register'); await page.getByText('Programokat készítek', { exact: true }).click();
    await page.locator('#register-username').fill(name); await page.locator('#register-email').fill(`rejected_${randomUUID().slice(0, 8)}@example.test`);
    await page.locator('#register-password').fill(password); await page.locator('#register-password-confirmation').fill(password);
    const submitted = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/register' && r.request().method() === 'POST');
    await page.locator('app-register button[type=submit]').click(); expect((await submitted).status()).toBe(202);
    const pending = (await ok(await admin.get('/api/admin/registrations', { params: { status: 'PENDING', page: 0, size: 50 } }))).data.content;
    const application = pending.find((row: any) => row.username === name); expect(application.accountType).toBe('COACH');
    await ok(await admin.post(`/api/admin/registrations/${application.id}/reject`, { data: { reason: 'Valódi API-teszt elutasítás' } }));
    const rejected = (await ok(await admin.get('/api/admin/registrations', { params: { status: 'REJECTED', page: 0, size: 50 } }))).data.content.find((row: any) => row.id === application.id);
    expect(rejected.rejectionReason).toBe('Valódi API-teszt elutasítás');
    expect((await page.request.post('http://127.0.0.1:8099/api/auth/login', { data: { username: name, password } })).status()).toBe(401);
  } finally { await admin.dispose(); }
});
