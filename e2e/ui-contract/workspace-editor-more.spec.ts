import { test, expect } from './workspace-fixture';

// Program editor flows not covered by workspace-editor.spec.ts.
const editor = (page: any) => page.locator('app-coach-program-editor');
const selected = (page: any) => editor(page).getByRole('region', { name: 'Kiválasztott nap', exact: true });
const status = (page: any) => editor(page).locator('app-message[role=status]');

test('editor more: revoking an assigned client asks first; cancel keeps, confirm moves the client back', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); const r = editor(page);
  await expect(r.getByRole('link', { name: 'Alice', exact: true })).toBeVisible();
  await r.getByRole('button', { name: 'Program visszavonása: Alice', exact: true }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toContainText('Programkiosztás visszavonása'); await expect(dialog).toContainText('„Program 01”');
  await dialog.getByRole('button', { name: 'Mégse', exact: true }).click();
  await expect(dialog).toHaveCount(0); expect(api.writes()).toEqual([]);
  await r.getByRole('button', { name: 'Program visszavonása: Alice', exact: true }).click();
  await dialog.getByRole('button', { name: 'Visszavonás', exact: true }).click();
  await expect(status(page)).toContainText('A program visszavonva.');
  await expect(r.getByRole('checkbox', { name: 'Alice', exact: true })).toBeVisible();
  await expect(r.getByRole('button', { name: 'Program visszavonása: Alice', exact: true })).toHaveCount(0);
  expect(api.writes()).toEqual([expect.objectContaining({ method: 'DELETE', path: '/api/programs/1/assigned-users/7' })]);
});

test('editor more: failed revoke shows the error and keeps the client assigned', async ({ page, api }) => {
  api.fail('DELETE', '/api/programs/1/assigned-users/7'); await page.goto('/coach/programs/1'); const r = editor(page);
  await r.getByRole('button', { name: 'Program visszavonása: Alice', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Visszavonás', exact: true }).click();
  await expect(status(page)).toContainText('Contract failure');
  await expect(r.getByRole('button', { name: 'Program visszavonása: Alice', exact: true })).toBeVisible();
});

test('editor more: editable library copy of the day workout opens in the workout editor', async ({ page, api }) => {
  await page.goto('/coach/programs/1');
  await selected(page).getByRole('button', { name: 'Szerkeszthető másolat az Edzéstárban', exact: true }).click();
  await expect(page).toHaveURL(/\/coach\/workouts\/200\/edit$/);
  await expect(page.locator('app-coach-workout-edit #workoutName')).toHaveValue('Workout A (2)');
  expect(api.writes('/api/coach/workouts/10/copy')[0].body).toEqual({ name: 'Workout A (2)' });
});

test('editor more: failed library copy shows the error and stays', async ({ page, api }) => {
  api.fail('POST', '/api/coach/workouts/10/copy'); await page.goto('/coach/programs/1');
  await selected(page).getByRole('button', { name: 'Szerkeszthető másolat az Edzéstárban', exact: true }).click();
  await expect(status(page)).toContainText('Contract failure'); await expect(page).toHaveURL(/\/coach\/programs\/1$/);
});

test('editor more: new workout for an empty day from chosen exercises', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); const r = editor(page); const panel = selected(page);
  await r.getByRole('button', { name: '2', exact: true }).click();
  await expect(panel.getByRole('tab', { name: 'Új edzés' })).toHaveAttribute('aria-selected', 'true');
  const create = panel.getByRole('button', { name: 'Edzés létrehozása erre a napra', exact: true });
  await expect(create).toBeDisabled();
  await panel.locator('[name=workoutName]').fill('Leg day');
  const picker = panel.locator('app-exercise-picker');
  await picker.getByRole('button', { name: 'Hozzáadás: Exercise 01', exact: true }).click();
  await picker.getByRole('button', { name: 'Hozzáadás: Exercise 03', exact: true }).click();
  await picker.getByRole('button', { name: 'Hozzáadás: Exercise 02', exact: true }).click();
  await expect(picker.getByRole('button', { name: 'Hozzáadás: Exercise 01', exact: true })).toBeDisabled();
  await expect(panel).toContainText('Kiválasztott gyakorlatok (3)');
  await panel.getByRole('button', { name: 'Törlés: Exercise 03', exact: true }).click();
  await expect(panel).toContainText('Kiválasztott gyakorlatok (2)');
  await create.click();
  await expect(r.getByRole('button', { name: '2: Leg day', exact: true })).toBeVisible();
  await expect(status(page)).toContainText('Az edzés létrejött és a naphoz került.');
  expect(api.writes().map(c => [c.method, c.path])).toEqual([
    ['POST', '/api/workouts'], ['POST', '/api/workout-exercises'], ['POST', '/api/workout-exercises'], ['POST', '/api/program-workouts']]);
  expect(api.writes('/api/workouts')[0].body).toEqual({ name: 'Leg day', workoutDate: '2030-04-16' });
  expect(api.writes('/api/workout-exercises').map(c => [c.query.get('workoutId'), c.query.get('exerciseId')])).toEqual([['200', '1'], ['200', '2']]);
  expect(api.writes('/api/program-workouts')[0].body).toEqual({ programId: 1, workoutId: 200, dayIndex: 2 });
});

test('editor more: unsaved prescriptions ask before changing day; stay keeps, discard switches', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); const r = editor(page);
  const sets = selected(page).getByLabel('Sorozat', { exact: true }).first();
  await sets.fill('5');
  await r.getByRole('button', { name: '8: Workout B', exact: true }).click();
  const dialog = page.getByRole('alertdialog'); await expect(dialog).toContainText('Mentetlen módosítások');
  await dialog.getByRole('button', { name: 'Maradok', exact: true }).click();
  await expect(dialog).toHaveCount(0);
  await expect(r.getByRole('button', { name: '1: Workout A', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(sets).toHaveValue('5');
  await r.getByRole('button', { name: '8: Workout B', exact: true }).click();
  await dialog.getByRole('button', { name: 'Elvetés és tovább', exact: true }).click();
  await expect(r.getByRole('button', { name: '8: Workout B', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await r.getByRole('button', { name: '1: Workout A', exact: true }).click();
  await expect(selected(page).getByLabel('Sorozat', { exact: true }).first()).toHaveValue('3');
  expect(api.writes()).toEqual([]);
});

test('editor more: an unsaved new-workout draft on an empty day also asks before leaving', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); const r = editor(page);
  await r.getByRole('button', { name: '2', exact: true }).click();
  await selected(page).locator('[name=workoutName]').fill('Draft');
  await r.getByRole('button', { name: '1: Workout A', exact: true }).click();
  await expect(page.getByRole('alertdialog')).toContainText('Mentetlen módosítások');
  await page.getByRole('alertdialog').getByRole('button', { name: 'Maradok', exact: true }).click();
  await expect(selected(page).locator('[name=workoutName]')).toHaveValue('Draft');
  expect(api.writes()).toEqual([]);
});
