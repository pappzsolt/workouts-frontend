import { test, expect, plan, signIn, result, save, complete, detail, date, unique, response, setsOf } from './scenario-fixture';

for (const state of ['no-program', 'planned', 'in-progress', 'done', 'missed', 'finished', 'upcoming'] as const) {
  test(`Edző áttekintés és ügyfelek: ${state} – API és felület egyezik`, async ({ page, actors: a }) => {
    let p: Awaited<ReturnType<typeof plan>> | undefined;
    if (state !== 'no-program') p = await plan(a.coach, a.user, { days: [1], start: date(state === 'finished' ? -6 : state === 'missed' ? -1 : state === 'upcoming' ? 2 : 0), duration: state === 'finished' ? 1 : 14 });
    if (state === 'done') await complete(a.user, p!.scheduled[0].user_workout_id);
    if (state === 'in-progress') await save(a.user.api, 'put', `/api/mobile/v1/user-workouts/${p!.scheduled[0].user_workout_id}/state`, { status: 'IN_PROGRESS' });
    await signIn(page, a.coach);
    const root = page.locator('app-coach-home');
    const overview = await result(a.coach.api, `/api/coach/overview?from=${date(-7)}&to=${date(7)}&language=hu`);
    expect(overview.clients).toHaveLength(1); expect(overview.clients[0].userId).toBe(a.user.id);
    const todayCount = ['planned', 'in-progress', 'done'].includes(state) ? 1 : 0;
    const summary = root.locator('section[aria-label]').first().locator(':scope > div');
    await expect(summary.nth(0).locator('p').last()).toHaveText(String(todayCount));
    await expect(summary.nth(1).locator('p').last()).toHaveText(`${state === 'done' ? 1 : 0} / ${todayCount}`);
    await expect(summary.nth(2).locator('p').last()).toHaveText(['no-program', 'missed', 'finished'].includes(state) ? '1' : '0');
    if (todayCount) {
      const row = root.locator(`a[href*="/coach/clients/${a.user.id}?workout="]`);
      await expect(row).toContainText(a.user.username);
      await expect(row.locator('app-status-badge')).toContainText({ planned: 'Tervezett', 'in-progress': 'Folyamatban', done: 'Kész' }[state] ?? '');
    }
    await page.goto('/coach/clients'); const clients = page.locator('app-coach-clients');
    await expect(clients.locator(`a[href="/coach/clients/${a.user.id}"]`)).toBeVisible();
    await expect(clients.locator(`a[href="/coach/clients/${a.outsider.id}"]`)).toHaveCount(0);
    await clients.locator('[name=clientSearch]').fill('nemletezo_ugyfel'); await expect(clients.locator('section a')).toHaveCount(0);
    await clients.locator('[name=clientSearch]').fill(a.user.username); await expect(clients.locator('section a')).toHaveCount(1);
    await clients.locator('section a').click(); await expect(page).toHaveURL(new RegExp(`/coach/clients/${a.user.id}$`));
    const client = page.locator('app-coach-client-detail'); await expect(client.getByRole('heading', { name: a.user.username, exact: true })).toBeVisible();
    await client.getByRole('tab', { name: /^Programok/ }).click(); await expect(client.getByRole('tab', { name: /^Programok/ })).toHaveAttribute('aria-selected', 'true');
    if (p) await expect(client).toContainText(p.name);
    await client.getByRole('tab', { name: 'Edzésterv és sorozatok', exact: true }).click(); await expect(client.getByRole('tab', { name: 'Edzésterv és sorozatok', exact: true })).toHaveAttribute('aria-selected', 'true');
  });
}

test('Ügyfélrészlet: célmezők, sorozatok, napváltás és frissítés megőrzi a mentést', async ({ page, actors: a }) => {
  const p = await plan(a.coach, a.user); await signIn(page, a.coach);
  await page.goto(`/coach/clients/${a.user.id}?program=${p.id}&workout=${p.scheduled[0].user_workout_id}`);
  const root = page.locator('app-coach-client-detail'), row = root.locator('article').first();
  const input = row.locator('input[aria-label$="1. Cél súly (kg)"]'); await input.fill('42.5');
  const saved = response(page, 'PUT', `/api/user-workout-exercise-sets/${setsOf(await detail(a.user, p.scheduled[0].user_workout_id))[0].id}`);
  await root.getByRole('button', { name: /^Mentés \(1\)$/ }).click(); expect((await saved).status()).toBe(200);
  await page.reload(); await expect(input).toHaveValue('42.5');
  await root.getByRole('button', { name: 'Következő edzés', exact: true }).click(); await expect(input).toHaveValue('');
  await root.getByRole('button', { name: 'Előző edzés', exact: true }).click(); await expect(input).toHaveValue('42.5');
});

test('Program: metaadatok mentése és sikeres napmozgatás böngészőből', async ({ page, actors: a }) => {
  const p = await plan(a.coach, a.user, { days: [1] }); await signIn(page, a.coach); await page.goto(`/coach/programs/${p.id}`);
  const root = page.locator('app-coach-program-editor');
  await expect(root.locator('[name=programName]')).toHaveValue(p.name);
  await root.locator('[name=programName]').fill(`${p.name} átnevezve`);
  await root.locator('[name=programDescription]').fill('Új leírás'); await root.locator('[name=durationDays]').fill('21');
  const saving = response(page, 'PUT', `/api/programs/${p.id}`); await root.getByRole('button', { name: 'Mentés', exact: true }).click(); expect((await saving).status()).toBe(200);
  await page.reload(); await expect(root.locator('[name=programName]')).toHaveValue(`${p.name} átnevezve`);
  const selected = root.getByRole('region', { name: 'Kiválasztott nap', exact: true });
  await selected.locator('[name=moveDate]').fill(date(3)); const moved = response(page, 'PUT', `/api/program-workouts/${p.links[0].id}`);
  await selected.getByRole('button', { name: /Áthelyezés/ }).click(); expect((await moved).status()).toBe(200);
  const scheduled = await result(a.user.api, '/api/user-workout-exercises/scheduled');
  expect(scheduled.find((w: any) => w.program_id === p.id).scheduled_at).toBe(date(3));
  await page.reload(); const movedDay = root.getByRole('button', { name: new RegExp(`^4: ${p.name}`) }); await movedDay.click(); await expect(movedDay).toHaveAttribute('aria-pressed', 'true'); await expect(selected).toContainText(`${p.name} edzés`);
});

test('Programmásolás böngészőből: független másolat és ügyfélhez rendelés', async ({ page, actors: a }) => {
  const p = await plan(a.coach, a.user); await signIn(page, a.coach); await page.goto(`/coach/programs/${p.id}`);
  const root = page.locator('app-coach-program-editor'); await root.getByRole('button', { name: 'Program másolása', exact: true }).click();
  const dialog = page.getByRole('dialog'); const name = unique('Másolat');
  await dialog.locator('[name=copyName]').fill(name); await dialog.locator('[name=copyStart]').fill(date(1));
  await dialog.locator('[name=copyUser]').selectOption({ label: a.user.username });
  const copied = response(page, 'POST', `/api/coach/programs/${p.id}/copy`); await dialog.locator('button[type=submit]').click();
  const r = await copied; expect(r.status()).toBe(200); const id = (await r.json()).data;
  await expect(page).toHaveURL(new RegExp(`/coach/programs/${id}$`)); await page.reload(); await expect(root.locator('[name=programName]')).toHaveValue(name);
  const assignments = await result(a.coach.api, `/api/programs/${id}/assigned-users`); expect(assignments).toEqual([a.user.id]);
  expect((await result(a.user.api, '/api/user-workout-exercises/scheduled')).filter((w: any) => w.program_id === id)).toHaveLength(2);
});

test('Párhuzamos másolás, kiosztás és visszavonás: konzisztens állapot, előzményvesztés nélkül', async ({ actors: a }) => {
  const p = await plan(a.coach, a.user); await complete(a.user, p.scheduled[0].user_workout_id);
  const history = await detail(a.user, p.scheduled[0].user_workout_id);
  const copies = await Promise.all([0, 1].map(n => save(a.coach.api, 'post', `/api/coach/programs/${p.id}/copy`, { name: unique(`Másolat${n}`), startDate: date() })));
  expect(new Set(copies).size).toBe(2);
  for (const id of copies) {
    await Promise.all([0, 1].map(() => save(a.coach.api, 'post', '/api/programs/assign', { userId: a.user.id, programId: id })));
    expect((await result(a.user.api, '/api/user-workout-exercises/scheduled')).filter((w: any) => w.program_id === id)).toHaveLength(2);
  }
  const race = await Promise.all([
    a.coach.api.delete(`/api/programs/${p.id}/assigned-users/${a.user.id}`),
    a.coach.api.post('/api/programs/assign', { data: { userId: a.user.id, programId: p.id } }),
  ]);
  for (const r of race) expect(r.status()).toBe(200);
  expect(await detail(a.user, p.scheduled[0].user_workout_id)).toEqual(history);
  await save(a.coach.api, 'post', '/api/programs/assign', { userId: a.user.id, programId: p.id });
  expect((await result(a.user.api, '/api/user-workout-exercises/scheduled')).filter((w: any) => w.program_id === p.id)).toHaveLength(2);
});

for (const state of ['unstarted', 'partial', 'started', 'done'] as const) {
  test(`Program törlése: ${state}, tranzakció és történeti adatok megőrzése`, async ({ page, actors: a }) => {
    const p = await plan(a.coach, a.user, { days: [1] }); const uw = p.scheduled[0].user_workout_id;
    if (state === 'partial') await save(a.user.api, 'put', `/api/user-workout-exercise-sets/${setsOf(await detail(a.user, uw))[0].id}`, { completed: true, actualRepetitions: 8 });
    if (state === 'started') await save(a.user.api, 'put', `/api/mobile/v1/user-workouts/${uw}/state`, { status: 'IN_PROGRESS' });
    if (state === 'done') await complete(a.user, uw);
    const before = await detail(a.user, uw); await signIn(page, a.coach); await page.goto('/coach/programs');
    const card = page.locator('app-coach-programs article').filter({ hasText: p.name });
    await card.getByRole('button', { name: 'Törlés', exact: true }).click(); const deleted = response(page, 'DELETE', `/api/programs/coach/${p.id}`);
    await card.getByRole('button', { name: 'Törlés', exact: true }).click(); expect((await deleted).status()).toBe(state === 'unstarted' ? 200 : 409);
    if (state === 'unstarted') { await expect(card).toHaveCount(0); expect((await result(a.user.api, '/api/user-workout-exercises/scheduled')).filter((w: any) => w.program_id === p.id)).toEqual([]); }
    else { await expect(card).toBeVisible(); expect(await detail(a.user, uw)).toEqual(before); }
  });
}

test('Kiosztás és visszavonás végig a böngészőben, teljesített előzmények visszaolvasásával', async ({ page, actors: a }) => {
  const p = await plan(a.coach, a.user, { days: [1] }); await complete(a.user, p.scheduled[0].user_workout_id); const history = await detail(a.user, p.scheduled[0].user_workout_id);
  await signIn(page, a.coach); await page.goto(`/coach/clients/${a.user.id}`); const root = page.locator('app-coach-client-detail');
  await root.getByRole('tab', { name: /^Programok/ }).click(); await root.getByRole('button', { name: 'Visszavonás', exact: true }).click();
  const revoked = response(page, 'DELETE', `/api/programs/${p.id}/assigned-users/${a.user.id}`); await root.getByRole('button', { name: 'Visszavonás', exact: true }).click(); expect((await revoked).status()).toBe(200);
  expect(await detail(a.user, p.scheduled[0].user_workout_id)).toEqual(history);
  await root.getByRole('button', { name: 'Program kiosztása', exact: true }).click(); const dialog = page.getByRole('dialog'); await dialog.getByRole('radio', { name: new RegExp(p.name) }).check();
  const assigned = response(page, 'POST', '/api/programs/assign'); await dialog.getByRole('button', { name: 'Kiosztás', exact: true }).click(); expect((await assigned).status()).toBe(200);
  await page.reload(); await root.getByRole('tab', { name: /^Programok/ }).click(); await expect(root).toContainText(p.name); expect(await detail(a.user, p.scheduled[0].user_workout_id)).toEqual(history);
});

for (const field of ['programName', 'programDescription', 'durationDays', 'startDate', 'difficultyLevel']) {
  test(`Program metaadat: ${field} módosítása valódi felületi mentéssel`, async ({ page, actors: a }) => {
    const p = await plan(a.coach, a.user, { days: [1] }); await signIn(page, a.coach); await page.goto(`/coach/programs/${p.id}`); const root = page.locator('app-coach-program-editor');
    const values: Record<string, string> = { programName: unique('Újnév'), programDescription: 'Átírt leírás', durationDays: '21', startDate: date(1), difficultyLevel: 'ADVANCED' };
    await expect(root.locator('[name=programName]')).toHaveValue(p.name);
    if (field === 'difficultyLevel') await root.getByRole('radio', { name: 'Profi', exact: true }).check(); else await root.locator(`[name=${field}]`).fill(values[field]);
    const saved = response(page, 'PUT', `/api/programs/${p.id}`); await root.getByRole('button', { name: 'Mentés', exact: true }).click(); expect((await saved).status()).toBe(200);
    await page.reload(); if (field === 'difficultyLevel') await expect(root.getByRole('radio', { name: 'Profi', exact: true })).toBeChecked(); else await expect(root.locator(`[name=${field}]`)).toHaveValue(values[field]);
    const read = await result(a.coach.api, `/api/programs/${p.id}`); expect(String(read[field])).toBe(values[field]);
  });
}
