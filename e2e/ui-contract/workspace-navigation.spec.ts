import { test, expect, TODAY } from './workspace-fixture';

test('overview: real new home, totals and query range', async ({ page, api }) => {
  await page.goto('/coach/dashboard');
  const home = page.locator('app-coach-home');
  await expect(home.getByRole('heading', { name: 'Áttekintés' })).toBeVisible();
  await expect(home.getByRole('region', { name: 'Összesítés' }).locator('div').first().locator('p').last()).toHaveText('1');
  await expect(home.locator(`a[href="/coach/clients/7?workout=70"]`)).toContainText('Alice');
  await expect(home.getByText('Nincs kiosztott programja')).toBeVisible();
  expect(api.calls.find(c => c.path === '/api/coach/overview')?.query.get('from')).toBe('2030-04-08');
  expect(api.writes()).toEqual([]);
});
for (const [name, target] of [['Új program', '/coach/programs/new'], ['Program kiosztása', '/coach/clients'], ['Összes program', '/coach/programs']] as const) {
  test(`overview shortcut: ${name}`, async ({ page, api }) => {
    await page.goto('/coach/dashboard');
    await page.locator('app-coach-home').getByRole('link', { name, exact: true }).click();
    await expect(page).toHaveURL(new URL(target, page.url()).href);
  });
}
test('overview: empty responses show all empty states', async ({ page, api }) => {
  api.state.clients = [];
  await page.goto('/coach/dashboard');
  const home = page.locator('app-coach-home');
  for (const text of ['Mára nincs ütemezett edzés.', 'Minden rendben, senki nem igényel figyelmet.', 'Nincs aktív program.', 'Az elmúlt 30 napban nem zárult le program.']) await expect(home.getByText(text, { exact: true })).toBeVisible();
});
test('overview: backend failure is visible', async ({ page, api }) => {
  api.fail('GET', '/api/coach/overview'); await page.goto('/coach/dashboard');
  await expect(page.locator('app-coach-home app-message[role=alert]')).toContainText('Contract failure');
  await expect(page.locator('app-coach-home section')).toHaveCount(0);
});
test('overview: statuses, missed sessions and recently finished deep link', async ({ page, api }) => {
  const u = api.state.clients[0];
  u.workouts.push({ ...u.workouts[0], userWorkoutId: 72, completed: true });
  u.workouts.push({ ...u.workouts[0], userWorkoutId: 73, startedAt: TODAY });
  u.workouts.push({ ...u.workouts[0], userWorkoutId: 74, scheduledAt: '2030-04-14' });
  u.programs.push({ ...u.programs[0], programId: 2, name: 'Finished plan', endDate: '2030-04-01' });
  await page.goto('/coach/dashboard');
  const home = page.locator('app-coach-home');
  for (const [id, status] of [[70, 'Tervezett'], [72, 'Kész'], [73, 'Folyamatban']]) await expect(home.locator(`a[href="/coach/clients/7?workout=${id}"]`)).toContainText(String(status));
  await expect(home.getByText('1 kimaradt edzés')).toBeVisible();
  await expect(home.locator('a[href="/coach/clients/7?program=2"]')).toContainText('Finished plan');
});
for (const term of ['ALICE', 'alice@example.test', 'Program 01']) {
  test(`clients: search by ${term}, clear and no results`, async ({ page, api }) => {
    await page.goto('/coach/clients'); const root = page.locator('app-coach-clients');
    await expect(root.locator('section a')).toHaveCount(2);
    await root.locator('[name=clientSearch]').fill(` ${term} `);
    await expect(root.locator('section a')).toHaveCount(1);
    await expect(root.locator('section a')).toContainText('Alice');
    await expect(root.getByRole('progressbar')).toHaveAttribute('aria-valuenow', '0');
    await root.locator('[name=clientSearch]').fill('no-such-client');
    await expect(root.locator('app-empty-state')).toBeVisible();
    await root.locator('[name=clientSearch]').clear(); await expect(root.locator('section a')).toHaveCount(2);
    await root.locator('section a[href="/coach/clients/7"]').click();
    await expect(page.locator('app-coach-client-detail h1')).toHaveText('Alice');
    expect(api.writes()).toEqual([]);
  });
}
test('clients: zero-workout progress is finite; failure is visible', async ({ page, api }) => {
  await page.goto('/coach/clients');
  await expect(page.locator('app-coach-clients a[href="/coach/clients/8"] [role=progressbar]')).toHaveAttribute('aria-valuenow', '0');
  api.fail('GET', '/api/coach/overview'); await page.reload();
  await expect(page.locator('app-coach-clients app-message[role=alert]')).toContainText('Contract failure');
});
test('programs: local search, sorting, pagination resets and editor link', async ({ page, api }) => {
  await page.goto('/coach/programs'); const root = page.locator('app-coach-programs');
  await expect(root.locator('article')).toHaveCount(12);
  await root.locator('[name=programSort]').selectOption('nameAsc');
  await expect(root.locator('article h2').first()).toHaveText('Program 01');
  await root.getByRole('button', { name: 'Következő oldal' }).click();
  await expect(root.locator('article')).toHaveCount(3);
  await root.locator('[name=programSearch]').fill(' PROGRAM 01 ');
  await expect(root.locator('article')).toHaveCount(1);
  await root.locator('[name=programSearch]').fill('absent'); await expect(root.locator('app-empty-state')).toBeVisible();
  await root.locator('[name=programSearch]').clear();
  await root.locator('[name=programSort]').selectOption('nameDesc');
  await expect(root.locator('article h2').first()).toHaveText('Program 15');
  await root.locator('article').first().getByRole('link', { name: 'Megnyitás' }).click();
  await expect(page).toHaveURL(/\/coach\/programs\/15$/);
  expect(api.writes()).toEqual([]);
});
for (const [filter, count, name] of [['Aktív', 12, 'Program 01'], ['Hamarosan', 1, 'Program 03'], ['Befejezett', 1, 'Program 02']] as const) {
  test(`programs: status ${filter}`, async ({ page, api }) => {
    await page.goto('/coach/programs'); const root = page.locator('app-coach-programs');
    await root.getByRole('button', { name: new RegExp(`^${filter} \\(`) }).click();
    await expect(root.locator('article')).toHaveCount(count);
    await expect(root.locator('article h2').first()).toHaveText(name);
    await expect(root.getByRole('button', { name: new RegExp(`^${filter} \\(`) })).toHaveAttribute('aria-pressed', 'true');
  });
}
for (const outcome of ['cancel', 'success', 'conflict'] as const) {
  test(`programs: deletion ${outcome}`, async ({ page, api }) => {
    if (outcome === 'conflict') api.fail('DELETE', '/api/programs/coach/1', 409);
    await page.goto('/coach/programs'); const root = page.locator('app-coach-programs');
    await root.locator('[name=programSearch]').fill('Program 01'); const card = root.locator('article');
    await card.getByRole('button', { name: 'Törlés', exact: true }).click();
    await expect(card).toContainText('Biztosan törlöd a programot?');
    await card.getByRole('button', { name: outcome === 'cancel' ? 'Mégse' : 'Törlés', exact: true }).click();
    if (outcome === 'success') await expect(card).toHaveCount(0);
    else await expect(card.getByRole('link', { name: 'Megnyitás' })).toBeVisible();
    if (outcome === 'conflict') await expect(root.locator('app-message[role=status]')).toContainText('Contract failure');
    expect(api.writes('/api/programs/coach/1')).toHaveLength(outcome === 'cancel' ? 0 : 1);
  });
}
test('programs: date sort directions and filter resets page two', async ({ page, api }) => {
  await page.goto('/coach/programs'); const root = page.locator('app-coach-programs');
  await expect(root.locator('article h2').first()).toHaveText('Program 03');
  await root.locator('[name=programSort]').selectOption('dateAsc');
  await expect(root.locator('article h2').first()).toHaveText('Program 02');
  await root.getByRole('button', { name: 'Következő oldal' }).click();
  await root.getByRole('button', { name: /^Hamarosan \(/ }).click();
  await expect(root.locator('article h2')).toHaveText(['Program 03']);
});
for (const path of ['/coach/dashboard', '/coach/clients', '/coach/programs', '/coach/programs/1']) {
  test(`responsive: ${path}`, async ({ page, api }) => {
    await page.goto(path); await expect(page.locator('h1')).toBeVisible();
    await expect(page.locator('app-loading')).toHaveCount(0);
    expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual((page.viewportSize()?.width ?? 0) + 1);
  });
}

test('overview: expired programme and inactivity attention reasons', async ({ page, api }) => {
  const alice = api.state.clients[0]; alice.programs[0].endDate = '2030-04-01';
  alice.workouts = []; await page.goto('/coach/dashboard');
  await expect(page.locator('app-coach-home')).toContainText('Lejárt a programja');
  alice.programs[0].endDate = '2030-05-06'; alice.lastCompletedAt = '2030-01-01';
  alice.workouts.push({ userWorkoutId: 74, programId: 1, workoutId: 10, dayIndex: 1, workoutName: 'Workout A', programName: 'Program 01', scheduledAt: '2030-04-14', completed: true, startedAt: null });
  await page.reload(); await expect(page.locator('app-coach-home')).toContainText('Utolsó edzés: 2030-01-01');
});
for (const [language, heading] of [['en', 'Overview'], ['de', 'Übersicht']] as const) {
  test(`workspace language: ${language} translates new home`, async ({ page, api }) => {
    await page.goto('/coach/dashboard'); await page.locator('app-language-selector select').selectOption(language);
    await expect(page.locator('app-coach-home h1')).toHaveText(heading);
  });
}

test('responsive client detail: loaded set table stays inside viewport and keeps closed menu hidden', async ({ page, api }) => {
  await page.goto('/coach/clients/7?program=1&workout=70');
  await expect(page.locator('app-coach-client-detail article').first().getByRole('spinbutton').first()).toBeVisible();
  const dimensions = await page.evaluate(() => ({ viewport: document.documentElement.clientWidth, page: document.body.scrollWidth, inner: innerWidth }));
  expect(dimensions.page, `Loaded set table overflow: ${JSON.stringify(dimensions)}`).toBeLessThanOrEqual(dimensions.viewport + 1);
  if (dimensions.viewport < 640) await expect(page.locator('#application-menu')).toBeHidden();
});
