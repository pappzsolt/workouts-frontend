import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { apiFor, closeDb, db, login, success } from '../../helpers/e2e-next-3-helpers';
import { cleanupProgramPickerFixture, createProgramPickerFixture, openProgramBuilder } from '../../helpers/program-picker-fixture';
import { setTestLanguage } from '../../helpers/read-only';

test.afterAll(closeDb);
test('COACH GUI: selections survive search, clearing and page changes and persist exactly once', async ({ page }) => {
  await setTestLanguage(page); await login(page, 'coach');
  const api = await apiFor(page); const f = await createProgramPickerFixture(api);
  try {
    await openProgramBuilder(page, f.programId);
    await page.getByTestId('open-workout-picker').click();
    const board = page.locator('app-coach-workout-board');
    const filter = async (term: string) => {
      const response = page.waitForResponse(r => r.request().method() === 'GET' && new URL(r.url()).pathname === API_ENDPOINTS.workouts.mySearch && new URL(r.url()).searchParams.get('search') === term);
      await board.locator('#workoutSearch').fill(term);
      expect((await response).ok()).toBe(true);
      await expect(board.locator('#workoutSearch')).toBeVisible();
    };
    const next = async () => {
      const response = page.waitForResponse(r => r.request().method() === 'GET' && new URL(r.url()).pathname === API_ENDPOINTS.workouts.mySearch && new URL(r.url()).searchParams.get('page') === '1');
      await board.locator('app-pagination').getByRole('button', { name: /következő|next/i }).click();
      expect((await response).ok()).toBe(true);
      await expect(board.locator('app-pagination')).toContainText('2 / 2');
    };
    await filter(f.prefix); await next();
    await board.locator(`#compact-workout-${f.workouts[9].id}`).check();
    await filter(f.workouts[0].name);
    await board.locator(`#compact-workout-${f.workouts[0].id}`).check();
    await filter(''); await filter(f.prefix);
    await expect(board.locator(`#compact-workout-${f.workouts[0].id}`)).toBeChecked();
    await next();
    await expect(board.locator(`#compact-workout-${f.workouts[9].id}`)).toBeChecked();
    await page.getByTestId('add-workouts-to-program').click();
    await expect(page.getByTestId('selected-workout')).toHaveCount(2);
    const ids = [f.workouts[0].id, f.workouts[9].id].sort((a,b) => a-b);
    expect((await db().query('SELECT workout_id FROM program_workouts WHERE program_id=$1 ORDER BY workout_id', [f.programId])).rows.map(row => row.workout_id)).toEqual(ids);
    const saved = await success(await api.get(API_ENDPOINTS.programWorkouts.base, { params: { programId: f.programId } }), 'Saved picker selection');
    expect(saved.data.map((row: any) => row.workoutId).sort((a: number,b: number) => a-b)).toEqual(ids);
    await openProgramBuilder(page, f.programId);
    await expect(page.getByTestId('selected-workout')).toHaveCount(2);
    for (const index of [0,9]) await expect(page.getByTestId('selected-workout').getByRole('heading', { name: f.workouts[index].name, exact: true })).toHaveCount(1);
  } finally { try { await cleanupProgramPickerFixture(api, f); } finally { await api.dispose(); } }
});
