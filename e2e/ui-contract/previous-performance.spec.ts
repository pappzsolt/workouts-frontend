import { test, expect, type Page } from '@playwright/test';

const detailUrl = '/user/workouts/5/exercises/6?programId=7&userWorkoutId=10&programWorkoutId=20';
async function install(page: Page, mode: 'ready' | 'empty' | 'error' = 'ready') {
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
  const state = { mode, writes: [] as string[], unexpected: [] as string[] };
  await page.addInitScript(() => localStorage.setItem('language', 'hu'));
  await page.route('**/api/**', async (route) => {
    const req = route.request(),
      path = new URL(req.url()).pathname;
    const ok = (data: unknown) => route.fulfill({ json: { success: true, data, message: null } });
    if (path === '/api/auth/web/refresh') return ok({ accessToken: token });
    if (path.endsWith('/previous-performance')) {
      if (state.mode === 'error')
        return route.fulfill({ status: 503, json: { success: false, data: null } });
      return ok(
        state.mode === 'empty'
          ? null
          : {
              userWorkoutId: 8,
              performedAt: '2026-10-20T10:15:00+02:00',
              sets: [
                { setNumber: 1, actualRepetitions: 8, actualWeightKg: 42.5 },
                { setNumber: 2, actualRepetitions: 10, actualWeightKg: 0 },
              ],
            },
      );
    }
    if (path === '/api/exercises/user-workouts/10')
      return ok({
        id: 5,
        name: 'Lábnap',
        description: '',
        exercises: [
          {
            id: 30,
            workoutId: 5,
            exercise: { id: 6, name: 'Guggolás' },
            sets: 1,
            repetitions: 10,
            orderIndex: 0,
            restSeconds: 60,
            notes: null,
            done: false,
            userWorkoutExerciseId: 40,
            userWorkoutExerciseSets: [
              {
                id: 50,
                userWorkoutExerciseId: 40,
                setNumber: 1,
                completed: false,
                targetRepetitions: 10,
                targetWeightKg: 20,
                actualRepetitions: null,
                actualWeightKg: null,
                startedAt: null,
                completedAt: null,
                notes: null,
              },
            ],
          },
        ],
      });
    if (req.method() !== 'GET') state.writes.push(path);
    state.unexpected.push(`${req.method()} ${path}`);
    return route.abort('blockedbyclient');
  });
  return state;
}

test('Az előző eredmények mobilon és asztalon is láthatók, automatikus mentés nélkül', async ({
  page,
}, info) => {
  const api = await install(page);
  await page.goto(detailUrl);
  const history = page.getByTestId('previous-performance');
  await expect(history).toContainText('Legutóbb');
  await expect(history).toContainText('42.5 kg × 8');
  await expect(history).toContainText('0 kg × 10');
  await expect(history).toContainText('2026.10.20.');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(
    true,
  );
  expect(api.writes).toEqual([]);
  expect(api.unexpected).toEqual([]);
  await page.screenshot({ path: info.outputPath('previous-performance.png'), fullPage: true });
});

test('Első edzésnél világos az üres állapot', async ({ page }) => {
  const api = await install(page, 'empty');
  await page.goto(detailUrl);
  await expect(page.getByTestId('previous-performance')).toContainText(
    'még nincs korábbi teljesített sorozatod',
  );
  await expect(page.getByRole('button', { name: 'KÉSZ', exact: true })).toBeEnabled();
  expect(api.unexpected).toEqual([]);
});

test('Előzményhiba mellett is használható az edzés, és a lekérés újrapróbálható', async ({
  page,
}) => {
  const api = await install(page, 'error');
  await page.goto(detailUrl);
  const history = page.getByTestId('previous-performance');
  await expect(history).toContainText('Az edzést folytathatod');
  await expect(page.getByRole('button', { name: 'KÉSZ', exact: true })).toBeEnabled();
  api.mode = 'ready';
  await history.getByRole('button', { name: 'Újrapróbálás', exact: true }).click();
  await expect(history).toContainText('42.5 kg × 8');
  expect(api.writes).toEqual([]);
  expect(api.unexpected).toEqual([]);
});
