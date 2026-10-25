import { test, expect, type Page } from '@playwright/test';

const ROOT = '/api/me/workout-templates';
const program = () => ({
  name: 'Bevált lábnap',
  description: 'Guggolás és lábedzés',
  durationDays: 1,
  startDate: null,
  difficultyLevel: null,
  languageCode: 'hu',
  expectedVersion: 4,
  workouts: [
    {
      dayIndex: 1,
      name: 'Lábnap',
      description: null,
      exercises: [{ exerciseId: 11, sets: 3, repetitions: 10, restSeconds: 60, notes: null }],
    },
  ],
});
async function install(page: Page) {
  const state = {
    templates: [] as any[],
    failFavorite: false,
    failList: false,
    failUse: false,
    calls: [] as { method: string; path: string; body: any }[],
    unexpected: [] as string[],
  };
  const token = [
    Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
    Buffer.from(
      JSON.stringify({
        sub: 'anna',
        id: 42,
        roles: 'ROLE_USER',
        exp: Math.floor(Date.now() / 1000) + 3600,
      }),
    ).toString('base64url'),
    'signature',
  ].join('.');
  await page.addInitScript(() => localStorage.setItem('language', 'hu'));
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    const body = req.postData() ? req.postDataJSON() : null;
    state.calls.push({ method: req.method(), path, body });
    const ok = (data: unknown) => route.fulfill({ json: { success: true, data, message: null } });
    const fail = () =>
      route.fulfill({
        status: 503,
        json: { success: false, data: null, message: 'Átmeneti hiba' },
      });
    if (path === '/api/auth/web/refresh') return ok({ accessToken: token });
    if (path === '/api/exercises') return ok([{ id: 11, name: 'Guggolás' }]);
    if (path === '/api/me/personal-programs/9')
      return ok({
        id: 9,
        standalone: true,
        startedAt: '2026-10-25T10:00:00',
        program: { ...program(), startDate: '2026-10-25' },
      });
    if (path === '/api/me/personal-programs/10')
      return ok({ id: 10, standalone: true, startedAt: null, program: program() });
    if (path === ROOT && req.method() === 'GET')
      return state.failList ? fail() : ok(state.templates);
    if (path === ROOT && req.method() === 'POST') {
      const template = {
        id: 42,
        sourceProgramId: 9,
        favorite: false,
        createdAt: '2026-10-25T10:00:00Z',
        program: program(),
      };
      state.templates = [template];
      return ok(template);
    }
    if (path === ROOT + '/42/favorite') {
      if (state.failFavorite) return fail();
      state.templates[0].favorite = body.favorite;
      return ok(state.templates[0]);
    }
    if (path === ROOT + '/42/use') {
      if (state.failUse) return fail();
      return ok({ id: 10, standalone: true, startedAt: null, program: program() });
    }
    if (path === ROOT + '/42' && req.method() === 'DELETE') {
      state.templates = [];
      return ok(42);
    }
    state.unexpected.push(req.method() + ' ' + path);
    return route.abort('blockedbyclient');
  });
  return state;
}
const saved = () => ({
  id: 42,
  sourceProgramId: 9,
  favorite: false,
  createdAt: '2026-10-25T10:00:00Z',
  program: program(),
});

test('Mentés sablonként, kedvencjelölés és új dátum nélküli alkalom', async ({ page }, info) => {
  const api = await install(page);
  await page.goto('/user/personal-workouts/9');
  await page.getByRole('button', { name: 'Mentés edzéssablonként', exact: true }).click();
  await expect(
    page.getByText('Az edzéssablon mentve. A sablontárból bármikor készíthetsz új alkalmat.', {
      exact: true,
    }),
  ).toContainText('Az edzéssablon mentve');
  expect(api.calls.find((c) => c.method === 'POST' && c.path === ROOT)?.body).toEqual({
    sourceProgramId: 9,
    expectedVersion: 4,
  });
  await page.getByRole('link', { name: 'Edzéssablonjaim', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bevált lábnap' })).toBeVisible();
  await page.getByRole('button', { name: 'Kedvencnek jelölés', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Kedvenc eltávolítása', exact: true }),
  ).toHaveAttribute('aria-pressed', 'true');
  await page.getByLabel('Csak a kedvencek', { exact: true }).check();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  await page.screenshot({ path: info.outputPath('workout-templates.png'), fullPage: true });
  await page.getByRole('button', { name: 'Új edzésalkalom', exact: true }).click();
  await expect(page).toHaveURL(/personal-workouts\/10$/);
  await expect(page.locator('input[name=startDate]')).toHaveValue('');
  await expect(page.locator('input[name=name]')).toHaveValue('Bevált lábnap');
  expect(api.calls.filter((c) => c.path.endsWith('/use'))).toHaveLength(1);
  expect(api.calls.filter((c) => c.path.endsWith('/start'))).toHaveLength(0);
  expect(api.unexpected).toEqual([]);
});

test('Kedvencjelölés hibája megőrzi az állapotot, az új alkalom hibája újrapróbálható', async ({
  page,
}) => {
  const api = await install(page);
  api.templates = [saved()];
  api.failFavorite = true;
  api.failUse = true;
  await page.goto('/user/workout-templates');
  await page.getByRole('button', { name: 'Kedvencnek jelölés', exact: true }).click();
  await expect(
    page.getByRole('button', { name: 'Kedvencnek jelölés', exact: true }),
  ).toHaveAttribute('aria-pressed', 'false');
  await page.getByRole('button', { name: 'Új edzésalkalom', exact: true }).click();
  await expect(page.getByText('Átmeneti hiba', { exact: true })).toBeVisible();
  api.failUse = false;
  await page.getByRole('button', { name: 'Új edzésalkalom', exact: true }).click();
  await expect(page).toHaveURL(/personal-workouts\/10$/);
  expect(api.unexpected).toEqual([]);
});

test('Sablonlista lekérési hibája újrapróbálható', async ({ page }) => {
  const api = await install(page);
  api.templates = [saved()];
  api.failList = true;
  await page.goto('/user/workout-templates');
  await expect(page.getByText('Átmeneti hiba', { exact: true })).toBeVisible();
  api.failList = false;
  await page.getByRole('button', { name: 'Újrapróbálás', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bevált lábnap' })).toBeVisible();
  await page.getByLabel('Csak a kedvencek', { exact: true }).check();
  await expect(page.getByRole('heading', { name: 'Bevált lábnap' })).toHaveCount(0);
  expect(api.unexpected).toEqual([]);
});

test('Sablontörlés megerősítést kér, és csak a sablont törli', async ({ page }) => {
  const api = await install(page);
  api.templates = [saved()];
  await page.goto('/user/workout-templates');
  await page.getByRole('button', { name: 'Sablon törlése', exact: true }).click();
  expect(api.calls.filter((c) => c.method === 'DELETE')).toHaveLength(0);
  await page.getByRole('alertdialog').getByRole('button', { name: 'Mégse', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Bevált lábnap' })).toBeVisible();
  await page.getByRole('button', { name: 'Sablon törlése', exact: true }).click();
  await page
    .getByRole('alertdialog')
    .getByRole('button', { name: 'Megerősítés', exact: true })
    .click();
  await expect(page.getByRole('heading', { name: 'Bevált lábnap' })).toHaveCount(0);
  expect(api.calls.filter((c) => c.method === 'DELETE').map((c) => c.path)).toEqual([ROOT + '/42']);
  expect(api.unexpected).toEqual([]);
});
