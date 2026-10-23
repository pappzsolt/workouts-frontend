import { test, expect, TODAY } from './workspace-fixture';
const editor = (page: any) => page.locator('app-coach-program-editor');
const selected = (page: any) => editor(page).getByRole('region', { name: 'Kiválasztott nap', exact: true });

test('editor: creates program through form then opens saved editor', async ({ page, api }) => {
  await page.goto('/coach/programs/new'); const root = editor(page);
  await root.locator('[name=programName]').fill('New plan');
  await root.locator('[name=programDescription]').fill('Plan description');
  await root.locator('[name=durationDays]').fill('14');
  await root.getByRole('radio', { name: 'Profi', exact: true }).check();
  await root.getByRole('button', { name: 'Létrehozás', exact: true }).click();
  await expect(page).toHaveURL(/\/coach\/programs\/200$/);
  await expect(root.locator('[name=programName]')).toHaveValue('New plan');
  expect(api.writes('/api/user-programs')[0].body).toMatchObject({ programName: 'New plan', durationDays: 14, difficultyLevel: 'ADVANCED', languageCode: 'hu', workouts: [] });
  await expect(root.getByRole('region', { name: 'Napok', exact: true }).locator('button[aria-pressed]')).toHaveCount(14);
});
for (const [field, value] of [['programName', '   '], ['durationDays', '0'], ['durationDays', '366'], ['durationDays', '1.5'], ['startDate', '']] as const) {
  test(`editor: invalid ${field}=${value} cannot create`, async ({ page, api }) => {
    await page.goto('/coach/programs/new'); const root = editor(page);
    await root.locator('[name=programName]').fill('Valid name'); await root.locator(`[name=${field}]`).fill(value);
    if (value === '1.5') { await expect(root.locator(`[name=${field}]`)).toHaveValue('28'); await expect(root.locator(`[name=${field}]`)).toHaveAttribute('aria-invalid', 'true'); expect(api.writes()).toEqual([]); return; }
    await root.getByRole('button', { name: 'Létrehozás', exact: true }).click();
    await expect(page).toHaveURL(/\/coach\/programs\/new$/); expect(api.writes()).toEqual([]);
  });
}
test('editor: existing metadata saves, reloads and error preserves fields', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); const root = editor(page);
  await expect(root.locator('[name=programName]')).toHaveValue('Program 01');
  await root.locator('[name=programName]').fill('Renamed plan');
  await root.getByRole('button', { name: 'Mentés', exact: true }).click();
  await expect(root.locator('app-message[role=status]')).toContainText('A program mentve.');
  await page.reload(); await expect(root.locator('[name=programName]')).toHaveValue('Renamed plan');
  api.fail('PUT', '/api/programs/1');
  await root.locator('[name=programName]').fill('Retry name'); await root.getByRole('button', { name: 'Mentés', exact: true }).click();
  await expect(root.locator('app-message[role=status]')).toContainText('Contract failure');
  await expect(root.locator('[name=programName]')).toHaveValue('Retry name');
});
test('editor: day selection and library links use occurrence date', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); const root = editor(page);
  await expect(root.getByRole('button', { name: '1: Workout A', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(selected(page).locator('a[href="/coach/clients/7?program=1&date=2030-04-15"]')).toBeVisible();
  await root.getByRole('button', { name: '8: Workout B', exact: true }).click();
  await expect(selected(page).getByRole('heading', { name: 'Workout B', exact: true })).toBeVisible();
  await expect(selected(page).getByRole('link', { name: 'Megnyitás az Edzéstárban' })).toHaveAttribute('href', '/coach/workouts/20/edit');
});
test('editor: prescriptions save exact values and disable after reload', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); const panel = selected(page);
  const row = panel.locator('div.rounded-xl.border.p-3:has(input[type=number])').first();
  await row.getByLabel('Sorozat', { exact: true }).fill('4');
  await row.getByLabel('Ismétlés', { exact: true }).fill('12');
  await row.getByLabel('Pihenő (mp)', { exact: true }).fill('0');
  await panel.getByRole('button', { name: 'Változások mentése (1)', exact: true }).click();
  await expect(panel.getByRole('button', { name: 'Változások mentése (0)', exact: true })).toBeDisabled();
  expect(api.writes('/api/workout-exercises/prescription')[0].body).toEqual({ sets: 4, repetitions: 12, restSeconds: 0 });
  await expect(row.getByLabel('Sorozat', { exact: true })).toHaveValue('4');
});
for (const [label, value] of [['Sorozat', '0'], ['Sorozat', '21'], ['Ismétlés', '201'], ['Pihenő (mp)', '-1'], ['Pihenő (mp)', '3601']] as const) {
  test(`editor: prescription rejects ${label}=${value}`, async ({ page, api }) => {
    await page.goto('/coach/programs/1'); const panel = selected(page);
    const field = panel.getByRole('spinbutton').nth({ 'Sorozat': 0, 'Ismétlés': 1, 'Pihenő (mp)': 2 }[label]); const original = await field.inputValue();
    await field.fill(value);
    if (value.includes('-')) { await expect(field).toHaveValue(original); await expect(field).toHaveAttribute('aria-invalid', 'true'); expect(api.writes()).toEqual([]); return; }
    await panel.getByRole('button', { name: 'Változások mentése (1)', exact: true }).click();
    await expect(editor(page).locator('app-message[role=status]')).toContainText('Sorozat: 1–20');
    expect(api.writes()).toEqual([]);
  });
}
test('editor: template reorder boundaries, dirty guard and apply', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); const panel = selected(page);
  await expect(panel.getByRole('button', { name: /: Exercise 01$/ }).first()).toBeDisabled();
  const inputs = panel.getByLabel('Sorozat', { exact: true }); await inputs.first().fill('4');
  await panel.getByRole('button', { name: /: Exercise 01$/ }).last().click();
  await expect(editor(page).locator('app-message[role=status]')).toContainText('Előbb mentsd');
  await expect(panel.getByRole('button', { name: 'Alkalmazás a még el nem kezdett ügyfél-edzésekre' })).toBeDisabled();
  expect(api.writes()).toHaveLength(0);
  await inputs.first().fill('3');
  await panel.getByRole('button', { name: /: Exercise 01$/ }).last().click();
  await expect(panel.locator('div.rounded-xl.border.p-3:has(input[type=number])').first()).toContainText('Exercise 02');
  expect(api.writes('/api/workout-exercises/order')[0].query.get('orderIndex')).toBe('1');
  await panel.getByRole('button', { name: 'Alkalmazás a még el nem kezdett ügyfél-edzésekre' }).click();
  await expect(editor(page).locator('app-message[role=status]')).toContainText('Átvezetve: 1 ügyfél-edzés');
});
test('editor: weekly repeat skips occupied day and confirms only once', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); const panel = selected(page);
  await panel.getByRole('button', { name: 'Ismétlés hetente', exact: true }).click();
  await expect(panel).toContainText('15, 22'); await expect(panel).toContainText('1 nap kimarad');
  expect(api.writes()).toEqual([]);
  await panel.getByRole('button', { name: 'Mégse', exact: true }).click(); expect(api.writes()).toEqual([]);
  await panel.getByRole('button', { name: 'Ismétlés hetente', exact: true }).click();
  await panel.getByRole('button', { name: 'Ismétlés hetente', exact: true }).click();
  await expect(editor(page).getByRole('button', { name: '22: Workout A', exact: true })).toBeVisible();
  expect(api.writes('/api/program-workouts').map(c => c.body.dayIndex)).toEqual([15, 22]);
  await expect(panel.getByRole('button', { name: 'Ismétlés hetente', exact: true })).toBeDisabled();
});
test('editor: extra day occupied/range validation then add and move occurrence', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); const panel = selected(page);
  await panel.locator('[name=extraDate]').fill('2030-04-22'); await panel.getByRole('button', { name: 'Hozzáadás', exact: true }).click();
  await expect(editor(page).locator('app-message[role=status]')).toContainText('Azon a napon már van edzés.');
  await panel.locator('[name=extraDate]').fill('2030-05-07'); await panel.getByRole('button', { name: 'Hozzáadás', exact: true }).click();
  await expect(editor(page).locator('app-message[role=status]')).toContainText('időtartamán kívül'); expect(api.writes()).toEqual([]);
  await panel.locator('[name=extraDate]').fill('2030-04-17'); await panel.getByRole('button', { name: 'Hozzáadás', exact: true }).click();
  await expect(editor(page).getByRole('button', { name: '3: Workout A', exact: true })).toBeVisible();
  await panel.locator('[name=moveDate]').fill('2030-04-16'); await panel.getByRole('button', { name: 'Áthelyezés', exact: true }).click();
  await expect(editor(page).getByRole('button', { name: '2: Workout A', exact: true })).toHaveAttribute('aria-pressed', 'true');
  expect(api.writes('/api/program-workouts/100')[0].body.dayIndex).toBe(2);
});
test('editor: remove occurrence cancel then confirm leaves other occurrence', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); const panel = selected(page);
  await panel.getByRole('button', { name: 'Eltávolítás a programból', exact: true }).click();
  await panel.getByRole('button', { name: 'Mégse', exact: true }).click(); expect(api.writes()).toEqual([]);
  await panel.getByRole('button', { name: 'Eltávolítás a programból', exact: true }).click();
  await panel.getByRole('button', { name: 'Eltávolítás a programból', exact: true }).click();
  await expect(editor(page).getByRole('button', { name: '1', exact: true })).toBeVisible();
  await expect(editor(page).getByRole('button', { name: '8: Workout B', exact: true })).toBeVisible();
  expect(api.writes()[0].path).toBe('/api/program-workouts/id/100');
});
for (const mode of ['link', 'copy'] as const) {
  test(`editor: library ${mode} to empty day`, async ({ page, api }) => {
    await page.goto('/coach/programs/1'); const root = editor(page); const panel = selected(page);
    await root.getByRole('button', { name: '2', exact: true }).click();
    await panel.getByRole('tab', { name: 'Edzéstárból' }).click();
    await panel.locator('[name=libraryFilter]').fill('Workout B');
    await expect(panel.getByRole('radio')).toHaveCount(1); await panel.getByRole('radio').check();
    if (mode === 'copy') await panel.locator('[name=copyName]').fill('Independent workout');
    await panel.getByRole('button', { name: mode === 'link' ? 'Hozzáadás erre a napra' : 'Másolás erre a napra', exact: true }).click();
    await expect(root.getByRole('button', { name: `2: ${mode === 'link' ? 'Workout B' : 'Independent workout'}`, exact: true })).toBeVisible();
    if (mode === 'link') expect(api.writes('/api/program-workouts')[0].body).toEqual({ programId: 1, workoutId: 20, dayIndex: 2 });
    else expect(api.writes('/api/workout-copy')[0].body).toMatchObject({ sourceWorkoutId: 20, dayIndex: 2, workoutDate: '2030-04-16' });
  });
}
test('editor: multi-add uses selection order and skips occupied days', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); await editor(page).getByRole('button', { name: 'Több edzés az Edzéstárból' }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog.getByRole('button', { name: 'Hozzáadás (0)' })).toBeDisabled();
  await dialog.getByRole('checkbox', { name: 'Workout B' }).check(); await dialog.getByRole('checkbox', { name: 'Workout A' }).check();
  await expect(dialog).toContainText('Napok: 2, 3');
  await dialog.getByRole('button', { name: 'Hozzáadás (2)' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(editor(page).getByRole('button', { name: '3: Workout A', exact: true })).toBeVisible();
  expect(api.writes('/api/program-workouts').map(c => [c.body.workoutId, c.body.dayIndex])).toEqual([[20, 2], [10, 3]]);
});
test('editor: multi-add rejects insufficient free days and Escape closes', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); await editor(page).getByRole('button', { name: '22', exact: true }).click();
  await editor(page).getByRole('button', { name: 'Több edzés az Edzéstárból' }).click(); const dialog = page.getByRole('dialog');
  await dialog.getByRole('checkbox', { name: 'Workout A' }).check(); await dialog.getByRole('checkbox', { name: 'Workout B' }).check();
  await dialog.getByRole('button', { name: 'Hozzáadás (2)' }).click();
  await expect(editor(page).locator('app-message[role=status]')).toContainText('Nincs elég szabad nap'); expect(api.writes()).toEqual([]);
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0);
});
test('editor: program copy dialog creates new editor and retains source', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); await editor(page).getByRole('button', { name: 'Program másolása', exact: true }).click();
  const dialog = page.getByRole('dialog'); await dialog.locator('[name=copyName]').fill('Copied plan');
  await dialog.getByRole('button', { name: 'Másolás', exact: true }).click();
  await expect(page).toHaveURL(/\/coach\/programs\/200$/);
  await expect(editor(page).locator('[name=programName]')).toHaveValue('Copied plan');
  expect(api.writes('/api/coach/programs/1/copy')[0].body).toEqual({ name: 'Copied plan', startDate: TODAY, userId: null });
  expect(api.state.programs.find(p => p.programId === 1)?.programName).toBe('Program 01');
});
test('editor: assignment checkbox posts only selected client and reloads selection', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); const root = editor(page);
  await root.getByRole('checkbox', { name: 'Bob', exact: true }).check();
  await root.getByRole('button', { name: 'Kiosztás (1)', exact: true }).click();
  await expect(root.getByRole('checkbox', { name: 'Bob', exact: true })).toHaveCount(0);
  expect(api.writes('/api/programs/assign')[0].body).toEqual({ userId: 8, programId: 1 });
});
test('editor: assignment search filters by name/email, select shown and clear', async ({ page, api }) => {
  api.state.clients.push({ userId: 9, username: 'Carol', email: 'carol@example.test', programs: [], workouts: [], lastCompletedAt: null } as any);
  await page.goto('/coach/programs/1'); const root = editor(page);
  await root.locator('[name=clientFilter]').fill('CAROL@');
  await expect(root.getByRole('checkbox', { name: 'Bob', exact: true })).toHaveCount(0);
  await root.getByRole('button', { name: 'Látható mind kijelölése', exact: true }).click();
  await expect(root.getByRole('checkbox', { name: 'Carol', exact: true })).toBeChecked();
  await root.locator('[name=clientFilter]').fill('nincs ilyen');
  await expect(root).toContainText('Nincs a keresésnek megfelelő ügyfél.');
  await root.locator('[name=clientFilter]').fill('');
  await expect(root.getByRole('button', { name: 'Kiosztás (1)', exact: true })).toBeEnabled();
  await root.getByRole('button', { name: 'Kijelölés törlése', exact: true }).click();
  await expect(root.getByRole('button', { name: 'Kiosztás (0)', exact: true })).toBeDisabled();
  await root.getByRole('checkbox', { name: 'Carol', exact: true }).check();
  await root.getByRole('button', { name: 'Kiosztás (1)', exact: true }).click();
  await expect(root.getByRole('checkbox', { name: 'Carol', exact: true })).toHaveCount(0);
  await expect(root.getByRole('link', { name: 'Carol', exact: true })).toBeVisible();
  expect(api.writes('/api/programs/assign').map(c => c.body)).toEqual([{ userId: 9, programId: 1 }]);
});
test('editor: new program for client assigns after creating', async ({ page, api }) => {
  await page.goto('/coach/programs/new?userId=8'); const root = editor(page);
  await expect(root).toContainText('Bob számára készül'); await root.locator('[name=programName]').fill('For Bob');
  await root.getByRole('button', { name: 'Létrehozás', exact: true }).click();
  await expect(page).toHaveURL(/\/coach\/programs\/200$/);
  expect(api.writes().map(c => c.path)).toEqual(['/api/user-programs', '/api/programs/assign']);
  expect(api.writes()[1].body).toEqual({ userId: 8, programId: 200 });
});

test('editor: copy dialog cancel, invalid name and backend failure keep dialog open', async ({ page, api }) => {
  await page.goto('/coach/programs/1'); const r = editor(page);
  await r.getByRole('button', { name: 'Program másolása', exact: true }).click(); const d = page.getByRole('dialog');
  await d.locator('[name=copyName]').fill(''); await expect(d.getByRole('button', { name: 'Másolás', exact: true })).toBeDisabled();
  await d.getByRole('button', { name: 'Mégse', exact: true }).click(); expect(api.writes()).toEqual([]);
  api.fail('POST', '/api/coach/programs/1/copy');
  await r.getByRole('button', { name: 'Program másolása', exact: true }).click();
  await d.locator('[name=copyUser]').selectOption({ label: 'Bob' });
  await d.getByRole('button', { name: 'Másolás', exact: true }).click();
  await expect(r.locator('app-message[role=status]')).toContainText('Contract failure'); await expect(d).toBeVisible();
  expect(api.writes()[0].body.userId).toBe(8);
});
test('editor: failed assignment is visible and selected client can retry', async ({ page, api }) => {
  api.fail('POST', '/api/programs/assign'); await page.goto('/coach/programs/1'); const r = editor(page);
  await r.getByRole('checkbox', { name: 'Bob', exact: true }).check();
  await r.getByRole('button', { name: 'Kiosztás (1)', exact: true }).click();
  await expect(r.locator('app-message[role=status]')).toContainText('Contract failure');
  await expect(r.getByRole('checkbox', { name: 'Bob', exact: true })).toBeVisible();
});
test('editor: metadata double submit makes one creation request', async ({ page, api }) => {
  api.delay = 300; await page.goto('/coach/programs/new'); const r = editor(page);
  await r.locator('[name=programName]').fill('Single creation');
  await r.getByRole('button', { name: 'Létrehozás', exact: true }).dblclick();
  await expect(page).toHaveURL(/\/coach\/programs\/200$/); expect(api.writes('/api/user-programs')).toHaveLength(1);
});
test('editor: template apply failure is visible and can retry', async ({ page, api }) => {
  api.fail('POST', '/api/coach/workouts/10/apply-template'); await page.goto('/coach/programs/1');
  const b = selected(page).getByRole('button', { name: 'Alkalmazás a még el nem kezdett ügyfél-edzésekre' });
  await b.click(); await expect(editor(page).locator('app-message[role=status]')).toContainText('Contract failure'); await expect(b).toBeEnabled();
});
test('editor: invalid program id returns to catalogue', async ({ page, api }) => {
  await page.goto('/coach/programs/invalid'); await expect(page).toHaveURL(/\/coach\/programs$/);
});
