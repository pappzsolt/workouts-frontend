import type { Page } from '@playwright/test';
import { test, expect, type WorkspaceApi } from './workspace-fixture';
const root = (page: Page) => page.locator('app-coach-program-editor');
const save = (page: Page) => root(page).locator('app-program-details-form button[type=submit]');
async function localized(page: Page, api: WorkspaceApi) {
  const texts = {
    hu: { programName: 'Magyar program', programDescription: 'Magyar leírás' },
    en: { programName: 'English program', programDescription: 'English description' },
    de: { programName: 'Deutsches Programm', programDescription: 'Deutsche Beschreibung' },
  };
  await page.route(/\/api\/programs\/1(?:\?|$)/, async route => {
    const req = route.request(), url = new URL(req.url()), method = req.method();
    if (method !== 'GET' && method !== 'PUT') return route.fallback();
    const language = url.searchParams.get('language') as keyof typeof texts;
    expect(Object.keys(texts)).toContain(language);
    const body = method === 'PUT' ? req.postDataJSON() : null;
    api.calls.push({ method, path: url.pathname, query: url.searchParams, body });
    if (method === 'PUT') {
      texts[language] = { programName: body.programName, programDescription: body.programDescription };
      const { programName, programDescription, ...shared } = body;
      Object.assign(api.state.programs[0], shared);
    }
    await route.fulfill({ json: { success: true, data: method === 'GET' ? { ...api.program(1), ...texts[language] } : null } });
  });
  return texts;
}
for (const target of ['en', 'de'] as const) {
  test(`program regression: ${target} preserves localized drafts and saves the displayed language`, async ({ page, api }) => {
    const texts = await localized(page, api);
    await page.goto('/coach/programs/1');
    await root(page).getByRole('button', { name: 'Programadatok szerkesztése', exact: true }).click();
    await root(page).locator('[name=programName]').fill('Magyar piszkozat');
    await root(page).locator('[name=programDescription]').fill('Magyar módosítás');
    await root(page).locator('[name=durationDays]').fill('28');
    await page.locator('app-language-selector select').selectOption(target);
    await expect(root(page).locator('[name=programName]')).toHaveValue(texts[target].programName);
    await expect(root(page).locator('[name=programDescription]')).toHaveValue(texts[target].programDescription);
    await expect(root(page).locator('[name=durationDays]')).toHaveValue('28');
    await save(page).click(); await expect(save(page)).toBeEnabled();
    const write = api.writes('/api/programs/1')[0];
    expect(write.query.get('language')).toBe(target);
    expect(write.body).toMatchObject(texts[target]);
    expect(texts.hu.programName).toBe('Magyar program');
    await page.locator('app-language-selector select').selectOption('hu');
    await expect(root(page).locator('[name=programName]')).toHaveValue('Magyar piszkozat');
    await expect(root(page).locator('[name=programDescription]')).toHaveValue('Magyar módosítás');
    await save(page).click(); await expect(save(page)).toBeEnabled();
    expect(texts.hu.programName).toBe('Magyar piszkozat');
    expect(api.writes('/api/programs/1')[1].query.get('language')).toBe('hu');
  });
}
test('program regression: pending and failed language loads block stale saves', async ({ page, api }) => {
  await localized(page, api);
  let requested!: () => void, release!: () => void;
  const requestedPromise = new Promise<void>(resolve => requested = resolve);
  const pending = new Promise<void>(resolve => release = resolve);
  await page.route(/\/api\/programs\/1\?/, async route => {
    if (route.request().method() !== 'GET' || new URL(route.request().url()).searchParams.get('language') !== 'en') return route.fallback();
    requested(); await pending;
    await route.fulfill({ status: 503, json: { success: false, message: 'Translation unavailable' } });
  });
  try {
    await page.goto('/coach/programs/1');
    await root(page).getByRole('button', { name: 'Programadatok szerkesztése', exact: true }).click();
    await root(page).locator('[name=programName]').fill('Megőrzött piszkozat');
    await page.locator('app-language-selector select').selectOption('en'); await requestedPromise;
    await expect(save(page)).toBeDisabled(); release();
    await expect(root(page).locator('app-message[role=status]')).toContainText('Translation unavailable');
    await expect(save(page)).toBeDisabled(); expect(api.writes()).toEqual([]);
    await page.locator('app-language-selector select').selectOption('hu');
    await expect(save(page)).toBeEnabled();
    await expect(root(page).locator('[name=programName]')).toHaveValue('Megőrzött piszkozat');
  } finally { release(); }
});
test('program regression: an in-flight save stays bound to its original language', async ({ page, api }) => {
  const texts = await localized(page, api);
  let requested!: () => void, release!: () => void;
  const requestedPromise = new Promise<void>(resolve => requested = resolve);
  const pending = new Promise<void>(resolve => release = resolve);
  await page.route(/\/api\/programs\/1\?/, async route => {
    if (route.request().method() !== 'PUT') return route.fallback();
    requested(); await pending; await route.fallback();
  });
  try {
    await page.goto('/coach/programs/1');
    await root(page).getByRole('button', { name: 'Programadatok szerkesztése', exact: true }).click();
    await root(page).locator('[name=programName]').fill('Mentett magyar név');
    await save(page).click(); await requestedPromise;
    await page.locator('app-language-selector select').selectOption('en');
    await expect(root(page).locator('[name=programName]')).toHaveValue('English program');
    release(); await expect(save(page)).toBeEnabled();
    await expect(root(page).locator('[name=programName]')).toHaveValue('English program');
    expect(texts.hu.programName).toBe('Mentett magyar név');
    expect(texts.en.programName).toBe('English program');
    expect(api.writes('/api/programs/1')[0].query.get('language')).toBe('hu');
  } finally { release(); }
});
test('program regression: rescheduled repeated workout opens its exact occurrence', async ({ page, api }) => {
  api.state.links[1].workoutId = 10;
  Object.assign(api.state.rows[1], { workout_id: 10, workout_name: 'Workout A', scheduled_date: '2030-04-23', workout_completed: false });
  Object.assign(api.state.clients[0].workouts[1], { workoutId: 10, scheduledAt: '2030-04-23', completed: false });
  await page.goto('/coach/programs/1');
  await root(page).getByRole('button', { name: /Program 8\. napja · Workout A$/ }).click();
  await root(page).locator('a[href="/coach/clients/7?program=1&programWorkout=101"]').click();
  const client = page.locator('app-coach-client-detail');
  await expect(client.getByRole('heading', { name: 'Workout A', exact: true })).toBeVisible();
  await expect(client.getByRole('button', { name: 'Előző edzés', exact: true })).toBeEnabled();
  await expect(client.getByRole('button', { name: 'Következő edzés', exact: true })).toBeDisabled();
  await expect(client.getByLabel(/Exercise 02.*Cél ism\./).first()).toBeVisible();
  expect(api.writes()).toEqual([]);
});
test('program regression: missing requested occurrence never opens another workout', async ({ page, api }) => {
  await page.goto('/coach/clients/7?program=1&programWorkout=9999');
  const client = page.locator('app-coach-client-detail');
  await expect(client.locator('app-message[role=status]')).toContainText('A kért edzés már nem érhető el');
  await expect(client.getByRole('heading', { name: 'Workout A', exact: true })).toHaveCount(0);
  expect(api.writes()).toEqual([]);
});
