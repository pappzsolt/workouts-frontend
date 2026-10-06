import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { apiFor, closeDb, currentUserId, db, dbOne, login, success } from '../../helpers/e2e-next-3-helpers';
import { assign, attach, cleanupAuditFixture, createAuditFixture } from '../../helpers/audit-fixture';
import { setTestLanguage } from '../../helpers/read-only';

test.afterAll(closeDb);
test('COACH GUI: workout exercise and added set targets persist through API, DB, reload and owner read', async ({ page }) => {
  await setTestLanguage(page);
  await login(page, 'coach');
  const api = await apiFor(page);
  const fixture = await createAuditFixture(api);
  try {
    const userId = await currentUserId();
    const occurrenceId = await attach(api, fixture, 1);
    await assign(api, fixture, userId);
    const row = await dbOne<{ id: number; user_workout_id: number; username: string; workout_name: string; exercise_name: string; program_name: string }>(`
      SELECT uwe.id, uwe.user_workout_id, u.username, wt.name AS workout_name,
             et.name AS exercise_name, pt.name AS program_name
      FROM user_workout_exercises uwe
      JOIN user_workouts uw ON uw.id=uwe.user_workout_id
      JOIN users u ON u.id=uw.user_id
      JOIN workout_translations wt ON wt.workout_id=uw.workout_id AND wt.language_code=$3
      JOIN workout_exercises we ON we.id=uwe.workout_exercise_id
      JOIN exercise_translations et ON et.exercise_id=we.exercise_id AND et.language_code=$3
      JOIN program_translations pt ON pt.program_id=uw.program_id AND pt.language_code=$3
      WHERE uw.program_workout_id=$1 AND uw.user_id=$2`, [occurrenceId, userId, process.env.E2E_LANGUAGE ?? 'hu']);
    expect(row).not.toBeNull();
    const original = (await db().query('SELECT * FROM user_workout_exercise_sets WHERE user_workout_exercise_id=$1 ORDER BY id', [row!.id])).rows;
    expect(original.length).toBeGreaterThan(0);
    const surface = page.locator('app-user-workout-exercise-manager');
    const openManager = async () => {
      await page.goto('/coach/dashboard?section=workout-exercise-manager');
      await surface.locator('app-user-select').getByRole('combobox').selectOption({ label: row!.username });
      await surface.locator('app-coach-program-select').getByRole('combobox').selectOption({ label: row!.program_name });
      const loaded = page.waitForResponse(response => response.request().method() === 'GET' &&
        new URL(response.url()).pathname === API_ENDPOINTS.userWorkoutExercises.byUserProgram(userId, fixture.programId));
      await surface.getByRole('button', { name: /^(program adatok betöltése|load program data|programmdaten laden)$/i }).click();
      expect((await loaded).ok()).toBe(true);
      await expect(surface.getByRole('heading', { level: 3 })).toHaveText(row!.workout_name);
      await expect(surface.locator('.selected-exercise').getByRole('heading', { level: 4 })).toHaveText(row!.exercise_name);
      await expect(surface.getByRole('spinbutton', { name: /^Cél ismétlés$/ })).toBeVisible();
    };
    await openManager();
    const added = page.waitForResponse(response => response.request().method() === 'POST' &&
      new URL(response.url()).pathname === API_ENDPOINTS.userWorkoutExerciseSets.sets(row!.id));
    await surface.getByRole('button', { name: /^Új set$/ }).click();
    const response = await added;
    expect(response.ok()).toBe(true);
    expect((await response.json()).success).toBe(true);
    await expect(surface.locator('.set-progress').getByRole('button')).toHaveCount(original.length + 1);
    const newSet = await dbOne<{ id: number; set_number: number }>('SELECT id,set_number FROM user_workout_exercise_sets WHERE user_workout_exercise_id=$1 ORDER BY set_number DESC LIMIT 1', [row!.id]);
    expect(newSet).not.toBeNull();
    await surface.getByRole('button', { name: `Set ${original.length + 1}`, exact: true }).click();
    await surface.getByRole('spinbutton', { name: /^Cél ismétlés$/ }).fill('11');
    await surface.getByRole('spinbutton', { name: /^Cél súly$/ }).fill('27.5');
    const saved = page.waitForResponse(result => result.request().method() === 'PUT' &&
      new URL(result.url()).pathname === API_ENDPOINTS.userWorkoutExerciseSets.byId(newSet!.id));
    await surface.locator('.set-editor-actions').getByRole('button', { name: /^Mentés$/ }).click();
    const savedResponse = await saved;
    expect(savedResponse.ok()).toBe(true);
    expect(savedResponse.request().postDataJSON()).toMatchObject({ setNumber: newSet!.set_number, targetRepetitions: 11, targetWeightKg: 27.5 });
    expect((await savedResponse.json()).success).toBe(true);
    const persisted = await dbOne<any>('SELECT target_repetitions,target_weight_kg,completed FROM user_workout_exercise_sets WHERE id=$1', [newSet!.id]);
    expect(Number(persisted.target_repetitions)).toBe(11);
    expect(Number(persisted.target_weight_kg)).toBe(27.5);
    expect(persisted.completed).toBe(false);
    expect((await db().query('SELECT * FROM user_workout_exercise_sets WHERE user_workout_exercise_id=$1 AND id<>$2 ORDER BY id', [row!.id, newSet!.id])).rows).toEqual(original);
    await openManager();
    await expect(surface.locator('.set-progress').getByRole('button')).toHaveCount(original.length + 1);
    await surface.getByRole('button', { name: `Set ${original.length + 1}`, exact: true }).click();
    await expect(surface.getByRole('spinbutton', { name: /^Cél ismétlés$/ })).toHaveValue('11');
    await expect(surface.getByRole('spinbutton', { name: /^Cél súly$/ })).toHaveValue('27.5');
    await login(page, 'user');
    const owner = await apiFor(page);
    try {
      const sets = await success(await owner.get(API_ENDPOINTS.userWorkoutExerciseSets.byExercise(row!.id)), 'Owner reads coach targets');
      expect(sets.data).toHaveLength(original.length + 1);
      expect(sets.data.find((set: any) => Number(set.id) === newSet!.id)).toMatchObject({ targetRepetitions: 11, targetWeightKg: 27.5, completed: false });
    } finally { await owner.dispose(); }
  } finally {
    try { await cleanupAuditFixture(api, fixture); } finally { await api.dispose(); }
  }
});
