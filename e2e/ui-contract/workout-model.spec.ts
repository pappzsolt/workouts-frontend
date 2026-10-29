import { test, expect, TODAY } from './workout-editor-fixture';

for (const duration of ['45', '']) {
  test(`workout model: creation sends canonical fields with duration ${JSON.stringify(duration)} and opens the saved template`, async ({ page, api, workoutApi }) => {
    let created: Record<string, unknown> | undefined;
    await page.route(/\/api\/workouts(?:\?|$)/, async route => {
      if (route.request().method() !== 'POST') return route.fallback();
      const url = new URL(route.request().url());
      const body = route.request().postDataJSON();
      created = body;
      api.calls.push({ method: 'POST', path: url.pathname, query: url.searchParams, body });
      api.state.workouts.push({ ...body, id: 31, exercises: [] });
      await route.fulfill({ json: { success: true, message: null, data: { id: 31, status: 'ok' } } });
    });
    await page.route(/\/api\/workouts\/31(?:\?|$)/, async route => {
      if (route.request().method() !== 'GET') return route.fallback();
      if (!created) throw new Error('Workout read before creation');
      const url = new URL(route.request().url());
      api.calls.push({ method: 'GET', path: url.pathname, query: url.searchParams, body: null });
      await route.fulfill({ json: { success: true, data: {
        workoutId: 31, workoutName: created.name, workoutDescription: created.description,
        workoutDate: created.workoutDate, durationMinutes: created.durationMinutes,
        intensityLevel: created.intensityLevel, dayIndex: created.dayIndex, done: created.done,
      } } });
    });
    await page.goto('/coach/workouts/new');
    const form = page.locator('app-newworkout');
    await expect(form.locator('button[type=submit]')).toBeDisabled();
    await form.locator('#workoutName').fill('New template');
    await form.locator('#description').fill('Template description');
    await form.locator('#workoutDate').fill(TODAY);
    await form.locator('#durationMinutes').fill(duration);
    await form.locator('select#intensityLevel').selectOption('HIGH');
    await form.locator('button[type=submit]').click();
    await expect(page).toHaveURL(/\/coach\/workouts\/31\/edit$/);
    const writes = api.writes('/api/workouts');
    expect(writes).toHaveLength(1);
    expect(writes[0].query.get('language')).toBe('hu');
    expect(writes[0].body).toEqual({
      id: null, name: 'New template', description: 'Template description', workoutDate: TODAY,
      durationMinutes: duration ? 45 : null, intensityLevel: 'HIGH', dayIndex: null, done: false,
    });
    const editor = page.locator('app-coach-workout-edit');
    await expect(editor.locator('#workoutName')).toHaveValue('New template');
    await expect(editor.locator('#description')).toHaveValue('Template description');
    await expect(editor.locator('select#intensityLevel')).toHaveValue('HIGH');
    await expect(editor.locator('#durationMinutes')).toHaveValue(duration);
  });
}

test('workout model: library uses the canonical name and deletion requires confirmation', async ({ page, api, workoutApi }) => {
  await page.route('**/api/exercises/workouts/page?**', async route => {
    const url = new URL(route.request().url());
    api.calls.push({ method: 'GET', path: url.pathname, query: url.searchParams, body: null });
    const content = api.state.workouts.filter(workout => workout.id === 30).map(workout => ({
      ...workout, programNames: ['Program 01'],
      exercises: workout.exercises.map((exercise, index) => ({
        id: 30000 + exercise.id, workoutId: 30, exercise,
        sets: exercise.sets, repetitions: exercise.repetitions, orderIndex: index,
        restSeconds: exercise.restSeconds, notes: null, done: false,
      })),
    }));
    await route.fulfill({ json: { success: true, data: { content, page: 0, size: 6, totalElements: content.length, totalPages: 1 } } });
  });
  await page.route(/\/api\/workouts\/30(?:\?|$)/, async route => {
    if (route.request().method() !== 'DELETE') return route.fallback();
    const url = new URL(route.request().url());
    api.calls.push({ method: 'DELETE', path: url.pathname, query: url.searchParams, body: null });
    api.state.workouts = api.state.workouts.filter(workout => workout.id !== 30);
    await route.fulfill({ json: { success: true, data: { status: 'ok', id: 30 }, message: null } });
  });
  await page.goto('/coach/workouts');
  const list = page.locator('app-coach-workouts');
  const card = list.locator('app-card').filter({ has: page.getByRole('heading', { name: workoutApi.texts.hu.name, exact: true }) });
  await expect(card).toBeVisible();
  await expect(card).toContainText('Magyar leírás');
  await expect(card).toContainText('Program 01');
  await expect(card.locator('app-card-stat').last()).toContainText('2');
  const remove = card.getByRole('button', { name: 'Törlés', exact: true });
  await remove.click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText(workoutApi.texts.hu.name);
  await dialog.getByRole('button', { name: 'Mégse', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  expect(api.writes()).toEqual([]);
  await remove.click();
  await dialog.getByRole('button', { name: 'Törlés', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(card).toHaveCount(0);
  expect(api.writes()).toEqual([expect.objectContaining({ method: 'DELETE', path: '/api/workouts/30', body: null })]);
});
