import { test, expect } from '../../helpers/p1-fixture';
import { closeDb, db, dbOne, success } from '../../helpers/e2e-next-3-helpers';
import { API_ENDPOINTS as E } from '../../helpers/api-endpoints';
import { API_ENDPOINTS as FRONTEND } from '../../../../src/app/api-endpoints';

const savePath = new URL(FRONTEND.exerciseSetCompleted, 'http://localhost').pathname;

test.afterAll(closeDb);
test.describe.configure({ timeout: 120_000 });
test('USER WORKOUT: assigned program → exercise → actual values → complete all sets → reload → DB and API', async ({ page, plan: p }) => {
  const workout = p.workouts[0];
  const sets = p.sets.filter(s => s.user_workout_id === workout.id);
  const untouched = p.sets.filter(s => s.user_workout_id === p.workouts[1].id);
  // An isolated user has exactly this program, so navigation cannot silently pick existing data.
  await page.goto('/user/my-programs');
  await page.locator(`app-user-my-programs a[href*="/user/programs/${p.programId}/workouts"]`).click();
  await expect(page).toHaveURL(new RegExp(`/user/programs/${p.programId}/workouts\\?`));
  await page.locator('app-workouts app-card').filter({ has: page.locator('h4') }).first().click();
  await expect(page).toHaveURL(url => Number(url.searchParams.get('userWorkoutId')) === Number(workout.id));
  await page.locator('app-user-exercises app-card h3').click();
  await expect(page).toHaveURL(url => url.pathname.endsWith(`/exercises/${p.exerciseId}`) && Number(url.searchParams.get('userWorkoutId')) === Number(workout.id));
  const surface = page.locator('app-user-exercise-detail');
  const writes: any[] = [];
  page.on('request', r => {
    if (r.method() === 'PATCH' && new URL(r.url()).pathname === savePath) writes.push(r.postDataJSON());
  });
  for (let i = 0; i < sets.length; i++) {
    const set = sets[i];
    await expect(surface.locator('#user-set-actual-repetitions')).toHaveAttribute('data-validation-set', String(set.id));
    for (const [selector, value] of [['#user-set-actual-repetitions', String(8 + i)], ['#user-set-actual-weight', String(20 + i * 2.5)]]) {
      const saved = page.waitForResponse(r => r.request().method() === 'PATCH' && new URL(r.url()).pathname === savePath && r.request().postDataJSON().setId === set.id);
      await surface.locator(selector).fill(value);
      await surface.locator(selector).blur();
      const response = await saved;
      expect(response.status()).toBe(200); expect((await response.json()).success).toBe(true);
    }
    const completed = page.waitForResponse(r => r.request().method() === 'PATCH' && new URL(r.url()).pathname === savePath && r.request().postDataJSON().setId === set.id && r.request().postDataJSON().completed === true);
    await surface.getByRole('button', { name: 'KÉSZ', exact: true }).click();
    expect((await completed).status()).toBe(200);
    await expect(surface.getByText('Sorozat teljesítve', { exact: true })).toBeVisible();
    if (i < sets.length - 1) await surface.getByRole('button', { name: 'Következő', exact: true }).click();
  }
  expect(writes.length).toBeGreaterThanOrEqual(sets.length * 3);
  for (const write of writes) expect(write).toMatchObject({ userWorkoutId: workout.id, programId: p.programId, workoutId: p.workoutId, exerciseId: p.exerciseId });
  const stored = (await db().query('SELECT * FROM user_workout_exercise_sets WHERE id=ANY($1::bigint[]) ORDER BY set_number', [sets.map(s => s.id)])).rows;
  for (let i = 0; i < stored.length; i++) {
    expect(stored[i].completed).toBe(true); expect(stored[i].completed_at).not.toBeNull();
    expect(Number(stored[i].actual_repetitions)).toBe(8 + i);
    expect(Number(stored[i].actual_weight_kg)).toBe(20 + i * 2.5);
    expect(stored[i].target_repetitions).toEqual(sets[i].target_repetitions);
    expect(stored[i].target_weight_kg).toEqual(sets[i].target_weight_kg);
  }
  expect((await dbOne('SELECT completed FROM user_workouts WHERE id=$1', [workout.id])).completed).toBe(true);
  expect((await dbOne('SELECT completed FROM user_workouts WHERE id=$1', [p.workouts[1].id])).completed).toBe(false);
  const other = (await db().query('SELECT * FROM user_workout_exercise_sets WHERE id=ANY($1::bigint[]) ORDER BY set_number', [untouched.map(s => s.id)])).rows;
  expect(other).toEqual(untouched.map(({ user_workout_id, ...set }) => set));
  await page.reload();
  await expect(surface.locator('#user-set-actual-repetitions')).toHaveValue('8');
  await expect(surface.locator('#user-set-actual-weight')).toHaveValue('20');
  await expect(surface.getByText('Sorozat teljesítve', { exact: true })).toBeVisible();
  const read = await success(await p.owner.get(E.userWorkoutExerciseSets.byExercise(sets[0].user_workout_exercise_id)), 'Read completed workout sets');
  expect(read.data).toHaveLength(sets.length);
  for (let i = 0; i < sets.length; i++) expect(read.data.find((s: any) => Number(s.id) === Number(sets[i].id))).toMatchObject({ completed: true, actualRepetitions: 8 + i, actualWeightKg: 20 + i * 2.5 });
});
