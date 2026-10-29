import { test, expect, plan, signIn, save, detail, setsOf, complete, date, result, response, unique } from './scenario-fixture';

for (const transition of ['spring', 'autumn'] as const) for (const timezone of ['Europe/Budapest', 'UTC', 'America/New_York']) {
  test(`Naptári dátum óraátállításkor: ${transition}, ${timezone}`, async ({ browser, actors: a }) => {
    const year = new Date().getFullYear() + 1, month = transition === 'spring' ? 2 : 9;
    const last = new Date(Date.UTC(year, month + 1, 0)); last.setUTCDate(last.getUTCDate() - last.getUTCDay()); const target = last.toISOString().slice(0, 10);
    const p = await plan(a.coach, a.user, { start: target, days: [1] }); expect(p.scheduled[0].scheduled_at).toBe(target);
    const context = await browser.newContext({ timezoneId: timezone, locale: 'hu-HU', baseURL: 'http://127.0.0.1:4323' });
    try { const page = await context.newPage(); await page.addInitScript(() => localStorage.setItem('language', 'hu')); await signIn(page, a.user); await page.goto('/user/workouts'); const root = page.locator('app-user-workouts-calendar');
      const current = await page.evaluate(() => ({ year: new Date().getFullYear(), month: new Date().getMonth() }));
      const months = (year - current.year) * 12 + month - current.month;
      for (let i = 0; i < months; i++) await root.getByRole('button', { name: 'Következő hónap', exact: true }).click();
      await root.getByText(`${p.name} edzés`, { exact: true }).filter({ visible: true }).first().click();
      await expect(root).toContainText(target); await expect(root).toContainText(p.exercises[0].name);
      expect((await result(a.user.api, '/api/user-workout-exercises/scheduled'))[0].scheduled_at).toBe(target);
    } finally { await context.close(); }
  });
}

test('Statisztikai grafikonok: két programhét, három gyakorlat, volumen/e1RM/zónák és adatsorok', async ({ page, actors: a }) => {
  const p = await plan(a.coach, a.user, { start: date(-8), days: [1, 8], exercises: 3, sets: 1 });
  const first = p.scheduled[0].user_workout_id;
  await save(a.user.api, 'put', `/api/mobile/v1/user-workouts/${first}/state`, { status: 'IN_PROGRESS', startedAt: `${date(-8)}T10:00:00Z` });
  await save(a.user.api, 'put', `/api/mobile/v1/user-workouts/${first}/state`, { status: 'COMPLETED', startedAt: `${date(-8)}T10:00:00Z`, completedAt: `${date(-8)}T11:00:00Z`, sets: setsOf(await detail(a.user, first)).map((set: any) => ({ userWorkoutSetId: set.id, completed: true, actualReps: 8, actualWeightKg: 40 })) });
  await complete(a.user, p.scheduled[1].user_workout_id, 45);
  const stats = await result(a.user.api, '/api/user/program-statistics'), program = stats.programs.find((r: any) => r.programId === p.id);
  expect(program.completedWorkouts).toBe(2); expect(program.weeklyVolumes.map((w: any) => w.volumeKg)).toEqual([960, 1080]); expect(program.exerciseStatistics).toHaveLength(3);
  for (const e of program.exerciseStatistics) { expect(e.weeks.map((w: any) => w.volumeKg)).toEqual([320, 360]); expect(e.weeks.map((w: any) => w.maxWeightKg)).toEqual([40, 45]); }
  await signIn(page, a.user); await page.goto('/user/program-statistics'); const root = page.locator('app-user-program-statistics');
  const selects = root.locator('section[aria-labelledby=sbd-title] > div > label > select'); await expect(selects).toHaveCount(3);
  for (let i = 0; i < 3; i++) await selects.nth(i).selectOption({ label: p.exercises[i].name });
  const graphs = root.locator('app-program-strength-overview'); await expect(graphs.locator('svg[role=img]')).toHaveCount(3);
  const titles = await graphs.locator('svg title').allTextContents(); expect(titles.join(' ')).toContain('320'); expect(titles.join(' ')).toContain('360');
  await graphs.locator('summary').filter({ hasText: /^Grafikonadatok táblázatban$/ }).click(); await expect(graphs.locator('table')).toContainText('320'); await expect(graphs.locator('table')).toContainText('360');
  await page.reload(); await expect(root).toContainText(p.name);
});

for (const role of ['coach', 'user'] as const) {
  test(`${role} profil: belépési név módosítása és opcionális mezők törlése`, async ({ page, actors: a }) => {
    const who = a[role]; await signIn(page, who); await page.goto(`/${role}/profile`); const root = page.locator(role === 'coach' ? 'app-coach-profile' : 'app-user-profile');
    await expect(root.locator('#email')).toHaveValue(who.email); const renamed = unique(role);
    await root.locator(role === 'coach' ? '#name' : '#username').fill(renamed);
    const fields = role === 'coach' ? ['phone', 'specialization', 'avatar_url'] : ['age', 'weight', 'height', 'goals', 'avatar_url'];
    for (const field of fields) await root.locator(`#${field}`).clear();
    const saved = response(page, role === 'coach' ? 'PUT' : 'POST', role === 'coach' ? '/api/members/me/coach' : '/api/members/me'); await root.getByRole('button', { name: 'Mentés', exact: true }).click(); expect((await saved).status()).toBe(200);
    await page.context().clearCookies(); await signIn(page, { ...who, username: renamed }); await page.goto(`/${role}/profile`);
    await expect(root.locator(role === 'coach' ? '#name' : '#username')).toHaveValue(renamed); for (const field of fields) await expect(root.locator(`#${field}`)).toHaveValue('');
  });
}

test('Edző összesítők több ügyféllel: inaktív, program nélküli és mai tervezett állapot együtt', async ({ page, actors: a }) => {
  const inactive = await a.create('user', a.coach.id), empty = await a.create('user', a.coach.id);
  await plan(a.coach, a.user, { days: [1] }); const p = await plan(a.coach, inactive, { start: date(-2), days: [1] });
  await save(inactive.api, 'put', `/api/mobile/v1/user-workouts/${p.scheduled[0].user_workout_id}/state`, { status: 'IN_PROGRESS' });
  await signIn(page, a.coach); const root = page.locator('app-coach-home'), summary = root.locator('section[aria-label]').first().locator(':scope > div');
  await expect(summary.nth(0).locator('p').last()).toHaveText('1'); await expect(summary.nth(1).locator('p').last()).toHaveText('0 / 1'); await expect(summary.nth(2).locator('p').last()).toHaveText('2');
  await expect(root).toContainText(inactive.username); await expect(root).toContainText(empty.username);
  await page.goto('/coach/clients'); const clients = page.locator('app-coach-clients'); await expect(clients.locator('section a')).toHaveCount(3);
  for (const who of [a.user, inactive, empty]) { await clients.locator('[name=clientSearch]').fill(who.username); await expect(clients.locator('section a')).toHaveCount(1); await expect(clients.locator('section a')).toContainText(who.username); }
});

test('Gyakorlatkeresés: minden választható keresőmező és rendezés valódi API-val', async ({ page, actors: a }) => {
  const tag = unique('mező'), fields = { name: `${tag} név`, bodyPart: `${tag}test`, primaryMuscles: `${tag}fo`, secondaryMuscles: `${tag}masod` };
  const exercise = await save(a.coach.api, 'post', '/api/exercises', fields); await signIn(page, a.coach); await page.goto('/coach/exercises'); const root = page.locator('app-exercise-controller');
  for (const field of ['all', 'name', 'bodyPart', 'primaryMuscles', 'secondaryMuscles']) {
    const word = field === 'all' ? fields.name : fields[field as keyof typeof fields];
    await root.locator('app-exercise-search-field select').selectOption(field); await root.locator('app-search input').fill(word);
    const searched = response(page, 'GET', '/api/exercises/search'); await root.getByRole('button', { name: 'Keresés', exact: true }).click(); const r = await searched; expect(r.status()).toBe(200); const data = (await r.json()).data;
    expect(data.content.map((row: any) => row.id)).toEqual([exercise.id]); await expect(root.locator('app-card')).toHaveCount(1); await expect(root).toContainText(fields.name);
  }
  const sorted = response(page, 'GET', '/api/exercises/search'); await root.getByRole('button', { name: 'Gyakorlat neve', exact: true }).click(); expect((await sorted).status()).toBe(200); await expect(root.locator('app-card')).toHaveCount(1);
});
