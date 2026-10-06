import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { apiFor, closeDb, db, login } from '../../helpers/e2e-next-3-helpers';
import { cleanupProgramPickerFixture, createProgramPickerFixture, openProgramBuilder } from '../../helpers/program-picker-fixture';
import { setTestLanguage } from '../../helpers/read-only';

test.afterAll(closeDb);
test('COACH GUI: double-clicking add sends one write and creates one occurrence', async ({ page }) => {
  await setTestLanguage(page); await login(page, 'coach');
  const api = await apiFor(page); const f = await createProgramPickerFixture(api, 1);
  try {
    await openProgramBuilder(page, f.programId); await page.getByTestId('open-workout-picker').click();
    const board = page.locator('app-coach-workout-board');
    await board.locator('#workoutSearch').fill(f.prefix);
    await board.locator(`#compact-workout-${f.workouts[0].id}`).check();
    const writes: unknown[] = [];
    page.on('request', req => { if (req.method() === 'POST' && new URL(req.url()).pathname === API_ENDPOINTS.programWorkouts.base) writes.push(req.postDataJSON()); });
    const saved = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === API_ENDPOINTS.programWorkouts.base);
    await page.getByTestId('add-workouts-to-program').dblclick();
    expect((await saved).ok()).toBe(true);
    await expect(page.getByTestId('selected-workout')).toHaveCount(1);
    await openProgramBuilder(page, f.programId);
    expect(writes).toEqual([{ programId: f.programId, workoutId: f.workouts[0].id, dayIndex: 1 }]);
    expect((await db().query('SELECT workout_id,day_index FROM program_workouts WHERE program_id=$1', [f.programId])).rows).toEqual([{ workout_id: f.workouts[0].id, day_index: 1 }]);
    await expect(page.getByTestId('selected-workout')).toHaveCount(1);
  } finally { try { await cleanupProgramPickerFixture(api, f); } finally { await api.dispose(); } }
});
