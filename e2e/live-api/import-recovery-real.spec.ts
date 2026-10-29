import { test, expect, plan, signIn, save, result, response, unique, date } from './scenario-fixture';

for (const scope of ['coach', 'personal'] as const) {
  test(`${scope} import: kétértelmű gyakorlat feloldása és valódi hálózati hiba utáni egyszeri import`, async ({ page, context, actors: a }) => {
    const p = await plan(a.coach, a.user, { days: [1], exercises: 1, sets: 1 });
    await save(a.coach.api, 'post', '/api/exercises', { name: p.exercises[0].name });
    const exported = await a.user.api.get(`/api/user-workout-exercises/user-programs/${a.user.id}/${p.id}/export?language=hu`); expect(exported.status()).toBe(200);
    await signIn(page, scope === 'coach' ? a.coach : a.user); await page.goto(scope === 'coach' ? '/coach/programs/import' : '/user/personal-programs/import');
    const root = page.locator('app-program-import'), prefix = scope === 'coach' ? '/api/user-programs/import' : '/api/me/personal-programs/import';
    const name = unique('Helyreállított');
    if (scope === 'coach') await root.locator('[name=client]').selectOption({ label: a.user.username });
    await root.locator('input[type=file]').setInputFiles({ name: 'ambiguous.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', buffer: await exported.body() });
    await root.locator('[name=programName]').fill(name); await root.locator('[name=startDate]').fill(date());
    let checked = response(page, 'POST', `${prefix}/preview`); await root.getByRole('button', { name: 'Előellenőrzés', exact: true }).click();
    let r = await checked; expect(r.status()).toBe(200); expect((await r.json()).data.unresolvedExercises).toHaveLength(1);
    await expect(root.getByRole('button', { name: 'Új program létrehozása', exact: true })).toBeDisabled();
    await root.getByRole('button', { name: 'Gyakorlat kiválasztása', exact: true }).click(); const picker = root.locator('app-exercise-picker');
    await picker.locator('input[type=search]').fill(p.exercises[0].name);
    await picker.locator('li').filter({ hasText: new RegExp(`#${p.exercises[0].id}(?:\\D|$)`) }).getByRole('button', { name: `Hozzáadás: ${p.exercises[0].name}`, exact: true }).click();
    checked = response(page, 'POST', `${prefix}/preview`); await root.getByRole('button', { name: 'Előellenőrzés', exact: true }).click(); r = await checked;
    expect(r.status()).toBe(200); expect((await r.json()).data.unresolvedExercises).toEqual([]);
    try {
      await context.setOffline(true); await root.getByRole('button', { name: 'Új program létrehozása', exact: true }).click();
      await expect(root.locator('app-message').first()).toContainText(/.+/); await expect(root.getByRole('button', { name: 'Új program létrehozása', exact: true })).toHaveCount(0);
    } finally { await context.setOffline(false); }
    const listPath = scope === 'coach' ? '/api/programs/coach' : '/api/me/personal-programs', api = scope === 'coach' ? a.coach.api : a.user.api;
    let programs = await result(api, listPath); expect(programs.filter((row: any) => (row.programName ?? row.name) === name)).toHaveLength(0);
    await expect(root.locator('[name=programName]')).toHaveValue(name);
    checked = response(page, 'POST', `${prefix}/preview`); await root.getByRole('button', { name: 'Előellenőrzés', exact: true }).click(); expect((await checked).status()).toBe(200);
    const imported = response(page, 'POST', prefix); await root.getByRole('button', { name: 'Új program létrehozása', exact: true }).click(); expect((await imported).status()).toBe(200);
    programs = await result(api, listPath); expect(programs.filter((row: any) => (row.programName ?? row.name) === name)).toHaveLength(1);
    await expect(root.getByRole('link', { name: 'Program megnyitása', exact: true })).toBeVisible();
  });
}
