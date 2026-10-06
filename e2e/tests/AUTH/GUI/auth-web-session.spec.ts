import { expect, request, test } from '@playwright/test';
import { authenticateAndOpen } from '../../helpers/auth-session';
import { setTestLanguage } from '../../helpers/read-only';
import { apiFor, BASE_API_URL, closeDb, currentUserId, rejected } from '../../helpers/e2e-next-3-helpers';
import { assign, attach, cleanupAuditFixture, createAuditFixture } from '../../helpers/audit-fixture';

test.afterAll(closeDb);

test('WEB AUTH: authenticated SPA navigation preserves the in-memory session', async ({ page }) => {
  await setTestLanguage(page);
  await authenticateAndOpen(page, 'user');
  const programs = page.waitForResponse(response => response.request().method() === 'GET' &&
    new URL(response.url()).pathname === '/api/programs/my/assigned');
  await page.locator('app-user-dashboard app-dashboard-action').getByRole('button', { name: /^(programjaim|my programs|meine programme)$/i }).click();
  await expect(page).toHaveURL(/\/user\/my-programs$/);
  expect((await programs).ok()).toBe(true);
});

test('WEB AUTH: reloading a protected page restores the session from the HttpOnly cookie', async ({ page }) => {
  await setTestLanguage(page);
  await authenticateAndOpen(page, 'user');
  let refreshRequests = 0;
  page.on('request', request => {
    if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/auth/web/refresh') {
      refreshRequests++;
    }
  });
  const refresh = page.waitForResponse(response => response.request().method() === 'POST' &&
    new URL(response.url()).pathname === '/api/auth/web/refresh');
  await page.reload();
  const response = await refresh;
  expect(response.ok()).toBe(true);
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(typeof body.data.accessToken).toBe('string');
  expect(body.data.refreshToken).toBeUndefined();
  await expect(page).toHaveURL(/\/user\/dashboard$/);
  await expect(page.locator('app-user-dashboard')).toBeVisible();
  expect(refreshRequests, 'Both guards must share one refresh request').toBe(1);
});

test('WEB AUTH: logout revokes the cookie and back, reload and protected navigation cannot restore access', async ({ page }) => {
  await setTestLanguage(page);
  await authenticateAndOpen(page, 'user', '/user/profile');
  const cookie = (await page.context().cookies()).find(item => item.name === 'workouts_refresh');
  expect(cookie).toBeDefined();
  const logout = page.waitForResponse(response => response.request().method() === 'POST' &&
    new URL(response.url()).pathname === '/api/auth/web/logout');
  await page.getByRole('banner').getByRole('button', { name: /^(kijelentkezés|logout|abmelden)$/i }).click();
  expect((await logout).ok()).toBe(true);
  await expect(page).toHaveURL(/\/login$/);
  expect((await page.context().cookies()).filter(item => item.name === 'workouts_refresh')).toEqual([]);

  // Replay only in an isolated API client, never inject the revoked cookie into the browser.
  const revokedSession = await request.newContext({
    baseURL: BASE_API_URL,
    extraHTTPHeaders: { Cookie: `${cookie!.name}=${cookie!.value}` },
  });
  try {
    await rejected(await revokedSession.post('/api/auth/web/refresh'), 'Revoked web refresh cookie', 401);
  } finally {
    await revokedSession.dispose();
  }

  await page.goBack();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('app-user-profile')).toHaveCount(0);
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  const deniedRefresh = page.waitForResponse(response => response.request().method() === 'POST' &&
    new URL(response.url()).pathname === '/api/auth/web/refresh');
  await page.goto('/user/profile');
  expect((await deniedRefresh).status()).toBe(401);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator('app-user-profile')).toHaveCount(0);
});

for (const role of ['coach', 'user', 'admin'] as const) {
  test(`WEB AUTH: ${role} direct subpage and reload preserve the exact target with one refresh`, async ({ page }) => {
    await setTestLanguage(page);
    await authenticateAndOpen(page, 'coach');
    const coachApi = await apiFor(page);
    const fixture = role === 'admin' ? null : await createAuditFixture(coachApi);
    const programName = `Direct navigation ${fixture?.programId}`;
    try {
      if (role === 'user') {
        await attach(coachApi, fixture!, 1);
        await assign(coachApi, fixture!, await currentUserId());
      }
      if (role !== 'coach') await authenticateAndOpen(page, role);
      const target = role === 'coach'
        ? `/coach/assign-workouts-exercises?workoutId=${fixture!.workoutId}`
        : role === 'user'
          ? `/user/programs/${fixture!.programId}/workouts?programName=${encodeURIComponent(programName)}`
          : '/admin/users';
      const surface = role === 'coach' ? 'app-assign-workouts-exercises'
        : role === 'user' ? 'app-workouts' : 'app-admin-list-users';
      let refreshRequests = 0;
      page.on('request', req => {
        if (req.method() === 'POST' && new URL(req.url()).pathname === '/api/auth/web/refresh') refreshRequests++;
      });
      for (const reload of [false, true]) {
        const refreshed = page.waitForResponse(response => response.request().method() === 'POST' &&
          new URL(response.url()).pathname === '/api/auth/web/refresh');
        if (reload) await page.reload(); else await page.goto(target);
        expect((await refreshed).ok()).toBe(true);
        await expect(page).toHaveURL(new URL(target, process.env.E2E_BASE_URL ?? 'http://localhost:4200').href);
        await expect(page.locator(surface)).toBeVisible();
        expect(refreshRequests).toBe(reload ? 2 : 1);
        if (role === 'coach') await expect(page.locator(surface).getByRole('heading', { level: 2 })).toContainText('E2E Workout');
        if (role === 'user') await expect(page.locator(surface)).toContainText(programName);
      }
    } finally {
      try { if (fixture) await cleanupAuditFixture(coachApi, fixture); }
      finally { await coachApi.dispose(); }
    }
  });
}
