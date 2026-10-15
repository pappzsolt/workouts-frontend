import { test, expect } from './workspace-fixture';
test('picker: pagination, search/filter reset, details and duplicate selection', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); const editor = page.locator('app-coach-program-editor');
  await editor.getByRole('button', { name: '2', exact: true }).click(); const picker = page.locator('app-exercise-picker');
  await expect(picker.locator('li')).toHaveCount(10);
  await picker.getByRole('button', { name: 'Következő oldal' }).click(); await expect(picker.locator('li')).toHaveCount(5);
  await picker.locator('[name=pickerBodyPart]').selectOption('back'); await expect(picker.locator('li')).toHaveCount(8);
  expect(api.calls.filter(c => c.path === '/api/exercises/search').at(-1)?.query.get('page')).toBe('0');
  await picker.locator('[name=pickerEquipment]').selectOption('cable');
  await picker.locator('[name=pickerSearch]').fill('Exercise 01'); await expect(picker.locator('li')).toHaveCount(1);
  await picker.locator('button[aria-expanded]').click(); await expect(picker).toContainText('Description 1');
  await picker.getByRole('button', { name: 'Hozzáadás: Exercise 01', exact: true }).click();
  await expect(picker.getByRole('button', { name: 'Hozzáadás: Exercise 01', exact: true })).toBeDisabled();
  await expect(editor).toContainText('Kiválasztott gyakorlatok (1)');
  await editor.getByRole('button', { name: 'Törlés: Exercise 01', exact: true }).click();
  await expect(picker.getByRole('button', { name: 'Hozzáadás: Exercise 01', exact: true })).toBeEnabled();
  await picker.getByRole('button', { name: 'Szűrők törlése' }).click();
  await expect(picker.locator('[name=pickerSearch]')).toHaveValue(''); await expect(picker.locator('li')).toHaveCount(10);
  expect(api.writes()).toEqual([]);
});
test('picker: create workout and assigns exercises before linking occurrence', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); const editor = page.locator('app-coach-program-editor');
  await editor.getByRole('button', { name: '2', exact: true }).click();
  const create = editor.getByRole('button', { name: 'Edzés létrehozása erre a napra' }); await expect(create).toBeDisabled();
  await editor.locator('[name=workoutName]').fill('New workout');
  await page.locator('app-exercise-picker').getByRole('button', { name: 'Hozzáadás: Exercise 01', exact: true }).click();
  await create.click(); await expect(editor.getByRole('button', { name: '2: New workout', exact: true })).toBeVisible();
  expect(api.writes().map(c => c.path)).toEqual(['/api/workouts', '/api/workout-exercises', '/api/program-workouts']);
  expect(api.writes()[0].body).toEqual({ name: 'New workout', workoutDate: '2030-04-16' });
  expect(api.writes()[1].query.get('exerciseId')).toBe('1');
});
test('picker: empty search and API failure show usable states', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); await page.locator('app-coach-program-editor').getByRole('button', { name: '2', exact: true }).click();
  const picker = page.locator('app-exercise-picker'); await picker.locator('[name=pickerSearch]').fill('missing');
  await expect(picker).toContainText('Nincs találat.');
  api.fail('GET', '/api/exercises/search'); await picker.locator('[name=pickerSearch]').fill('Exercise');
  await expect(picker).toContainText('Az adatok betöltése nem sikerült.');
});
