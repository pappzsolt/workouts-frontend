import type { Page } from '@playwright/test';
import { test, expect, TODAY } from './workout-editor-fixture';

const editor = (page: Page) => page.locator('app-coach-workout-edit');
const save = (page: Page) => editor(page).locator('button[type=submit]');
const language = (page: Page) => page.locator('app-language-selector select');

for (const target of ['en', 'de'] as const) {
  test(`workout drafts: ${target} has separate text drafts and shares numeric edits`, async ({ page, workoutApi, api }) => {
    await page.goto('/coach/workouts/30/edit');
    const form = editor(page);
    await expect(form.locator('#workoutName')).toHaveValue(workoutApi.texts.hu.name);
    await form.locator('#workoutName').fill('Magyar piszkozat');
    await form.locator('#description').fill('Magyar módosítás');
    await form.locator('#durationMinutes').fill('55');
    await form.locator('select#intensityLevel').selectOption('HIGH');
    await language(page).selectOption(target);
    await expect(form.locator('#workoutName')).toHaveValue(workoutApi.texts[target].name);
    await expect(form.locator('#description')).toHaveValue(workoutApi.texts[target].description);
    await expect(form.locator('#durationMinutes')).toHaveValue('55');
    await expect(form.locator('select#intensityLevel')).toHaveValue('HIGH');
    await form.locator('#workoutName').fill('Translated draft');
    await language(page).selectOption('hu');
    await expect(form.locator('#workoutName')).toHaveValue('Magyar piszkozat');
    await expect(form.locator('#description')).toHaveValue('Magyar módosítás');
    await language(page).selectOption(target);
    await expect(form.locator('#workoutName')).toHaveValue('Translated draft');
    expect(api.writes()).toEqual([]);
  });
}

test('workout drafts: pending language load blocks saving old text and saves the loaded language exactly', async ({ page, workoutApi, api }) => {
  await page.goto('/coach/workouts/30/edit');
  await expect(save(page)).toBeEnabled();
  await editor(page).locator('#workoutName').fill('Magyar piszkozat');
  const gate = workoutApi.hold('GET', 'en');
  await language(page).selectOption('en');
  await gate.requested;
  await expect(save(page)).toBeDisabled();
  await expect(editor(page).locator('#workoutName')).toBeDisabled();
  expect(api.writes()).toEqual([]);
  gate.release();
  await expect(editor(page).locator('#workoutName')).toHaveValue('English workout');
  await expect(save(page)).toBeEnabled();
  await save(page).click();
  await expect.poll(() => api.writes('/api/workouts/30').length).toBe(1);
  const call = api.writes('/api/workouts/30')[0];
  expect(call.query.get('language')).toBe('en');
  expect(call.body).toEqual({ id: 30, name: 'English workout', description: 'English description',
    workoutDate: TODAY, durationMinutes: 40, intensityLevel: 'LOW', dayIndex: 2, done: true });
  await expect(save(page)).toBeEnabled();
  await page.clock.runFor(1600);
  await expect(page).toHaveURL(/\/coach\/workouts$/);
});

test('workout drafts: a failed language load keeps save disabled and returning restores the draft', async ({ page, workoutApi, api }) => {
  await page.goto('/coach/workouts/30/edit');
  await expect(save(page)).toBeEnabled();
  await editor(page).locator('#workoutName').fill('Megőrzött piszkozat');
  workoutApi.failNext('GET', 'en');
  await language(page).selectOption('en');
  await expect(editor(page).locator('app-message').first()).toBeVisible();
  await expect(save(page)).toBeDisabled();
  expect(api.writes()).toEqual([]);
  await language(page).selectOption('hu');
  await expect(editor(page).locator('#workoutName')).toHaveValue('Megőrzött piszkozat');
  await expect(save(page)).toBeEnabled();
});

test('workout drafts: shared selection entered during loading survives the response', async ({ page, workoutApi }) => {
  await page.goto('/coach/workouts/30/edit');
  await expect(save(page)).toBeEnabled();
  const gate = workoutApi.hold('GET', 'en');
  await language(page).selectOption('en');
  await gate.requested;
  await editor(page).locator('select#intensityLevel').selectOption('HIGH');
  gate.release();
  await expect(editor(page).locator('#workoutName')).toHaveValue('English workout');
  await expect(editor(page).locator('select#intensityLevel')).toHaveValue('HIGH');
});

test('workout drafts: a late cancelled language response cannot overwrite the newest language', async ({ page, workoutApi, api }) => {
  await page.goto('/coach/workouts/30/edit');
  await expect(save(page)).toBeEnabled();
  const gate = workoutApi.hold('GET', 'en');
  await language(page).selectOption('en');
  await gate.requested;
  const cancelled = page.waitForEvent('requestfailed', request => {
    const url = new URL(request.url());
    return request.method() === 'GET' && url.pathname === '/api/workouts/30' && url.searchParams.get('language') === 'en';
  });
  await language(page).selectOption('de');
  await cancelled;
  await expect(editor(page).locator('#workoutName')).toHaveValue('Deutsches Training');
  gate.release();
  await expect(editor(page).locator('#workoutName')).toHaveValue('Deutsches Training');
  await save(page).click();
  await expect.poll(() => api.writes('/api/workouts/30').length).toBe(1);
  expect(api.writes('/api/workouts/30')[0].query.get('language')).toBe('de');
  expect(api.writes('/api/workouts/30')[0].body.name).toBe('Deutsches Training');
});

for (const duration of ['', '0']) {
  test(`workout drafts: cleared fields and duration ${JSON.stringify(duration)} retain their exact request values`, async ({ page, workoutApi, api }) => {
    await page.goto('/coach/workouts/30/edit');
    await expect(save(page)).toBeEnabled();
    const form = editor(page);
    await form.locator('#description').fill('');
    await form.locator('#durationMinutes').fill(duration);
    await form.locator('#done').uncheck();
    await language(page).selectOption('en');
    await expect(form.locator('#description')).toHaveValue('English description');
    await expect(form.locator('#durationMinutes')).toHaveValue(duration);
    await expect(form.locator('#done')).not.toBeChecked();
    await language(page).selectOption('hu');
    await expect(form.locator('#description')).toHaveValue('');
    await save(page).click();
    await expect.poll(() => api.writes('/api/workouts/30').length).toBe(1);
    expect(api.writes('/api/workouts/30')[0].body).toEqual({ id: 30, name: 'Magyar edzés', description: '',
      workoutDate: TODAY, durationMinutes: null, intensityLevel: 'LOW', dayIndex: 2, done: false });
  });
}

test('workout drafts: pending save disables resubmission and sends one request', async ({ page, workoutApi, api }) => {
  await page.goto('/coach/workouts/30/edit');
  await expect(save(page)).toBeEnabled();
  const gate = workoutApi.hold('PUT', 'hu');
  await save(page).click();
  await gate.requested;
  await expect(save(page)).toBeDisabled();
  expect(api.writes('/api/workouts/30')).toHaveLength(1);
  gate.release();
  await expect(editor(page).locator('app-message').first()).toBeVisible();
  await expect(save(page)).toBeEnabled();
  await page.clock.runFor(1600);
  await expect(page).toHaveURL(/\/coach\/workouts$/);
  expect(api.writes('/api/workouts/30')).toHaveLength(1);
});

test('workout drafts: failed save preserves values and retries the same payload', async ({ page, workoutApi, api }) => {
  await page.goto('/coach/workouts/30/edit');
  await expect(save(page)).toBeEnabled();
  await editor(page).locator('#workoutName').fill('Retry draft');
  workoutApi.failNext('PUT', 'hu');
  await save(page).click();
  await expect(editor(page).locator('app-message').first()).toContainText('Workout response unavailable');
  await expect(editor(page).locator('#workoutName')).toHaveValue('Retry draft');
  await expect(save(page)).toBeEnabled();
  await save(page).click();
  await expect.poll(() => api.writes('/api/workouts/30').length).toBe(2);
  const writes = api.writes('/api/workouts/30');
  expect(writes[1].body).toEqual(writes[0].body);
  await expect(save(page)).toBeEnabled();
  await page.clock.runFor(1600);
  await expect(page).toHaveURL(/\/coach\/workouts$/);
});

test('workout drafts: an old save response cannot redirect after changing language', async ({ page, workoutApi, api }) => {
  await page.goto('/coach/workouts/30/edit');
  await expect(save(page)).toBeEnabled();
  const gate = workoutApi.hold('PUT', 'hu');
  await save(page).click();
  await gate.requested;
  await language(page).selectOption('en');
  await expect(editor(page).locator('#workoutName')).toHaveValue('English workout');
  gate.release();
  await expect(save(page)).toBeEnabled();
  await page.clock.runFor(2000);
  await expect(page).toHaveURL(/\/coach\/workouts\/30\/edit$/);
  await expect(editor(page).locator('#workoutName')).toHaveValue('English workout');
  expect(api.writes('/api/workouts/30')).toHaveLength(1);
});
