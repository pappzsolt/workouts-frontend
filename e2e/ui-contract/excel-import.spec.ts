import { test, expect, type Page } from '@playwright/test';

const preview = { programId: null, programName: 'Importált terv', startDate: '2026-11-02', endDate: '2026-12-06',
  workouts: 20, exercises: 100, sets: 215, warnings: ['Pihenőtartomány: az eredeti megjegyzés megmaradt.'], unresolvedExercises: [] };

async function install(page: Page, coach: boolean) {
  const state = { calls: [] as { path: string; body: string }[], unexpected: [] as string[], failImport: false };
  const token = [Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: 'teszt', id: coach ? 5 : 42, roles: coach ? 'ROLE_COACH' : 'ROLE_USER', exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'signature'].join('.');
  await page.addInitScript(() => localStorage.setItem('language', 'hu'));
  await page.route('**/api/**', async route => {
    const req = route.request(), path = new URL(req.url()).pathname;
    const ok = (data: unknown) => route.fulfill({ json: { success: true, data, message: null } });
    if (path === '/api/auth/web/refresh') return ok({ accessToken: token });
    if (path === '/api/coach/overview') return ok({ clients: [{ userId: 42, username: 'Anna' }] });
    if (path === '/api/exercises/filter-options') return ok({ bodyParts: [], equipment: [] });
    if (path === '/api/exercises/search') return ok({ content: [{ id: 11, name: 'Fekvehajlító' }, { id: 12, name: 'Fekvehajlító' }], totalElements: 2, totalPages: 1 });
    const root = coach ? '/api/user-programs/import' : '/api/me/personal-programs/import';
    if (path === root || path === root + '/preview') {
      const body = req.postDataBuffer()?.toString('utf8') ?? ''; state.calls.push({ path, body });
      expect(req.headers()['content-type']).toContain('multipart/form-data; boundary=');
      expect(new URL(req.url()).searchParams.get('language')).toBe('hu');
      if (path.endsWith('/preview')) return ok({ ...preview,
        unresolvedExercises: body.includes('"Fekvehajlító":12') ? [] : [{ name: 'Fekvehajlító', candidateIds: [11, 12] }] });
      if (state.failImport) return route.fulfill({ status: 503, json: { success: false, data: null, message: 'Átmeneti mentési hiba' } });
      return ok({ ...preview, programId: 7 });
    }
    state.unexpected.push(`${req.method()} ${path}`); return route.abort('blockedbyclient');
  });
  return state;
}

for (const scope of ['coach', 'personal'] as const) {
  test(`${scope}: file, exercise matching, recheck and import`, async ({ page }) => {
    const coach = scope === 'coach'; const api = await install(page, coach);
    await page.goto(coach ? '/coach/programs/import?userId=42' : '/user/personal-programs/import');
    const ui = page.locator('app-program-import');
    await expect(ui.getByRole('heading', { name: 'Excel-import', exact: true })).toBeVisible();
    if (coach) await expect(ui.getByLabel('Ügyfél', { exact: true }).locator('option:checked')).toHaveText('Anna');
    else await expect(ui.getByLabel('Ügyfél', { exact: true })).toHaveCount(0);
    await expect(ui.getByRole('button', { name: 'Előellenőrzés', exact: true })).toBeDisabled();
    await ui.locator('input[type=file]').setInputFiles({ name: 'plan.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: Buffer.from('test workbook') });
    await ui.getByLabel('Kezdődátum', { exact: true }).fill('2026-11-02');
    await ui.getByRole('button', { name: 'Előellenőrzés', exact: true }).click();
    await expect(ui).toContainText('20 edzés · 100 gyakorlat · 215 sorozat');
    await expect(ui.getByRole('button', { name: 'Új program létrehozása', exact: true })).toBeDisabled();
    await ui.getByRole('button', { name: 'Gyakorlat kiválasztása', exact: true }).click();
    const exercise = ui.locator('app-exercise-picker li').filter({ hasText: '#12' });
    await expect(exercise).toBeVisible(); await exercise.getByRole('button').last().click();
    await expect(ui.getByRole('button', { name: 'Új program létrehozása', exact: true })).toHaveCount(0);
    await ui.getByRole('button', { name: 'Előellenőrzés', exact: true }).click();
    await expect(ui.getByRole('button', { name: 'Új program létrehozása', exact: true })).toBeEnabled();
    // Editing any import parameter invalidates the approved preview.
    await ui.getByLabel('Program neve (opcionális)', { exact: true }).fill('Új név');
    await expect(ui.getByRole('button', { name: 'Új program létrehozása', exact: true })).toHaveCount(0);
    await ui.getByRole('button', { name: 'Előellenőrzés', exact: true }).click();
    await ui.getByRole('button', { name: 'Új program létrehozása', exact: true }).click();
    await expect(ui).toContainText('A program importálása sikerült.');
    await expect(ui.getByRole('link', { name: 'Program megnyitása', exact: true })).toHaveAttribute('href', coach ? '/coach/clients/42?program=7' : '/user/personal-programs/7');
    expect(api.calls.filter(c => !c.path.endsWith('/preview'))).toHaveLength(1);
    const saved = api.calls[api.calls.length - 1];
    expect(saved.body.includes('name="userId"')).toBe(coach);
    expect(saved.body).toContain('"Fekvehajlító":12'); expect(saved.body).toContain('name="programName"');
    expect(api.unexpected).toEqual([]);
    // Mobile layout must remain usable without horizontal overflow.
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1)).toBe(true);
  });
}

test('invalid file and failed save preserve input and require a new preview', async ({ page }) => {
  const api = await install(page, false); api.failImport = true;
  await page.goto('/user/personal-programs/import'); const ui = page.locator('app-program-import');
  await ui.locator('input[type=file]').setInputFiles({ name: 'wrong.csv', mimeType: 'text/csv', buffer: Buffer.from('csv') });
  await expect(ui).toContainText('Válassz nem üres, legfeljebb 5 MB méretű .xlsx fájlt.');
  await expect(ui.getByRole('button', { name: 'Előellenőrzés', exact: true })).toBeDisabled();
  await ui.locator('input[type=file]').setInputFiles({ name: 'plan.xlsx', mimeType: 'application/octet-stream', buffer: Buffer.from('xlsx') });
  await ui.getByRole('button', { name: 'Előellenőrzés', exact: true }).click();
  await ui.getByRole('button', { name: 'Gyakorlat kiválasztása', exact: true }).click();
  await ui.locator('app-exercise-picker li').filter({ hasText: '#12' }).getByRole('button').last().click();
  await ui.getByRole('button', { name: 'Előellenőrzés', exact: true }).click();
  await ui.getByRole('button', { name: 'Új program létrehozása', exact: true }).click();
  await expect(ui).toContainText('Átmeneti mentési hiba');
  await expect(ui).toContainText('Újabb import előtt ellenőrizd a programlistát');
  await expect(ui.getByRole('button', { name: 'Új program létrehozása', exact: true })).toHaveCount(0);
  await expect(ui.getByRole('button', { name: 'Előellenőrzés', exact: true })).toBeEnabled();
  expect(api.calls.filter(c => !c.path.endsWith('/preview'))).toHaveLength(1); expect(api.unexpected).toEqual([]);
});
