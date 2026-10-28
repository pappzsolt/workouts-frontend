import { test, expect, TODAY } from './workspace-fixture';

// Coach workout editor (/coach/workouts/:id/edit): form, exercise list and the program lock.
const root = (p: any) => p.locator('app-coach-workout-edit');
const current = (p: any) => root(p).locator('div.rounded-xl.border.bg-surface-50:has(> div.rounded-lg.bg-primary-600)');

function freeWorkout(api: any) {
  const s = api.state;
  s.workouts.push({ id: 30, name: 'Free workout', description: 'Free description', workoutDate: '2030-04-20', durationMinutes: 40,
    intensityLevel: 'LOW', done: false, exercises: [s.exercises[3], s.exercises[4], s.exercises[5]].map((e: any) => ({ ...e })) });
}

test('workout edit: loads the workout, saves the exact form values and returns to the library', async ({ page, api }) => {
  freeWorkout(api); await page.goto('/coach/workouts/30/edit'); const r = root(page);
  await expect(r.locator('#workoutName')).toHaveValue('Free workout');
  await expect(r.locator('#description')).toHaveValue('Free description');
  await expect(r.locator('#workoutDate')).toHaveValue('2030-04-20');
  await expect(r.locator('#durationMinutes')).toHaveValue('40');
  await expect(r.locator('select#intensityLevel')).toHaveValue('LOW');
  await expect(current(page)).toHaveCount(3);
  await r.locator('#workoutName').fill('Renamed workout'); await r.locator('#description').fill('New description');
  await r.locator('#workoutDate').fill('2030-04-21'); await r.locator('#durationMinutes').fill('55');
  await r.locator('select#intensityLevel').selectOption('HIGH'); await r.locator('#done').check();
  await r.locator('button[type=submit]').click();
  await expect(r.locator('app-message').first()).toContainText('Workout sikeresen frissítve.');
  const put = api.writes('/api/workouts/30')[0];
  expect(put.method).toBe('PUT'); expect(put.query.get('language')).toBe('hu');
  expect(put.body).toEqual({ id: 30, name: 'Renamed workout', description: 'New description', workoutDate: '2030-04-21',
    durationMinutes: 55, intensityLevel: 'HIGH', dayIndex: null, done: true });
  await expect(page).toHaveURL(/\/coach\/workouts$/);
});

test('workout edit: cancel leaves without writing', async ({ page, api }) => {
  freeWorkout(api); await page.goto('/coach/workouts/30/edit'); const r = root(page);
  await expect(r.locator('#workoutName')).toHaveValue('Free workout');
  await r.locator('#workoutName').fill('Not saved');
  await r.getByRole('button', { name: 'Mégse', exact: true }).click();
  await expect(page).toHaveURL(/\/coach\/workouts$/); expect(api.writes()).toEqual([]);
});

test('workout edit: search, select and add an exercise; added exercises leave the list', async ({ page, api }) => {
  freeWorkout(api); await page.goto('/coach/workouts/30/edit'); const r = root(page);
  const results = r.locator('div.max-h-72 button');
  await expect(results).toHaveCount(12);
  await expect(results.filter({ hasText: 'Exercise 04' })).toHaveCount(0);
  await r.locator('#exerciseSearch').fill('exercise 1');
  await expect(results).toHaveCount(6);
  await results.filter({ hasText: 'Exercise 12' }).click();
  await expect(r).toContainText('Kiválasztott exercise');
  await r.locator('#exerciseSearch').fill('');
  await expect(r.getByText('Kiválasztott exercise')).toHaveCount(0);
  await r.locator('#exerciseSearch').fill('Exercise 12');
  await results.filter({ hasText: 'Exercise 12' }).click();
  await r.getByRole('button', { name: 'Exercise hozzáadása', exact: true }).click();
  await expect(r.locator('app-message').first()).toContainText('Exercise sikeresen hozzáadva a workouthoz.');
  await expect(current(page)).toHaveCount(4); await expect(current(page).nth(3)).toContainText('Exercise 12');
  await expect(r).toContainText('Nincs találat erre:');
  const post = api.writes('/api/workout-exercises')[0];
  expect([post.method, post.query.get('workoutId'), post.query.get('exerciseId')]).toEqual(['POST', '30', '12']);
});

test('workout edit: failed add keeps the list and shows the backend message', async ({ page, api }) => {
  freeWorkout(api); api.fail('POST', '/api/workout-exercises'); await page.goto('/coach/workouts/30/edit'); const r = root(page);
  await r.locator('#exerciseSearch').fill('Exercise 01');
  await r.locator('div.max-h-72 button').filter({ hasText: 'Exercise 01' }).click();
  await r.getByRole('button', { name: 'Exercise hozzáadása', exact: true }).click();
  await expect(r.locator('app-message').first()).toContainText('Contract failure');
  await expect(current(page)).toHaveCount(3);
});

test('workout edit: move down and up sends the target order index and reloads the order', async ({ page, api }) => {
  freeWorkout(api); await page.goto('/coach/workouts/30/edit');
  await expect(current(page).first()).toContainText('Exercise 04');
  await expect(current(page).first().getByRole('button', { name: 'Feljebb' })).toBeDisabled();
  await expect(current(page).last().getByRole('button', { name: 'Lejjebb' })).toBeDisabled();
  await current(page).first().getByRole('button', { name: 'Lejjebb' }).click();
  await expect(current(page).first()).toContainText('Exercise 05'); await expect(current(page).nth(1)).toContainText('Exercise 04');
  await current(page).nth(2).getByRole('button', { name: 'Feljebb' }).click();
  await expect(current(page).nth(1)).toContainText('Exercise 06');
  expect(api.writes('/api/workout-exercises/order').map(c => [c.query.get('exerciseId'), c.query.get('orderIndex')])).toEqual([['4', '1'], ['6', '1']]);
});

test('workout edit: failed reorder shows the error and keeps the order', async ({ page, api }) => {
  freeWorkout(api); api.fail('PUT', '/api/workout-exercises/order'); await page.goto('/coach/workouts/30/edit');
  await current(page).first().getByRole('button', { name: 'Lejjebb' }).click();
  await expect(root(page).locator('app-message').first()).toContainText('Contract failure');
  await expect(current(page).first()).toContainText('Exercise 04');
});

test('workout edit: remove an exercise, then a failed removal keeps the list', async ({ page, api }) => {
  freeWorkout(api); await page.goto('/coach/workouts/30/edit');
  await current(page).nth(1).getByRole('button', { name: 'Gyakorlat eltávolítása' }).click();
  await expect(root(page).locator('app-message').first()).toContainText('A gyakorlat eltávolítva.');
  await expect(current(page)).toHaveCount(2); await expect(current(page).nth(1)).toContainText('Exercise 06');
  const del = api.writes('/api/workout-exercises')[0];
  expect([del.method, del.query.get('workoutId'), del.query.get('exerciseId')]).toEqual(['DELETE', '30', '5']);
  api.fail('DELETE', '/api/workout-exercises');
  await current(page).first().getByRole('button', { name: 'Gyakorlat eltávolítása' }).click();
  await expect(root(page).locator('app-message').first()).toContainText('Contract failure');
  await expect(current(page)).toHaveCount(2);
});

test('workout edit: a workout in a program is locked; the editable copy opens in the editor', async ({ page, api }) => {
  await page.goto('/coach/workouts/10/edit'); const r = root(page);
  await expect(r).toContainText('Ez a workout már programhoz van rendelve');
  await expect(r.getByRole('link', { name: 'Program 01', exact: true })).toHaveAttribute('href', '/coach/programs/1');
  await expect(r.locator('#exerciseSearch')).toHaveCount(0);
  await expect(current(page)).toHaveCount(2);
  await expect(r.getByRole('button', { name: 'Gyakorlat eltávolítása' })).toHaveCount(0);
  await r.getByRole('button', { name: 'Szerkeszthető másolat készítése', exact: true }).click();
  await expect(page).toHaveURL(/\/coach\/workouts\/200\/edit$/);
  await expect(r.locator('#workoutName')).toHaveValue('Workout A (2)');
  await expect(r.locator('#exerciseSearch')).toBeVisible();
  const copy = api.writes('/api/coach/workouts/10/copy')[0];
  expect(copy.body).toEqual({ name: 'Workout A (2)' }); expect(copy.query.get('language')).toBe('hu');
});

test('workout edit: failed copy shows the backend message and stays', async ({ page, api }) => {
  api.fail('POST', '/api/coach/workouts/10/copy'); await page.goto('/coach/workouts/10/edit'); const r = root(page);
  await r.getByRole('button', { name: 'Szerkeszthető másolat készítése', exact: true }).click();
  await expect(r.locator('app-message').first()).toContainText('Contract failure');
  await expect(page).toHaveURL(/\/coach\/workouts\/10\/edit$/);
});

test('workout edit: missing workout and invalid id show a message and cannot save', async ({ page, api }) => {
  await page.goto('/coach/workouts/999/edit'); const r = root(page);
  await expect(r.locator('app-message').first()).toBeVisible();
  await expect(r.locator('button[type=submit]')).toBeDisabled();
  await page.goto('/coach/workouts/abc/edit');
  await expect(r.locator('app-message').first()).toContainText('Érvénytelen workout ID.');
  expect(api.writes()).toEqual([]); expect(TODAY).toBe('2030-04-15');
});
