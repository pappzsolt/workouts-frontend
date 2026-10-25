import { test, expect, type Page } from '@playwright/test';

const ROOT = '/api/me/personal-programs';
const draft = () => ({ name: 'Saját terv', description: null, durationDays: 7, startDate: null,
  difficultyLevel: null, languageCode: 'hu', workouts: [{ dayIndex: 1, name: 'Első nap', description: null,
    exercises: [{ exerciseId: 11, sets: 3, repetitions: 10, restSeconds: 60, notes: null }] }] });

async function install(page: Page) {
  const state = { program: draft(), id: 7, started: false, failSave: false, failList: false,
    calls: [] as { method: string; path: string; body: any }[], unexpected: [] as string[] };
  const token = [Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: 'anna', id: 42, roles: 'ROLE_USER', exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'signature'].join('.');
  await page.addInitScript(() => localStorage.setItem('language', 'hu'));
  await page.route('**/api/**', async route => {
    const req=route.request(), path=new URL(req.url()).pathname;
    const call={ method: req.method(), path, body: req.postData() ? req.postDataJSON() : null };
    state.calls.push(call);
    const ok=(data: unknown) => route.fulfill({ json: { success: true, data, message: null } });
    if (path === '/api/auth/web/refresh') return ok({ accessToken: token });
    if (path === '/api/exercises' && req.method() === 'GET') return ok([{ id: 11, name: 'Guggolás' }]);
    if (path === '/api/exercises/filter-options') return ok({ bodyParts: [], equipment: [] });
    if (path === '/api/exercises/search') return ok({ content: [{ id: 11, name: 'Guggolás' }], totalElements: 1, totalPages: 1 });
    if (path === ROOT && req.method() === 'GET') {
      if (state.failList) return route.fulfill({ status: 503, json: { success: false, message: 'Átmeneti betöltési hiba' } });
      return ok([{ id: state.id, name: state.program.name, durationDays: 7, startDate: null, startedAt: null }]);
    }
    if (path === ROOT && req.method() === 'POST') { state.program=call.body; return ok(state.id); }
    if (path === `${ROOT}/${state.id}` && req.method() === 'GET') return ok({ id: state.id, startedAt: state.started ? '2026-10-25T12:00:00' : null, program: state.program });
    if (path === `${ROOT}/${state.id}` && req.method() === 'PUT') {
      if (state.failSave) return route.fulfill({ status: 409, json: { success: false, message: 'A mentés most nem sikerült.' } });
      state.program=call.body; return ok(state.id);
    }
    if (path === `${ROOT}/${state.id}` && req.method() === 'DELETE') return ok(state.id);
    if (path === `${ROOT}/${state.id}/start`) { state.started=true; return ok(state.id); }
    if (path === `${ROOT}/${state.id}/copy`) { state.id++; state.started=false; return ok(state.id); }
    state.unexpected.push(`${req.method()} ${path}`);
    return route.abort('blockedbyclient');
  });
  return state;
}
const editor=(page: Page) => page.locator('app-personal-program-editor');

test('Saját program: létrehozás, gyakorlatválasztás, indítás, másolás és törlés', async ({ page }, info) => {
  const api=await install(page);
  await page.goto('/user/personal-programs/new');
  await editor(page).locator('input[name=name]').fill('Új saját terv');
  await editor(page).getByRole('button', { name: 'Edzésnap hozzáadása', exact: true }).click();
  await editor(page).getByLabel('Edzés neve', { exact: true }).nth(0).fill('Lábnap');
  await editor(page).getByRole('button', { name: 'Gyakorlat hozzáadása', exact: true }).click();
  await page.locator('app-exercise-picker').getByRole('button', { name: 'Hozzáadás: Guggolás', exact: true }).click();
  await editor(page).getByRole('button', { name: 'Piszkozat mentése', exact: true }).click();
  await expect(page).toHaveURL(/personal-programs\/7$/);
  await expect(editor(page).getByRole('heading', { name: 'Guggolás', exact: true })).toBeVisible();
  expect(api.program.workouts[0].exercises).toEqual([{ exerciseId: 11, sets: 3, repetitions: 10, restSeconds: 60, notes: null }]);
  expect((api.program as any).userId).toBeUndefined();
  await editor(page).getByRole('button', { name: 'Program indítása', exact: true }).click();
  expect(api.calls.filter(c => c.path.endsWith('/start'))).toHaveLength(0);
  await page.getByRole('alertdialog').getByRole('button', { name: 'Megerősítés', exact: true }).click();
  await expect(editor(page).getByRole('link', { name: 'Edzések megnyitása', exact: true })).toBeVisible();
  await expect(editor(page).locator('input[name=name]')).toBeDisabled();
  await expect(editor(page).getByRole('button', { name: 'Piszkozat törlése', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await expect(editor(page).locator('fieldset').last()).toHaveCSS('display', 'flex');
  await page.screenshot({ path: `/tmp/personal-program-${info.project.name}.png`, fullPage: true });
  await editor(page).getByRole('button', { name: 'Másolat készítése', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Megerősítés', exact: true }).click();
  await expect(page).toHaveURL(/personal-programs\/8$/);
  await expect(editor(page).locator('input[name=name]')).toBeEnabled();
  await editor(page).getByRole('button', { name: 'Piszkozat törlése', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Megerősítés', exact: true }).click();
  await expect(page).toHaveURL(/personal-programs$/);
  expect(api.unexpected).toEqual([]);
});

test('Saját program: hibás nap és nem mentett változások védelme', async ({ page }) => {
  const api=await install(page);
  await page.goto('/user/personal-programs/7');
  await editor(page).getByRole('button', { name: 'Edzésnap hozzáadása', exact: true }).click();
  await editor(page).getByLabel('Edzés neve', { exact: true }).nth(1).fill('Második nap');
  await editor(page).getByLabel('Nap sorszáma', { exact: true }).nth(1).fill('1');
  await editor(page).getByRole('button', { name: 'Piszkozat mentése', exact: true }).click();
  await expect(editor(page)).toContainText('Minden edzésnap sorszáma legyen egyedi');
  expect(api.calls.filter(c => c.method === 'PUT')).toHaveLength(0);
  await editor(page).getByRole('link', { name: 'Vissza a saját programokhoz', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Mégse', exact: true }).click();
  await expect(editor(page).getByLabel('Edzés neve', { exact: true }).nth(1)).toHaveValue('Második nap');
  await editor(page).getByRole('link', { name: 'Vissza a saját programokhoz', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Megerősítés', exact: true }).click();
  await expect(page).toHaveURL(/personal-programs$/);
  expect(api.unexpected).toEqual([]);
});

test('Saját program: sikertelen mentés megőrzi az adatokat és újrapróbálható', async ({ page }) => {
  const api=await install(page); api.failSave=true;
  await page.goto('/user/personal-programs/7');
  await editor(page).locator('input[name=name]').fill('Megőrzendő változás');
  await editor(page).getByRole('button', { name: 'Piszkozat mentése', exact: true }).click();
  await expect(editor(page)).toContainText('A mentés most nem sikerült.');
  await expect(editor(page).locator('input[name=name]')).toHaveValue('Megőrzendő változás');
  await expect(editor(page).getByRole('button', { name: 'Program indítása', exact: true })).toBeDisabled();
  api.failSave=false;
  await editor(page).getByRole('button', { name: 'Piszkozat mentése', exact: true }).click();
  await expect(editor(page)).toContainText('A saját programot mentettük.');
  await expect(editor(page).getByRole('button', { name: 'Program indítása', exact: true })).toBeEnabled();
  expect(api.unexpected).toEqual([]);
});

test('Saját program: betöltési hiba újrapróbálható, nem mutat hamis üres listát', async ({ page }) => {
  const api=await install(page); api.failList=true;
  await page.goto('/user/personal-programs');
  await expect(page.locator('app-personal-programs')).toContainText('Átmeneti betöltési hiba');
  await expect(page.locator('app-empty-state')).toHaveCount(0);
  api.failList=false;
  await page.getByRole('button', { name: 'Újrapróbálás', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Saját terv', exact: true })).toBeVisible();
  expect(api.unexpected).toEqual([]);
});

for (const [language, label] of [['en', 'Program name'], ['de', 'Programmname']]) {
  test(`Saját program: nyelvváltás megőrzi a piszkozatot (${language})`, async ({ page }) => {
    const api=await install(page);
    await page.goto('/user/personal-programs/7');
    await editor(page).getByLabel('Program neve', { exact: true }).fill('Megőrzött saját név');
    await page.locator('app-language-selector select').selectOption(language);
    await expect(editor(page).getByLabel(label, { exact: true })).toHaveValue('Megőrzött saját név');
    await expect(editor(page).getByRole('button', { name: language === 'en' ? 'Start program' : 'Programm starten', exact: true })).toBeDisabled();
    expect(api.calls.filter(c => c.method === 'PUT')).toHaveLength(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(api.unexpected).toEqual([]);
  });
}
