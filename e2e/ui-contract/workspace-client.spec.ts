import { test, expect } from './workspace-fixture';
const root = (p: any) => p.locator('app-coach-client-detail');
const labels: Record<string, string> = { tr: 'Cél ism.', tw: 'Cél súly (kg)', rs: 'Pihenő (mp)', ar: 'Tény. ism.', aw: 'Tény. súly (kg)', dn: 'Kész', nt: 'Megjegyzés' };
const input = (p: any, name: string, row = 1) => root(p).locator('article').first().getByLabel(new RegExp(` ${row}\\. ${labels[name].replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`));
const save = (p: any) => root(p).getByRole('button', { name: /^Mentés \(\d+\)$/ });

test('client: deep link selects workout, feedback, next/previous and program tab', async ({ page, api }) => {
  await page.goto('/coach/clients/7?program=1&workout=70'); const r = root(page);
  await expect(r.getByRole('heading', { name: 'Alice', exact: true })).toBeVisible();
  await expect(input(page, 'tr')).toHaveValue('8'); await expect(r).toContainText('Workout feedback'); await expect(r).toContainText('Exercise feedback');
  await expect(r.getByRole('button', { name: 'Előző edzés', exact: true })).toBeDisabled();
  await r.getByRole('button', { name: 'Következő edzés', exact: true }).click();
  await expect(input(page, 'tr')).toHaveAttribute('aria-label', /Exercise 02/);
  await expect(r.getByRole('button', { name: 'Következő edzés', exact: true })).toBeDisabled();
  await r.getByRole('tab', { name: /^Programok/ }).click();
  await expect(r.getByRole('progressbar', { name: 'Program 01' })).toHaveAttribute('aria-valuenow', '50');
  await r.getByRole('button', { name: 'Edzésterv', exact: true }).click(); await expect(input(page, 'tr')).toBeVisible();
  expect(api.writes()).toEqual([]);
});
test('client: edits every field, sends exact values and reload persists', async ({ page, api }) => {
  await page.goto('/coach/clients/7?program=1&workout=70');
  for (const [field, value] of [['tr','10'],['tw','42.5'],['rs','0'],['ar','9'],['aw','40'],['nt','  Test note  ']]) await input(page, field).fill(value);
  await input(page, 'dn').check(); await save(page).click();
  await expect(save(page)).toBeDisabled();
  expect(api.writes('/api/user-workout-exercise-sets/7000')[0].body).toEqual({
    targetRepetitions: 10, targetWeightKg: 42.5, clearTargetWeightKg: false,
    actualRepetitions: 9, clearActualRepetitions: false, actualWeightKg: 40, clearActualWeightKg: false,
    restSeconds: 0, clearRestSeconds: false, notes: 'Test note', clearNotes: false, completed: true,
  });
  await page.reload(); await expect(input(page, 'tw')).toHaveValue('42.5'); await expect(input(page, 'dn')).toBeChecked();
});
test('client: clearing optional fields emits all clear flags', async ({ page, api }) => {
  await page.goto('/coach/clients/7?workout=70');
  for (const field of ['tw','rs','ar','aw','nt']) await input(page, field).clear();
  await save(page).click(); await expect(save(page)).toBeDisabled();
  expect(api.writes('/api/user-workout-exercise-sets/7000')[0].body).toMatchObject({
    targetWeightKg: null, clearTargetWeightKg: true, restSeconds: null, clearRestSeconds: true,
    actualRepetitions: null, clearActualRepetitions: true, actualWeightKg: null, clearActualWeightKg: true, notes: null, clearNotes: true,
  });
});
for (const [field, value] of [['tr', '0'], ['tr', '1.5'], ['tr', ''], ['tw', '-1'], ['rs', '-1'], ['rs', '0.5'], ['ar', '0'], ['aw', '-1']] as const) {
  test(`client: invalid ${field}=${value} prevents write`, async ({ page, api }) => {
    await page.goto('/coach/clients/7?workout=70');
    const original = await input(page, field).inputValue();
    await input(page, field).fill(value);
    if (value.includes('-') || value.includes('.')) {
      await expect(input(page, field)).toHaveValue(original);
      await expect(input(page, field)).toHaveAttribute('aria-invalid', 'true');
      await expect(save(page)).toBeDisabled(); expect(api.writes()).toEqual([]); return;
    }
    await save(page).click();
    await expect(root(page).locator('app-message[role=status]')).toContainText('Ellenőrizd a piros sorokat'); expect(api.writes()).toEqual([]);
  });
}
test('client: fill-down skips completed rows; discard restores originals', async ({ page, api }) => {
  await page.goto('/coach/clients/7?workout=70'); await input(page, 'tw').fill('50');
  await root(page).getByRole('button', { name: 'Első sorozat értékei mindre' }).click();
  await expect(input(page, 'tw', 2)).toHaveValue('50');
  await expect(input(page, 'tw', 3)).toHaveValue('20');
  await root(page).getByRole('button', { name: 'Elvetés', exact: true }).click();
  await expect(input(page, 'tw')).toHaveValue('20'); await expect(save(page)).toBeDisabled(); expect(api.writes()).toEqual([]);
});
for (const choice of ['Maradok', 'Elvetés és tovább', 'Mentés és tovább']) {
  test(`client: unsaved tab navigation ${choice}`, async ({ page, api }) => {
    await page.goto('/coach/clients/7?workout=70'); await input(page, 'tw').fill('55');
    await root(page).getByRole('tab', { name: /^Programok/ }).click();
    const dialog = root(page).getByRole('alertdialog'); await expect(dialog).toBeVisible();
    await dialog.getByRole('button', { name: choice, exact: true }).click(); await expect(dialog).toHaveCount(0);
    await expect(root(page).getByRole('tab', { name: /^Programok/ })).toHaveAttribute('aria-selected', choice === 'Maradok' ? 'false' : 'true');
    expect(api.writes()).toHaveLength(choice === 'Mentés és tovább' ? 1 : 0);
    if (choice === 'Maradok') await expect(input(page, 'tw')).toHaveValue('55');
  });
}
test('client: unsaved next-workout navigation can discard', async ({ page, api }) => {
  await page.goto('/coach/clients/7?workout=70'); await input(page, 'tr').fill('11');
  await root(page).getByRole('button', { name: 'Következő edzés', exact: true }).click();
  await root(page).getByRole('alertdialog').getByRole('button', { name: 'Elvetés és tovább' }).click();
  await expect(input(page, 'tr')).toHaveAttribute('aria-label', /Exercise 02/); expect(api.writes()).toEqual([]);
});
test('client: add set copies targets but clears actuals, completion and notes', async ({ page, api }) => {
  await page.goto('/coach/clients/7?workout=70');
  await expect(root(page).locator('tbody input[type=checkbox]')).toHaveCount(3);
  await root(page).getByRole('button', { name: 'Sorozat hozzáadása', exact: true }).click();
  await expect(root(page).locator('tbody input[type=checkbox]')).toHaveCount(4);
  expect(api.writes().map(c => c.method)).toEqual(['POST', 'PUT']);
  expect(api.writes()[1].body).toMatchObject({ targetRepetitions: 8, targetWeightKg: 20, actualRepetitions: null, actualWeightKg: null, completed: false, notes: null });
});
test('client: delete set cancel then confirm only selected set', async ({ page, api }) => {
  await page.goto('/coach/clients/7?workout=70'); const r = root(page);
  const remove = () => r.getByRole('button', { name: 'Sorozat törlése: Exercise 01 1.', exact: true });
  await remove().click(); await r.getByRole('button', { name: 'Mégse', exact: true }).click(); expect(api.writes()).toEqual([]);
  await remove().click(); await r.getByRole('button', { name: 'Törlés', exact: true }).click();
  await expect(r.locator('tbody input[type=checkbox]')).toHaveCount(2);
  expect(api.writes()[0]).toMatchObject({ method: 'DELETE', path: '/api/user-workout-exercise-sets/7000' });
});
test('client: reschedule sends user-workout id and ISO date', async ({ page, api }) => {
  await page.goto('/coach/clients/7?workout=70'); const r = root(page);
  await expect(r.getByRole('button', { name: 'Dátum mentése' })).toBeDisabled();
  await r.locator('[name=rescheduleDate]').fill('2030-04-17'); await r.getByRole('button', { name: 'Dátum mentése' }).click();
  await expect(r.locator('app-message[role=status]')).toContainText('Az edzés áthelyezve.');
  expect(api.writes()[0].body).toEqual({ userWorkoutId: 70, scheduledAt: '2030-04-17' });
});
test('client: assignment dialog excludes existing programs, cancel/Escape and confirm', async ({ page, api }) => {
  await page.goto('/coach/clients/7?tab=programs'); const r = root(page);
  await r.getByRole('button', { name: 'Program kiosztása', exact: true }).click(); let dialog = page.getByRole('dialog');
  await expect(dialog.getByRole('radio', { name: /^Program 01 / })).toHaveCount(0);
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); expect(api.writes()).toEqual([]);
  await r.getByRole('button', { name: 'Program kiosztása', exact: true }).click();
  await dialog.getByRole('radio', { name: /^Program 03 / }).check();
  await dialog.getByRole('button', { name: 'Kiosztás', exact: true }).click(); await expect(dialog).toHaveCount(0);
  expect(api.writes('/api/programs/assign')[0].body).toEqual({ userId: 7, programId: 3 });
  await expect(r.locator('[name=clientProgram]')).toContainText('Program 03');
});
test('client: revoke cancel then confirm with counts and selected client', async ({ page, api }) => {
  await page.goto('/coach/clients/7?tab=programs'); const r = root(page);
  await r.getByRole('button', { name: 'Visszavonás', exact: true }).click(); await expect(r).toContainText('2 edzését');
  await r.getByRole('button', { name: 'Mégse', exact: true }).click(); expect(api.writes()).toEqual([]);
  await r.getByRole('button', { name: 'Visszavonás', exact: true }).click(); await r.getByRole('button', { name: 'Visszavonás', exact: true }).click();
  await expect(r.getByRole('progressbar', { name: 'Program 01' })).toHaveCount(0);
  expect(api.writes()[0]).toMatchObject({ method: 'DELETE', path: '/api/programs/1/assigned-users/7' });
});
test('client: failed save keeps dirty edits and allows retry', async ({ page, api }) => {
  api.fail('PUT', '/api/user-workout-exercise-sets/7000');
  await page.goto('/coach/clients/7?workout=70'); await input(page, 'tw').fill('65'); await save(page).click();
  await expect(root(page).locator('app-message[role=status]')).toContainText('Contract failure'); await expect(input(page, 'tw')).toHaveValue('65');
  await expect(save(page)).toBeEnabled(); api.failures.clear(); await save(page).click(); await expect(save(page)).toBeDisabled();
});
test('client: missing user, empty plan and invalid URL are handled', async ({ page, api }) => {
  await page.goto('/coach/clients/999'); await expect(root(page).locator('app-empty-state')).toBeVisible();
  await page.goto('/coach/clients/8'); await expect(root(page)).toContainText('Ennek az ügyfélnek még nincs programja.');
  await expect(root(page).getByRole('link', { name: 'Új program neki' })).toHaveAttribute('href', '/coach/programs/new?userId=8');
  await page.goto('/coach/clients/invalid'); await expect(page).toHaveURL(/\/coach\/clients$/);
});

test('client: unsaved program switch supports staying and discard', async ({ page, api }) => {
  api.state.clients[0].programs.push({ ...api.state.clients[0].programs[0], programId: 3, name: 'Other program' });
  await page.goto('/coach/clients/7?workout=70&program=1'); await input(page, 'tr').fill('12');
  await root(page).locator('[name=clientProgram]').selectOption({ label: 'Other program · 2030.04.15 – 2030.05.06 · Aktív' });
  const dialog = root(page).getByRole('alertdialog'); await dialog.getByRole('button', { name: 'Maradok' }).click();
  await expect(input(page, 'tr')).toHaveValue('12');
  await root(page).locator('[name=clientProgram]').selectOption({ label: 'Program 01 · 2030.04.15 – 2030.05.06 · Aktív' });
  await root(page).locator('[name=clientProgram]').selectOption({ label: 'Other program · 2030.04.15 – 2030.05.06 · Aktív' });
  await dialog.getByRole('button', { name: 'Elvetés és tovább' }).click();
  await expect(root(page)).toContainText('Ebben a programban még nincs edzés az ügyfélnek.'); expect(api.writes()).toEqual([]);
});
for (const action of ['assign', 'revoke', 'add', 'delete', 'reschedule'] as const) {
  test(`client: ${action} backend failure displays feedback and keeps existing data`, async ({ page, api }) => {
    const paths = { assign: ['POST','/api/programs/assign'], revoke: ['DELETE','/api/programs/1/assigned-users/7'], add: ['POST','/api/user-workout-exercise-sets/700/sets'], delete: ['DELETE','/api/user-workout-exercise-sets/7000'], reschedule: ['PATCH','/api/user-workout-exercises/schedule'] };
    api.fail(...paths[action] as [string, string]); await page.goto('/coach/clients/7?workout=70'); const r = root(page);
    if (action === 'assign') { await r.getByRole('button', { name: 'Program kiosztása', exact: true }).click(); await page.getByRole('dialog').getByRole('button', { name: 'Kiosztás', exact: true }).click(); }
    if (action === 'revoke') { await r.getByRole('tab', { name: /^Programok/ }).click(); await r.getByRole('button', { name: 'Visszavonás', exact: true }).click(); await r.getByRole('button', { name: 'Visszavonás', exact: true }).click(); }
    if (action === 'add') await r.getByRole('button', { name: 'Sorozat hozzáadása', exact: true }).click();
    if (action === 'delete') { await r.getByRole('button', { name: 'Sorozat törlése: Exercise 01 1.', exact: true }).click(); await r.getByRole('button', { name: 'Törlés', exact: true }).click(); }
    if (action === 'reschedule') { await r.locator('[name=rescheduleDate]').fill('2030-04-17'); await r.getByRole('button', { name: 'Dátum mentése' }).click(); }
    await expect(r.locator('app-message[role=status]')).toContainText('Contract failure');
    expect(api.state.sets[700]).toHaveLength(3); expect(api.state.clients[0].programs).toHaveLength(1);
  });
}

test('client: decimal comma typing becomes numeric weight', async ({ page, api }) => {
  await page.goto('/coach/clients/7?workout=70'); await input(page, 'tw').clear();
  await input(page, 'tw').pressSequentially('42,5'); await expect(input(page, 'tw')).toHaveValue('42.5');
  await save(page).click(); await expect(save(page)).toBeDisabled();
  expect(api.writes('/api/user-workout-exercise-sets/7000')[0].body.targetWeightKg).toBe(42.5);
});
