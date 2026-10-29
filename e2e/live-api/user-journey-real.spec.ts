import { test, expect, signIn, plan, detail, detailURL, complete, setsOf, save, result, date, response, unique, recordActuals } from './scenario-fixture';

for (const [index, path] of ['workout-templates', 'personal-workouts/new', 'personal-programs', 'my-programs', 'program-statistics', 'workouts'].entries()) {
  test(`Felhasználó kezdőlap: ${path} kártya valódi munkamenettel`, async ({ page, actors: a }) => {
    await signIn(page, a.user); await page.locator('app-user-dashboard app-dashboard-action').nth(index).locator('button').click();
    await expect(page).toHaveURL(new RegExp(`/user/${path}$`)); await expect(page.locator('main')).toBeVisible();
    await page.reload(); await expect(page).toHaveURL(new RegExp(`/user/${path}$`));
  });
}

test('Edzés: teljesítés után továbblép a következő gyakorlatra; kész edzésben visszavonáskor helyben marad', async ({ page, actors: a }) => {
  const p = await plan(a.coach, a.user, { sets: 1, days: [1] }); await signIn(page, a.user); await page.goto(detailURL(p));
  const done = () => page.locator('app-user-exercise-detail').getByRole('button', { name: 'KÉSZ', exact: true });
  await expect(page.locator('#user-set-actual-repetitions')).toBeVisible();
  await recordActuals(page, 8, 42.5);
  await done().click(); await expect(page).toHaveURL(new RegExp(`/exercises/${p.exercises[1].id}\\?`));
  await done().click(); await expect.poll(async () => (await detail(a.user, p.scheduled[0].user_workout_id)).completed).toBe(true);
  await page.goto(detailURL(p)); const url = page.url(); await done().click();
  await expect.poll(async () => setsOf(await detail(a.user, p.scheduled[0].user_workout_id))[0].completed).toBe(false);
  await expect(page).toHaveURL(url);
});

test('Korábbi teljesítmény: két edzés egymás után, az előző tényleges eredménye megjelenik', async ({ page, actors: a }) => {
  const p = await plan(a.coach, a.user, { sets: 1, exercises: 1 });
  await complete(a.user, p.scheduled[0].user_workout_id, 42.5);
  await signIn(page, a.user); await page.goto(detailURL(p, 1));
  await expect(page.getByTestId('previous-performance')).toContainText('42.5 kg × 8');
  const before = await detail(a.user, p.scheduled[1].user_workout_id); expect(setsOf(before)[0].actualWeightKg).toBeNull();
  await recordActuals(page, 9, 45);
  await page.locator('app-user-exercise-detail').getByRole('button', { name: 'KÉSZ', exact: true }).click();
  await expect.poll(async () => (await detail(a.user, p.scheduled[1].user_workout_id)).completed).toBe(true);
  expect(setsOf(await detail(a.user, p.scheduled[0].user_workout_id))[0].actualWeightKg).toBe(42.5);
});

for (const state of ['active', 'upcoming', 'finished', 'completed'] as const) {
  test(`Edzésprogramjaim: ${state} program, keresés és edzések megnyitása`, async ({ page, actors: a }) => {
    const p = await plan(a.coach, a.user, { start: date(state === 'finished' ? -2 : state === 'upcoming' ? 2 : 0), duration: state === 'finished' ? 1 : 14, days: [1] });
    if (state === 'completed') await complete(a.user, p.scheduled[0].user_workout_id);
    await signIn(page, a.user); await page.goto('/user/my-programs'); const root = page.locator('app-user-my-programs');
    await expect(root).toContainText(p.name);
    const search = root.locator('app-search input'); await search.fill('nemletezo_program'); await expect(root.locator('app-card')).toHaveCount(0);
    await search.fill(p.name); await expect(root).toContainText(p.name);
    await root.locator('app-card').first().click(); await expect(page).toHaveURL(new RegExp(`/user/programs/${p.id}/workouts`));
    if (state === 'completed') await page.locator('app-workouts').getByRole('tab', { name: /^Elvégzett edzések/ }).click();
    await expect(page.locator('app-workouts')).toContainText(p.workout.workoutName ?? `${p.name} edzés`);
  });
}

for (const timezone of ['Europe/Budapest', 'UTC', 'America/New_York']) {
  test(`Naptár: hónapváltás, keresés és napmegnyitás (${timezone})`, async ({ browser, actors: a }) => {
    const p = await plan(a.coach, a.user, { days: [1] }); const context = await browser.newContext({ timezoneId: timezone, locale: 'hu-HU', baseURL: 'http://127.0.0.1:4323' });
    try { const page = await context.newPage(); await page.addInitScript(() => localStorage.setItem('language', 'hu')); await signIn(page, a.user); await page.goto('/user/workouts');
      const root = page.locator('app-user-workouts-calendar'); await expect(root).toContainText(`${p.name} edzés`);
      const title = await root.locator('h2').first().textContent(); await root.getByRole('button', { name: 'Következő hónap', exact: true }).click(); await expect(root.locator('h2').first()).not.toHaveText(title!);
      await root.getByRole('button', { name: 'Előző hónap', exact: true }).click(); await expect(root.locator('h2').first()).toHaveText(title!);
      await root.locator('#calendarWorkoutSearch').fill(p.name); await expect(root).toContainText(`${p.name} edzés`);
      await root.getByText(`${p.name} edzés`, { exact: true }).filter({ visible: true }).first().click(); await expect(root).toContainText(p.exercises[0].name); await expect(root).toContainText(date());
    } finally { await context.close(); }
  });
}

test('Saját program: létrehozás, mentés, kétablakos verzióütközés, indítás és másolattörlés', async ({ page, context, actors: a }) => {
  const p = await plan(a.coach, a.user, { days: [1], sets: 1, exercises: 1 });
  await signIn(page, a.user); await page.goto('/user/personal-programs/new'); const root = page.locator('app-personal-program-editor');
  const name = unique('Saját'); await root.locator('[name=name]').fill(name); await root.getByRole('button', { name: 'Edzésnap hozzáadása', exact: true }).click();
  await root.getByLabel('Edzés neve', { exact: true }).fill('Saját nap'); await root.getByRole('button', { name: 'Gyakorlat hozzáadása', exact: true }).click();
  const picker = page.locator('app-exercise-picker'); await picker.locator('input[type=search]').fill(p.exercises[0].name);
  await picker.getByRole('button', { name: `Hozzáadás: ${p.exercises[0].name}`, exact: true }).click();
  const created = response(page, 'POST', '/api/me/personal-programs'); await root.getByRole('button', { name: 'Piszkozat mentése', exact: true }).click();
  const r = await created; expect(r.status()).toBe(200); const id = (await r.json()).data; await expect(page).toHaveURL(new RegExp(`/personal-programs/${id}$`));
  const other = await context.newPage(); await other.goto(`/user/personal-programs/${id}`); await expect(other.locator('[name=name]')).toHaveValue(name);
  await root.locator('[name=name]').fill(`${name} első`); let saved = response(page, 'PUT', `/api/me/personal-programs/${id}`); await root.getByRole('button', { name: 'Piszkozat mentése', exact: true }).click(); expect((await saved).status()).toBe(200);
  await other.locator('[name=name]').fill(`${name} második`); const stale = response(other, 'PUT', `/api/me/personal-programs/${id}`); await other.getByRole('button', { name: 'Piszkozat mentése', exact: true }).click(); expect((await stale).status()).toBe(409); await expect(other.locator('[name=name]')).toHaveValue(`${name} második`); await other.close();
  await root.getByRole('button', { name: 'Program indítása', exact: true }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Megerősítés', exact: true }).click();
  await expect(root.getByRole('link', { name: 'Edzések megnyitása', exact: true })).toBeVisible(); await page.reload(); await expect(root.locator('[name=name]')).toBeDisabled();
  await root.getByRole('button', { name: 'Másolat készítése', exact: true }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Megerősítés', exact: true }).click();
  await expect(root.locator('[name=name]')).toBeEnabled(); await root.getByRole('button', { name: 'Piszkozat törlése', exact: true }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Megerősítés', exact: true }).click(); await expect(page).toHaveURL(/\/personal-programs$/);
});

test('Önálló edzés és sablon: indítás, teljesítés, ismétlés, kedvenc és új alkalom', async ({ page, actors: a }) => {
  const p = await plan(a.coach, a.user, { days: [1], exercises: 1, sets: 1 });
  await signIn(page, a.user); await page.goto('/user/personal-workouts/new'); const root = page.locator('app-personal-program-editor');
  await root.locator('[name=name]').fill(unique('Önálló')); await root.getByRole('button', { name: 'Gyakorlat hozzáadása', exact: true }).click();
  const picker = page.locator('app-exercise-picker'); await picker.locator('input[type=search]').fill(p.exercises[0].name); await picker.getByRole('button', { name: `Hozzáadás: ${p.exercises[0].name}`, exact: true }).click();
  await root.getByRole('spinbutton', { name: 'Sorozatok', exact: true }).fill('1'); await root.getByRole('spinbutton', { name: 'Pihenő (másodperc)', exact: true }).fill('0');
  const created = response(page, 'POST', '/api/me/personal-programs/standalone'); await root.getByRole('button', { name: 'Edzés mentése', exact: true }).click(); const createdResponse = await created; expect(createdResponse.status()).toBe(200); const id = (await createdResponse.json()).data; await expect(page).toHaveURL(new RegExp(`/personal-workouts/${id}$`));
  await root.getByRole('button', { name: 'Edzés indítása', exact: true }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Megerősítés', exact: true }).click();
  await expect(root.getByRole('link', { name: 'Edzések megnyitása', exact: true })).toBeVisible();
  const scheduled = (await result(a.user.api, '/api/user-workout-exercises/scheduled')).find((w: any) => w.program_id === id);
  await page.goto(`/user/workouts/${scheduled.workout_id}/exercises/${p.exercises[0].id}?programId=${id}&userWorkoutId=${scheduled.user_workout_id}&programWorkoutId=${scheduled.program_workout_id}`);
  await recordActuals(page, 8, 20); await page.locator('app-user-exercise-detail').getByRole('button', { name: 'KÉSZ', exact: true }).click(); await expect.poll(async () => (await detail(a.user, scheduled.user_workout_id)).completed).toBe(true);
  await page.goto(`/user/personal-workouts/${id}`); await root.getByRole('button', { name: 'Mentés edzéssablonként', exact: true }).click();
  const confirm = page.getByRole('alertdialog'); if (await confirm.count()) await confirm.getByRole('button', { name: 'Megerősítés', exact: true }).click();
  await expect.poll(async () => (await result(a.user.api, '/api/me/workout-templates')).length).toBe(1);
  await page.goto('/user/workout-templates'); const templates = page.locator('app-workout-templates');
  await templates.getByRole('button', { name: 'Kedvencnek jelölés', exact: true }).click();
  await templates.locator('input[type=checkbox]').check(); await expect(templates.locator('app-card')).toHaveCount(1);
  await templates.getByRole('button', { name: 'Új edzésalkalom', exact: true }).click(); await expect(page).toHaveURL(/\/personal-workouts\/\d+$/);
  const nextId = Number(page.url().split('/').at(-1)); expect(nextId).not.toBe(id);
  expect((await result(a.user.api, `/api/me/personal-programs/${nextId}`)).startedAt).toBeNull();
  await root.getByRole('button', { name: 'Edzés indítása', exact: true }).click(); const started = response(page, 'POST', `/api/me/personal-programs/${nextId}/start`); await page.getByRole('alertdialog').getByRole('button', { name: 'Megerősítés', exact: true }).click(); expect((await started).status()).toBe(200);
  const next = (await result(a.user.api, '/api/user-workout-exercises/scheduled')).find((w: any) => w.program_id === nextId); expect(setsOf(await detail(a.user, next.user_workout_id))[0].actualWeightKg).toBeNull(); await complete(a.user, next.user_workout_id);
  await page.reload(); await root.getByRole('button', { name: 'Új alkalom', exact: true }).click(); await page.getByRole('alertdialog').getByRole('button', { name: 'Megerősítés', exact: true }).click(); await expect(root.locator('[name=name]')).toBeEnabled();
});

test('Gyors KÉSZ: a mezőből közvetlenül kattintva is ment és továbblép', async ({ page, actors: a }) => {
  const p = await plan(a.coach, a.user, { days: [1], sets: 1 });
  await signIn(page, a.user); await page.goto(detailURL(p));
  await page.locator('#user-set-actual-repetitions').fill('8');
  await page.locator('#user-set-actual-weight').fill('42.5');
  await page.locator('app-user-exercise-detail').getByRole('button', { name: 'KÉSZ', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/exercises/${p.exercises[1].id}\\?`));
  const saved = setsOf(await detail(a.user, p.scheduled[0].user_workout_id))[0];
  expect(saved.completed).toBe(true); expect(saved.actualRepetitions).toBe(8); expect(saved.actualWeightKg).toBe(42.5);
});
