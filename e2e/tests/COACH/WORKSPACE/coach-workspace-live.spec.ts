import { test, expect, openWorkspace, openClient, fixtureSets, db, dbOne, success, closeDb } from '../../helpers/coach-workspace-fixture';
import { API_ENDPOINTS as E } from '../../helpers/api-endpoints';
import { createWorkout, createExercise, assignExercise, suffix } from '../../helpers/e2e-next-3-helpers';
import { snapshotProgram } from '../../helpers/audit-fixture';

test.describe.configure({ timeout: 120000 });
test.afterAll(closeDb);

test('NEW COACH LIVE: program catalogue search opens the actual new editor', async ({ page, workspace: f }) => {
  await page.goto('/coach/programs'); const list = page.locator('app-coach-programs');
  await list.locator('[name=programSearch]').fill(f.name);
  const card = list.locator('article').filter({ has: page.getByRole('heading', { name: f.name, exact: true }) });
  await expect(card).toHaveCount(1);
  await card.getByRole('link', { name: 'Megnyitás', exact: true }).click();
  await expect(page).toHaveURL(new RegExp(`/coach/programs/${f.programId}$`));
  await expect(page.locator('[name=programName]')).toHaveValue(f.name);
});

test('NEW COACH LIVE: prescription changes template; apply propagates to unstarted sets and preserves weights', async ({ page, workspace: f }) => {
  const before = await fixtureSets(f); expect(before.length).toBeGreaterThan(0);
  await success(await f.api.put(E.userWorkoutExerciseSets.byId(before[0].id), { data: { targetWeightKg: 42.5, restSeconds: 45 } }), 'Fixture custom weight and rest override');
  await openWorkspace(page, f);
  const panel = page.getByRole('region', { name: 'Kiválasztott nap', exact: true });
  await panel.getByLabel('Sorozat', { exact: true }).first().fill('4'); await panel.getByLabel('Ismétlés', { exact: true }).first().fill('11'); await panel.getByLabel('Pihenő (mp)', { exact: true }).first().fill('75');
  const saved = page.waitForResponse(r => r.request().method() === 'PUT' && new URL(r.url()).pathname === '/api/workout-exercises/prescription');
  await panel.getByRole('button', { name: 'Változások mentése (1)', exact: true }).click(); await success(await saved, 'GUI prescription');
  await expect(panel.getByRole('button', { name: 'Változások mentése (0)', exact: true })).toBeDisabled();
  expect(await dbOne('SELECT sets,repetitions,rest_seconds FROM workout_exercises WHERE workout_id=$1 AND exercise_id=$2', [f.workoutId, f.exerciseId])).toEqual({ sets: 4, repetitions: 11, rest_seconds: 75 });
  const applied = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === `/api/coach/workouts/${f.workoutId}/apply-template`);
  await panel.getByRole('button', { name: 'Alkalmazás a még el nem kezdett ügyfél-edzésekre' }).click();
  const result = await success(await applied, 'GUI apply template'); expect(result.data.setsAdded).toBeGreaterThan(0);
  const after = await fixtureSets(f); expect(after).toHaveLength(8);
  for (const s of after) {
    expect(s.target_repetitions).toBe(11);
    // NULL removes the personal override; rest is inherited from workout_exercises.
    expect(s.rest_seconds).toBeNull();
  }
  const effectiveRest = (await db().query(`
    SELECT s.id, COALESCE(s.rest_seconds, we.rest_seconds) AS effective_rest_seconds
    FROM user_workout_exercise_sets s
    JOIN user_workout_exercises uwe ON uwe.id=s.user_workout_exercise_id
    JOIN workout_exercises we ON we.id=uwe.workout_exercise_id
    JOIN user_workouts uw ON uw.id=uwe.user_workout_id
    WHERE uw.program_id=$1 AND uw.user_id=$2
    ORDER BY s.id`, [f.programId, f.userId])).rows;
  expect(effectiveRest.map(s => s.id).sort((a, b) => a - b)).toEqual(after.map(s => s.id).sort((a, b) => a - b));
  for (const s of effectiveRest) expect(s.effective_rest_seconds).toBe(75);
  expect(Number(after.find(s => s.id === before[0].id).target_weight_kg)).toBe(42.5);
  await openClient(page, f);
  const inheritedRest = page.locator('app-coach-client-detail').getByRole('spinbutton', { name: /1\. Pihenő \(mp\)$/ }).first();
  await expect(inheritedRest).toHaveValue('');
  await expect(inheritedRest).toHaveAttribute('placeholder', '75');
});

test('NEW COACH LIVE: per-client set values and null clear flags persist in PostgreSQL and reload', async ({ page, workspace: f }) => {
  const before = await fixtureSets(f); await openClient(page, f); const root = page.locator('app-coach-client-detail');
  for (const [label,value] of [['Cél ism.','9'],['Cél súly (kg)','37.5'],['Pihenő (mp)','0'],['Tény. ism.','8'],['Tény. súly (kg)','35'],['Megjegyzés','E2E client note']]) await root.getByLabel(new RegExp('1\\. ' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$')).first().fill(value);
  await root.locator('article').first().getByRole('checkbox').first().check();
  await root.getByRole('button', { name: 'Mentés (1)', exact: true }).click();
  await expect(root.getByRole('button', { name: 'Mentés (0)', exact: true })).toBeDisabled();
  const row = await dbOne('SELECT target_repetitions,target_weight_kg,rest_seconds,actual_repetitions,actual_weight_kg,notes,completed FROM user_workout_exercise_sets WHERE id=$1', [before[0].id]);
  expect(row).toEqual({ target_repetitions: 9, target_weight_kg: '37.50', rest_seconds: 0, actual_repetitions: 8, actual_weight_kg: '35.00', notes: 'E2E client note', completed: true });
  await page.reload(); await expect(root.getByRole('spinbutton', { name: /1\. Cél súly/ }).first()).toHaveValue('37.5');
  for (const label of ['Cél súly (kg)','Pihenő (mp)','Tény. ism.','Tény. súly (kg)','Megjegyzés']) await root.getByLabel(new RegExp('1\\. ' + label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$')).first().clear();
  await root.locator('article').first().getByRole('checkbox').first().uncheck(); await root.getByRole('button', { name: 'Mentés (1)', exact: true }).click();
  await expect(root.getByRole('button', { name: 'Mentés (0)', exact: true })).toBeDisabled();
  const cleared = await dbOne('SELECT target_weight_kg,rest_seconds,actual_repetitions,actual_weight_kg,notes,completed FROM user_workout_exercise_sets WHERE id=$1', [before[0].id]);
  expect(cleared).toEqual({ target_weight_kg: null, rest_seconds: null, actual_repetitions: null, actual_weight_kg: null, notes: null, completed: false });
});

test('NEW COACH LIVE: repeated occurrences move and delete independently', async ({ page, workspace: f }) => {
  await openWorkspace(page, f); const root = page.locator('app-coach-program-editor'); const panel = root.getByRole('region', { name: 'Kiválasztott nap', exact: true });
  // A 3. programnap dátuma: kezdőnap + 2 nap.
  const day3 = (await dbOne('SELECT (start_date + 2)::text AS d FROM programs WHERE id=$1', [f.programId])).d;
  await panel.locator('[name=moveDate]').fill(day3); await panel.getByRole('button', { name: 'Áthelyezés', exact: true }).click();
  await expect(root.getByRole('button', { name: /^3: / })).toHaveAttribute('aria-pressed', 'true');
  expect((await db().query('SELECT day_index FROM program_workouts WHERE program_id=$1 ORDER BY day_index', [f.programId])).rows.map(r => r.day_index)).toEqual([3,8]);
  await panel.getByRole('button', { name: 'Eltávolítás a programból', exact: true }).click();
  await panel.getByRole('button', { name: 'Eltávolítás a programból', exact: true }).click();
  await expect(root.getByRole('button', { name: '3', exact: true })).toBeVisible();
  expect((await db().query('SELECT day_index FROM program_workouts WHERE program_id=$1 ORDER BY day_index', [f.programId])).rows.map(r => r.day_index)).toEqual([8]);
});

test('NEW COACH LIVE: program copy creates independent workout ids and preserves source', async ({ page, workspace: f }) => {
  const before = await snapshotProgram(f.programId); await openWorkspace(page, f);
  await page.getByRole('button', { name: 'Program másolása', exact: true }).click(); const dialog = page.getByRole('dialog');
  await dialog.locator('[name=copyName]').fill(`E2E copy ${suffix()}`); await dialog.locator('[name=copyStart]').fill('2035-05-01');
  const pending = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === `/api/coach/programs/${f.programId}/copy`);
  await dialog.getByRole('button', { name: 'Másolás', exact: true }).click();
  const result = await success(await pending, 'Copy program'); const copyId = Number(result.data); f.extraPrograms.push(copyId);
  const links = (await db().query('SELECT workout_id,day_index FROM program_workouts WHERE program_id=$1 ORDER BY day_index', [copyId])).rows;
  f.extraWorkouts.push(...new Set<number>(links.map(r => r.workout_id)));
  await expect(page).toHaveURL(new RegExp(`/coach/programs/${copyId}$`));
  expect(links.map(r => r.day_index)).toEqual([1,8]);
  for (const l of links) expect(l.workout_id).not.toBe(f.workoutId);
  expect(await snapshotProgram(f.programId)).toEqual(before);
});

test('NEW COACH LIVE: historical delete displays backend conflict and preserves DB', async ({ page, workspace: f }) => {
  const sets = await fixtureSets(f);
  await success(await f.api.put(E.userWorkoutExerciseSets.byId(sets[0].id), { data: { completed: true, actualRepetitions: 8, actualWeightKg: 20 } }), 'Fixture history');
  const before = await snapshotProgram(f.programId); await page.goto('/coach/programs');
  const root = page.locator('app-coach-programs'); await root.locator('[name=programSearch]').fill(f.name); const card = root.locator('article');
  await card.getByRole('button', { name: 'Törlés', exact: true }).click();
  const pending = page.waitForResponse(r => r.request().method() === 'DELETE' && new URL(r.url()).pathname === E.programs.coachDelete(f.programId));
  await card.getByRole('button', { name: 'Törlés', exact: true }).click(); const response = await pending;
  expect(response.status()).toBe(409); const body = await response.json(); expect(body.success).toBe(false);
  await expect(root.locator('app-message[role=status]')).toContainText(body.message); await expect(card).toBeVisible();
  expect(await snapshotProgram(f.programId)).toEqual(before);
});

test('NEW COACH LIVE: add and delete set update only selected user exercise', async ({ page, workspace: f }) => {
  const before = await fixtureSets(f); await openClient(page, f); const root = page.locator('app-coach-client-detail');
  const exerciseId = before[0].user_workout_exercise_id;
  const initial = before.filter(s => s.user_workout_exercise_id === exerciseId).length;
  const added = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === E.userWorkoutExerciseSets.sets(exerciseId));
  await root.getByRole('button', { name: 'Sorozat hozzáadása', exact: true }).first().click();
  const addResult = await success(await added, 'Add GUI set'); const setId = Number(addResult.data);
  await expect(root.locator('article').first().getByRole('checkbox')).toHaveCount(initial + 1);
  expect(await dbOne('SELECT target_repetitions,target_weight_kg,actual_repetitions,actual_weight_kg,completed,notes FROM user_workout_exercise_sets WHERE id=$1', [setId])).toMatchObject({ target_repetitions: before[initial-1].target_repetitions, actual_repetitions: null, actual_weight_kg: null, completed: false, notes: null });
  await root.locator('article').first().getByRole('button', { name: /^Sorozat törlése:/ }).last().click();
  await root.getByRole('button', { name: 'Törlés', exact: true }).click();
  await expect(root.locator('article').first().getByRole('checkbox')).toHaveCount(initial);
  expect(await dbOne('SELECT id FROM user_workout_exercise_sets WHERE id=$1', [setId])).toBeNull();
  const after = await fixtureSets(f); expect(after.map(s => s.id)).toEqual(before.map(s => s.id));
});

test('NEW COACH LIVE: client reschedule persists and does not change template day indices', async ({ page, workspace: f }) => {
  const userWorkoutId = await openClient(page, f);
  const baseline = (await db().query('SELECT id,day_index FROM program_workouts WHERE program_id=$1 ORDER BY id', [f.programId])).rows;
  const root = page.locator('app-coach-client-detail'); await root.locator('[name=rescheduleDate]').fill('2035-03-04');
  const pending = page.waitForResponse(r => r.request().method() === 'PATCH' && new URL(r.url()).pathname === E.userWorkoutExercises.schedule);
  await root.getByRole('button', { name: 'Dátum mentése', exact: true }).click(); await success(await pending, 'Reschedule GUI workout');
  await page.reload(); await expect(root.locator('[name=rescheduleDate]')).toHaveValue('2035-03-04');
  expect((await dbOne('SELECT scheduled_at::text AS date FROM user_workouts WHERE id=$1', [userWorkoutId]))?.date).toBe('2035-03-04');
  expect((await db().query('SELECT id,day_index FROM program_workouts WHERE program_id=$1 ORDER BY id', [f.programId])).rows).toEqual(baseline);
});

test('NEW COACH LIVE: revoke and reassign from client dialog rebuilds fixture plan', async ({ page, workspace: f }) => {
  await page.goto(`/coach/clients/${f.userId}?program=${f.programId}&tab=programs`); const root = page.locator('app-coach-client-detail');
  const card = root.getByRole('region', { name: 'Programok', exact: true }).locator(':scope > div').filter({ has: page.getByRole('link', { name: f.name, exact: true }) });
  await card.getByRole('button', { name: 'Visszavonás', exact: true }).click();
  await card.getByRole('button', { name: 'Visszavonás', exact: true }).click();
  await expect(card).toHaveCount(0);
  expect(await dbOne('SELECT id FROM user_programs WHERE program_id=$1 AND user_id=$2', [f.programId,f.userId])).toBeNull();
  await root.getByRole('button', { name: 'Program kiosztása', exact: true }).click(); const dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: new RegExp(f.name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')) }).check();
  await dialog.getByRole('button', { name: 'Kiosztás', exact: true }).click(); await expect(dialog).toHaveCount(0);
  expect(await dbOne('SELECT id FROM user_programs WHERE program_id=$1 AND user_id=$2', [f.programId,f.userId])).not.toBeNull();
  expect((await db().query('SELECT id FROM user_workouts WHERE program_id=$1 AND user_id=$2',[f.programId,f.userId])).rows).toHaveLength(2);
});

test('NEW COACH LIVE: non-coach cannot access overview or coach tools', async ({ page, workspace: f }) => {
  const { authenticate } = await import('../../helpers/auth-session');
  const { apiFor } = await import('../../helpers/e2e-next-3-helpers');
  await authenticate(page, 'user'); const user = await apiFor(page);
  try {
    const before = await snapshotProgram(f.programId);
    for (const response of [
      await user.get('/api/coach/overview', { params: { from: '2035-03-01', to: '2035-03-30' } }),
      await user.get('/api/coach/programs/assignment-counts'),
      await user.get(`/api/coach/workouts/${f.workoutId}/programs`),
      await user.post(`/api/coach/programs/${f.programId}/copy`, { data: { name: 'Forbidden copy', startDate: '2035-03-01' } }),
      await user.post(`/api/coach/workouts/${f.workoutId}/copy`, { data: { name: 'Forbidden copy' } }),
      await user.post(`/api/coach/workouts/${f.workoutId}/apply-template`, { data: {} }),
    ]) expect(response.status()).toBe(403);
    expect(await snapshotProgram(f.programId)).toEqual(before);
  } finally { await user.dispose(); }
});

test('NEW COACH LIVE: new program form creates and edits persisted details', async ({ page, workspace: f }) => {
  await page.goto('/coach/programs/new'); const root = page.locator('app-coach-program-editor'); const name = `E2E workspace ${suffix()}`;
  await root.locator('[name=programName]').fill(name); await root.locator('[name=programDescription]').fill('Workspace GUI creation');
  await root.locator('[name=startDate]').fill('2035-06-04'); await root.locator('[name=durationDays]').fill('14');
  await root.getByRole('radio', { name: 'Profi', exact: true }).check();
  const pending = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === E.userPrograms.base);
  await root.getByRole('button', { name: 'Létrehozás', exact: true }).click(); const result = await success(await pending, 'GUI create program');
  const id = Number(result.data); f.extraPrograms.push(id); await expect(page).toHaveURL(new RegExp(`/coach/programs/${id}$`));
  await expect(root.locator('[name=programName]')).toHaveValue(name);
  expect(await dbOne('SELECT duration_days,start_date::text AS start FROM programs WHERE id=$1', [id])).toEqual({ duration_days: 14, start: '2035-06-04' });
  await root.locator('[name=programName]').fill(`${name} renamed`); await root.getByRole('button', { name: 'Mentés', exact: true }).click();
  await expect(root.locator('app-message[role=status]')).toContainText('A program mentve.');
  await page.reload(); await expect(root.locator('[name=programName]')).toHaveValue(`${name} renamed`);
});

test('NEW COACH LIVE: editable library copy opens new workout and has independent exercise rows', async ({ page, workspace: f }) => {
  await openWorkspace(page, f); const panel = page.getByRole('region', { name: 'Kiválasztott nap', exact: true });
  const original = (await db().query('SELECT id,exercise_id FROM workout_exercises WHERE workout_id=$1 ORDER BY order_index', [f.workoutId])).rows;
  const pending = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === `/api/coach/workouts/${f.workoutId}/copy`);
  await panel.getByRole('button', { name: 'Szerkeszthető másolat az Edzéstárban', exact: true }).click();
  const result = await success(await pending, 'Copy to library'); const id = Number(result.data); f.extraWorkouts.push(id);
  await expect(page).toHaveURL(new RegExp(`/coach/workouts/${id}/edit$`));
  await expect(page.locator('app-coach-workout-edit')).toBeVisible(); expect(id).not.toBe(f.workoutId);
  const copied = (await db().query('SELECT id,exercise_id FROM workout_exercises WHERE workout_id=$1 ORDER BY order_index', [id])).rows;
  expect(copied.map(e => e.exercise_id)).toEqual(original.map(e => e.exercise_id));
  for (const e of copied) expect(original.map(row => row.id)).not.toContain(e.id);
});


test('NEW COACH LIVE: workout library supports adding, reordering and removing exercises', async ({ page, workspace: f }) => {
  const workoutId = await createWorkout(f.api); f.extraWorkouts.push(workoutId);
  const exerciseName = `E2E library exercise ${suffix()}`;
  const exerciseId = await createExercise(f.api, exerciseName); f.extraExercises.push(exerciseId);
  await assignExercise(f.api, workoutId, f.exerciseId);
  await page.goto(`/coach/workouts/${workoutId}/edit`); const root = page.locator('app-coach-workout-edit');
  await root.locator('#exerciseSearch').fill(exerciseName);
  await root.getByRole('button', { name: new RegExp(exerciseName) }).click();
  const added = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === E.workoutExercises.base);
  await root.getByRole('button', { name: 'Exercise hozzáadása', exact: true }).click(); await success(await added, 'Library GUI add exercise');
  const down = root.getByRole('button', { name: 'Lejjebb', exact: true });
  await expect(down).toHaveCount(2); await expect(down.last()).toBeDisabled();
  const reordered = page.waitForResponse(r => r.request().method() === 'PUT' && new URL(r.url()).pathname === E.workoutExercises.order);
  await down.first().click(); await success(await reordered, 'Library GUI reorder');
  await expect(root.locator('div.flex.min-w-0.items-center.gap-3.rounded-xl').first().locator('strong')).toHaveText(exerciseName);
  expect((await db().query('SELECT exercise_id FROM workout_exercises WHERE workout_id=$1 ORDER BY order_index', [workoutId])).rows.map(r => r.exercise_id)).toEqual([exerciseId, f.exerciseId]);
  const removed = page.waitForResponse(r => r.request().method() === 'DELETE' && new URL(r.url()).pathname === E.workoutExercises.base);
  await root.getByRole('button', { name: 'Gyakorlat eltávolítása', exact: true }).first().click(); await success(await removed, 'Library GUI remove exercise');
  expect((await db().query('SELECT exercise_id FROM workout_exercises WHERE workout_id=$1', [workoutId])).rows.map(r => r.exercise_id)).toEqual([f.exerciseId]);
});
