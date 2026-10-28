import { test, expect } from './workspace-fixture';

// Client page flows not covered by workspace-client.spec.ts.
const root = (p: any) => p.locator('app-coach-client-detail');
const status = (p: any) => root(p).locator('app-message[role=status]');
const targetReps = (p: any) => root(p).locator('article').first().getByLabel(/ 1\. Cél ism\.$/);

test('client more: Excel export downloads the saved program and warns about unsaved edits', async ({ page, api }) => {
  await page.goto('/coach/clients/7?program=1&workout=70'); const r = root(page);
  const button = r.getByRole('button', { name: 'Excel letöltése', exact: true });
  const first = page.waitForEvent('download'); await button.click();
  expect((await first).suggestedFilename()).toBe('Program-01-Alice.xlsx');
  const call = api.calls.find(c => c.path === '/api/user-workout-exercises/user-programs/7/1/export')!;
  expect(call.query.get('language')).toBe('hu');
  await expect(status(page)).toBeEmpty();
  await targetReps(page).fill('11');
  const second = page.waitForEvent('download'); await button.click(); await second;
  await expect(status(page)).toContainText('Az Excel a mentett adatokat tartalmazza');
  expect(api.writes()).toEqual([]);
});

test('client more: failed Excel export shows the error', async ({ page, api }) => {
  api.fail('GET', '/api/user-workout-exercises/user-programs/7/1/export');
  await page.goto('/coach/clients/7?program=1&workout=70');
  await root(page).getByRole('button', { name: 'Excel letöltése', exact: true }).click();
  await expect(status(page)).toContainText('Contract failure');
  await expect(root(page).getByRole('button', { name: 'Excel letöltése', exact: true })).toBeEnabled();
});

test('client more: a failed program load can be retried', async ({ page, api }) => {
  api.fail('GET', '/api/user-workout-exercises/user-programs/7/1');
  await page.goto('/coach/clients/7?program=1'); const r = root(page);
  const alert = r.getByRole('alert'); await expect(alert).toContainText('Az adatok betöltése nem sikerült.');
  await expect(r.getByRole('button', { name: 'Excel letöltése', exact: true })).toBeDisabled();
  api.failures.clear();
  await alert.getByRole('button', { name: 'Újrapróbálás', exact: true }).click();
  await expect(targetReps(page)).toHaveValue('8');
  await expect(status(page)).toBeEmpty();
});

test('client more: the week list selects a workout and marks it current', async ({ page, api }) => {
  await page.goto('/coach/clients/7?program=1&workout=70'); const r = root(page);
  const list = r.getByRole('navigation', { name: 'A program edzései' });
  await expect(list.getByRole('button', { name: /Workout A/ })).toHaveAttribute('aria-current', 'true');
  await list.getByRole('button', { name: /Workout B/ }).click();
  await expect(list.getByRole('button', { name: /Workout B/ })).toHaveAttribute('aria-current', 'true');
  await expect(targetReps(page)).toHaveAttribute('aria-label', /Exercise 02/);
  await expect(r.getByRole('button', { name: 'Következő edzés', exact: true })).toBeDisabled();
  expect(api.writes()).toEqual([]);
});
