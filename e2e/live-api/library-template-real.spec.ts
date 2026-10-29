import { test, expect, plan, signIn, save, result, detail, setsOf, complete, date, unique, response } from './scenario-fixture';

for (const state of ['untouched', 'target-only', 'partial', 'started', 'done', 'undone', 'race'] as const) {
  test(`Sablonalkalmazás: ${state} állapot, tényleges sorozatok megőrzése`, async ({ page, actors: a }) => {
    const p = await plan(a.coach, a.user, { days: [1], exercises: 1 }); const uw = p.scheduled[0].user_workout_id;
    const first = setsOf(await detail(a.user, uw))[0];
    if (state === 'target-only') await save(a.coach.api, 'put', `/api/user-workout-exercise-sets/${first.id}`, { targetWeightKg: 42.5, targetRpe: 8 });
    if (['partial', 'undone'].includes(state)) await save(a.user.api, 'put', `/api/user-workout-exercise-sets/${first.id}`, { completed: true, actualRepetitions: 8, actualWeightKg: 25 });
    if (state === 'undone') await save(a.user.api, 'put', `/api/user-workout-exercise-sets/${first.id}`, { completed: false });
    if (state === 'started') await save(a.user.api, 'put', `/api/mobile/v1/user-workouts/${uw}/state`, { status: 'IN_PROGRESS' });
    if (state === 'done') await complete(a.user, uw);
    const before = await detail(a.user, uw);
    await signIn(page, a.coach); await page.goto(`/coach/programs/${p.id}`);
    const root = page.locator('app-coach-program-editor'), panel = root.getByRole('region', { name: 'Kiválasztott nap', exact: true });
    await panel.getByLabel('Sorozat', { exact: true }).fill('3'); await panel.getByLabel('Ismétlés', { exact: true }).fill('12');
    const prescription = response(page, 'PUT', '/api/workout-exercises/prescription'); await panel.getByRole('button', { name: 'Változások mentése (1)', exact: true }).click(); expect((await prescription).status()).toBe(200);
    const applied = response(page, 'POST', `/api/coach/workouts/${p.workout.id}/apply-template`);
    const apply = panel.getByRole('button', { name: 'Alkalmazás a még el nem kezdett ügyfél-edzésekre', exact: true });
    if (state === 'race') {
      await Promise.all([apply.click(), save(a.user.api, 'put', `/api/user-workout-exercise-sets/${first.id}`, { completed: true, actualRepetitions: 8, actualWeightKg: 25 })]);
    } else await apply.click();
    expect((await applied).status()).toBe(200);
    const after = await detail(a.user, uw), sets = setsOf(after);
    if (['started', 'done'].includes(state)) expect(sets).toEqual(setsOf(before));
    else { expect(sets).toHaveLength(3); expect(sets.filter((s: any) => !s.completed).every((s: any) => s.targetRepetitions === 12)).toBe(true); }
    if (state === 'partial') expect(sets[0]).toEqual(setsOf(before)[0]);
    if (state === 'race') { expect(sets[0].completed).toBe(true); expect(sets[0].actualWeightKg).toBe(25); }
    if (state === 'target-only') { expect(sets[0].targetWeightKg).toBe(42.5); expect(sets[0].targetRpe).toBe(8); }
    const replay = await save(a.coach.api, 'post', `/api/coach/workouts/${p.workout.id}/apply-template`, {}); expect(replay.setsAdded).toBe(0); expect(replay.setsUpdated).toBe(0);
  });
}

for (const state of ['free', 'program', 'assigned', 'history'] as const) {
  test(`Edzéstörlés: ${state} kapcsolat adatmegőrzése`, async ({ page, actors: a }) => {
    const p = await plan(a.coach, a.user, { days: [1] });
    if (state === 'history') await complete(a.user, p.scheduled[0].user_workout_id);
    if (state === 'program' || state === 'free') await save(a.coach.api, 'delete', `/api/programs/${p.id}/assigned-users/${a.user.id}`);
    if (state === 'free') await save(a.coach.api, 'delete', `/api/program-workouts/id/${p.links[0].id}`);
    if (state === 'history') expect((await a.coach.api.delete(`/api/program-workouts/id/${p.links[0].id}`)).status()).toBe(409);
    const before = state === 'history' ? await detail(a.user, p.scheduled[0].user_workout_id) : null;
    const r = await a.coach.api.delete(`/api/workouts/${p.workout.id}`); expect(r.status()).toBe(state === 'free' ? 200 : 409);
    if (before) expect(await detail(a.user, p.scheduled[0].user_workout_id)).toEqual(before);
    if (state !== 'free') { await signIn(page, a.coach); await page.goto(`/coach/workouts/${p.workout.id}/edit`); await expect(page.locator('#workoutName')).toHaveValue(`${p.name} edzés`); }
    else expect((await a.admin.get(`/api/workouts/${p.workout.id}`)).status()).toBe(404);
  });
}

test('Edzésszerkesztés két ablakban: egymás utáni mentések és közös visszaolvasás', async ({ page, context, actors: a }) => {
  const name = unique('Kétablakos'), w = await save(a.coach.api, 'post', '/api/workouts', { name, workoutDate: date(), durationMinutes: 45, intensityLevel: 'MEDIUM' });
  await signIn(page, a.coach); await page.goto(`/coach/workouts/${w.id}/edit`); const second = await context.newPage(); await second.goto(`/coach/workouts/${w.id}/edit`);
  for (const [p, text] of [[page, 'első'], [second, 'második']] as const) {
    await expect(p.locator('#workoutName')).toHaveValue(name); await p.locator('#description').fill(text); const saved = response(p, 'PUT', `/api/workouts/${w.id}`);
    await p.locator('app-coach-workout-edit button[type=submit]').click(); expect((await saved).status()).toBe(200); await expect(p).toHaveURL(/\/coach\/workouts$/);
  }
  await page.goto(`/coach/workouts/${w.id}/edit`); await second.goto(`/coach/workouts/${w.id}/edit`); await expect(page.locator('#description')).toHaveValue('második'); await expect(second.locator('#description')).toHaveValue('második'); await second.close();
});

for (const body of ['', 'legs', 'back']) for (const equipment of ['', 'barbell', 'dumbbell']) {
  test(`Gyakorlatok: keresés + testrész=${body || 'mind'} + eszköz=${equipment || 'mind'}`, async ({ page, actors: a }) => {
    const p = await plan(a.coach, a.user, { days: [1] });
    const query = new URLSearchParams({ search: p.name, page: '0', size: '100', language: 'hu', sortDirection: 'asc' });
    if (body) query.set('bodyPart', body); if (equipment) query.set('equipment', equipment);
    const expected = p.exercises.filter((e: any, i: number) => (!body || (i ? 'back' : 'legs') === body) && (!equipment || (i ? 'dumbbell' : 'barbell') === equipment));
    const actual = await result(a.coach.api, `/api/exercises/search?${query}`); expect(actual.totalElements).toBe(expected.length); expect(actual.content.map((e: any) => e.id).sort()).toEqual(expected.map((e: any) => e.id).sort());
    await signIn(page, a.coach); await page.goto('/coach/exercises'); const root = page.locator('app-exercise-controller');
    await root.locator('app-search input').fill(p.name);
    await root.getByRole('button', { name: 'Keresés', exact: true }).click();
    if (body) await root.locator('[name=libraryBodyPart]').selectOption(body); if (equipment) await root.locator('[name=libraryEquipment]').selectOption(equipment);
    await expect(root.locator('app-card')).toHaveCount(expected.length);
    for (const e of expected) await expect(root).toContainText(e.name);
  });
}

test('Gyakorlat törlése: kapcsolt gyakorlat védett, szabad gyakorlat törölhető', async ({ actors: a }) => {
  const p = await plan(a.coach, a.user, { days: [1] }); expect((await a.coach.api.delete(`/api/exercises/${p.exercises[0].id}`)).status()).toBe(409);
  const name = unique('Szabad'); const free = await save(a.coach.api, 'post', '/api/exercises', { name }); await save(a.coach.api, 'delete', `/api/exercises/${free.id}`);
  expect((await result(a.coach.api, `/api/exercises/search?search=${name}&page=0&size=10`)).totalElements).toBe(0);
});
