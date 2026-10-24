import { type Page } from '@playwright/test';
import { test, expect, type Plan } from '../../helpers/p1-fixture';
import { closeDb, db, login, success } from '../../helpers/e2e-next-3-helpers';
import { API_ENDPOINTS as E } from '../../helpers/api-endpoints';
import { snapshotProgram } from '../../helpers/audit-fixture';
import { setTestLanguage } from '../../helpers/read-only';

test.describe.configure({ timeout: 120_000 });
test.afterAll(closeDb);
const root = (page: Page) => page.locator('app-coach-client-detail');
const field = (page: Page, n: number, label: string) => root(page).getByLabel(new RegExp(`${n}\\. ${label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)).first();
const save = (page: Page, count: number) => root(page).getByRole('button', { name: `Mentés (${count})`, exact: true });
const setPath = (id: number) => E.userWorkoutExerciseSets.byId(id);
async function open(page: Page, p: Plan) {
  await setTestLanguage(page); await login(page, 'coach');
  await page.goto(`/coach/clients/${p.account.id}?program=${p.programId}&workout=${p.workouts[0].id}`);
  await expect(field(page, 1, 'Cél súly (kg)')).toBeVisible();
}
async function submit(page: Page, count: number, id: number, status = 200) {
  const pending = page.waitForResponse(r => r.request().method() === 'PUT' && new URL(r.url()).pathname === setPath(id));
  await save(page, count).click();
  const response = await pending;
  expect(response.status()).toBe(status);
  const body = await response.json(); expect(body.success).toBe(status === 200);
  if (status === 409) await expect(root(page).locator('app-message[role=status]')).toContainText(body.message);
  return response;
}
const firstSets = (p: Plan) => p.sets.filter(s => s.user_workout_id === p.workouts[0].id);

test('SAVE RETRY: real offline failure preserves edits and DB; reconnect saves once and survives reload', async ({ page, plan: p }) => {
  await open(page, p);
  const id = firstSets(p)[0].id;
  const before = await snapshotProgram(p.programId);
  const attempts: unknown[] = [];
  page.on('request', r => { if (r.method() === 'PUT' && new URL(r.url()).pathname === setPath(id)) attempts.push(r.postDataJSON()); });
  await field(page, 1, 'Cél súly (kg)').fill('37.5');
  await field(page, 1, 'Megjegyzés').fill('Offline állapotban megőrzendő szerkesztés');
  try {
    await page.context().setOffline(true);
    const failed = page.waitForEvent('requestfailed', { predicate: r => r.method() === 'PUT' && new URL(r.url()).pathname === setPath(id) });
    await save(page, 1).click(); await failed;
    await expect(save(page, 1)).toBeEnabled();
    await expect(root(page).locator('app-message[role=status]')).toBeVisible();
    await expect(field(page, 1, 'Cél súly (kg)')).toHaveValue('37.5');
    await expect(field(page, 1, 'Megjegyzés')).toHaveValue('Offline állapotban megőrzendő szerkesztés');
    expect(await snapshotProgram(p.programId)).toEqual(before);
  } finally { await page.context().setOffline(false); }
  await submit(page, 1, id);
  await expect(save(page, 0)).toBeDisabled();
  expect(attempts).toHaveLength(2); expect(attempts[1]).toEqual(attempts[0]);
  const stored = await p.owner.get(E.userWorkoutExerciseSets.byExercise(firstSets(p)[0].user_workout_exercise_id));
  const body = await stored.json(); expect(stored.status()).toBe(200);
  expect(body.data.find((s: any) => s.id === id)).toMatchObject({ targetWeightKg: 37.5, notes: 'Offline állapotban megőrzendő szerkesztés' });
  const rows = (await db().query('SELECT * FROM user_workout_exercise_sets WHERE id=ANY($1::int[]) ORDER BY id', [p.sets.filter(s => s.id !== id).map(s => s.id)])).rows;
  expect(rows).toEqual(p.sets.filter(s => s.id !== id).map(({ user_workout_id, ...s }) => s).sort((a,b) => a.id-b.id));
  await page.reload();
  await expect(field(page, 1, 'Cél súly (kg)')).toHaveValue('37.5');
  await expect(field(page, 1, 'Megjegyzés')).toHaveValue('Offline állapotban megőrzendő szerkesztés');
  await expect(save(page, 0)).toBeDisabled();
});

test('CONCURRENT EDIT: stale browser gets 409, keeps its draft and cannot overwrite the saved values', async ({ page, browser, plan: p }) => {
  const context = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4200' });
  const other = await context.newPage();
  try {
    await open(page, p); await open(other, p);
    const id = firstSets(p)[0].id;
    await field(other, 1, 'Cél súly (kg)').fill('42.5');
    await field(other, 1, 'Pihenő (mp)').fill('0');
    await field(other, 1, 'Megjegyzés').fill('A második ablak mentetlen jegyzete');
    await field(page, 1, 'Cél súly (kg)').fill('37.5');
    await submit(page, 1, id); await expect(save(page, 0)).toBeDisabled();
    const saved = await snapshotProgram(p.programId);
    await submit(other, 1, id, 409);
    await expect(field(other, 1, 'Cél súly (kg)')).toHaveValue('42.5');
    await expect(field(other, 1, 'Megjegyzés')).toHaveValue('A második ablak mentetlen jegyzete');
    await expect(save(other, 1)).toBeEnabled();
    expect(await snapshotProgram(p.programId)).toEqual(saved);
    // Explicitly reload before deciding to apply a new change to the current server values.
    await other.reload();
    await expect(field(other, 1, 'Cél súly (kg)')).toHaveValue('37.5');
    await expect(field(other, 1, 'Megjegyzés')).toHaveValue('');
    await field(other, 1, 'Megjegyzés').fill('A frissebb súly mellett tudatosan mentett jegyzet');
    await submit(other, 1, id); await expect(save(other, 0)).toBeDisabled();
    await page.reload();
    await expect(field(page, 1, 'Cél súly (kg)')).toHaveValue('37.5');
    await expect(field(page, 1, 'Megjegyzés')).toHaveValue('A frissebb súly mellett tudatosan mentett jegyzet');
  } finally { await context.close(); }
});

test('CONCURRENT EDIT: different rows can be saved from separate browsers without false conflicts', async ({ page, browser, plan: p }) => {
  const context = await browser.newContext({ baseURL: process.env.E2E_BASE_URL ?? 'http://localhost:4200' });
  const other = await context.newPage();
  try {
    await open(page, p); await open(other, p);
    const sets = firstSets(p);
    await field(page, 1, 'Cél súly (kg)').fill('31.5');
    await field(other, 2, 'Cél súly (kg)').fill('46.5');
    await submit(page, 1, sets[0].id); await submit(other, 1, sets[1].id);
    for (const view of [page, other]) {
      await view.reload();
      await expect(field(view, 1, 'Cél súly (kg)')).toHaveValue('31.5');
      await expect(field(view, 2, 'Cél súly (kg)')).toHaveValue('46.5');
    }
  } finally { await context.close(); }
});

test('PARTIAL SAVE: confirmed rows become clean when a later row conflicts; unsaved rows stay editable', async ({ page, plan: p }) => {
  await open(page, p);
  const sets = firstSets(p);
  await field(page, 1, 'Megjegyzés').fill('Az első sor sikeresen mentve');
  await field(page, 1, 'Tény. ism.').fill('8');
  await field(page, 1, 'Tény. súly (kg)').fill('20');
  await root(page).locator('article').first().getByRole('checkbox').first().check();
  await field(page, 2, 'Cél súly (kg)').fill('49.5');
  await success(await p.owner.put(setPath(sets[1].id), { data: { notes: 'Időközben a felhasználó mentette' } }), 'Another editor changes the second row');
  const secondBefore = (await db().query('SELECT * FROM user_workout_exercise_sets WHERE id=$1', [sets[1].id])).rows[0];
  const writes: number[] = [];
  page.on('request', r => { if (r.method() === 'PUT' && /^\/api\/user-workout-exercise-sets\/\d+$/.test(new URL(r.url()).pathname)) writes.push(Number(new URL(r.url()).pathname.split('/').pop())); });
  const first = page.waitForResponse(r => r.request().method() === 'PUT' && new URL(r.url()).pathname === setPath(sets[0].id));
  await submit(page, 2, sets[1].id, 409);
  expect((await first).status()).toBe(200);
  await expect(save(page, 1)).toBeEnabled();
  await expect(field(page, 2, 'Cél súly (kg)')).toHaveValue('49.5');
  expect((await db().query('SELECT notes FROM user_workout_exercise_sets WHERE id=$1', [sets[0].id])).rows[0].notes).toBe('Az első sor sikeresen mentve');
  const progress = (await db().query('SELECT sets_done FROM user_workout_exercises WHERE id=$1', [sets[0].user_workout_exercise_id])).rows[0];
  expect(progress.sets_done).toBe(1);
  await expect(root(page).locator('nav button[aria-current=true]')).toContainText('1/3 sorozat');
  expect((await db().query('SELECT * FROM user_workout_exercise_sets WHERE id=$1', [sets[1].id])).rows[0]).toEqual(secondBefore);
  // Retrying a still-stale row must not resend the already committed first row.
  await submit(page, 1, sets[1].id, 409);
  expect(writes).toEqual([sets[0].id, sets[1].id, sets[1].id]);
});

test('CONCURRENT API: two simultaneous updates with the same baseline have exactly one winner', async ({ plan: p }) => {
  const set = firstSets(p)[0];
  const expected = { targetRpe: set.target_rpe, targetRepetitions: set.target_repetitions, targetWeightKg: set.target_weight_kg,
    actualRepetitions: set.actual_repetitions, actualWeightKg: set.actual_weight_kg, completed: set.completed, restSeconds: set.rest_seconds, notes: set.notes };
  const updates = [{ targetWeightKg: 31.5, notes: 'Első párhuzamos kérés' }, { targetWeightKg: 46.5, notes: 'Második párhuzamos kérés' }];
  const responses = await Promise.all(updates.map(data => p.owner.put(setPath(set.id), { data: { ...data, expected } })));
  expect(responses.map(r => r.status()).sort()).toEqual([200, 409]);
  const winner = responses.findIndex(r => r.status() === 200);
  expect((await responses[1-winner].json()).success).toBe(false);
  const saved = (await db().query('SELECT target_weight_kg,notes FROM user_workout_exercise_sets WHERE id=$1', [set.id])).rows[0];
  expect(Number(saved.target_weight_kg)).toBe(updates[winner].targetWeightKg);
  expect(saved.notes).toBe(updates[winner].notes);
});
