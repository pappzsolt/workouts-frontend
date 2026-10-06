import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { apiFor, closeDb, createProgram, createWorkout, db, deleteProgram, deleteWorkout, login, success, suffix } from '../../helpers/e2e-next-3-helpers';
import { setTestLanguage } from '../../helpers/read-only';

test.afterAll(closeDb);
test('COACH GUI: switching programs discards pending selection and saves only to the active program', async ({ page }) => {
  await setTestLanguage(page);
  await login(page, 'coach');
  const api = await apiFor(page);
  const programs: number[] = [];
  const workouts: number[] = [];
  const prefix = `E2E selection ${suffix()}`;
  try {
    for (const letter of ['A', 'B']) programs.push(await createProgram(api, `${prefix} ${letter}`));
    for (const letter of ['A', 'B', 'C']) workouts.push(await createWorkout(api, `${prefix} ${letter}`));
    for (let i = 0; i < 2; i++) await success(await api.post(API_ENDPOINTS.programWorkouts.base, {
      data: { programId: programs[i], workoutId: workouts[i], dayIndex: i + 1 },
    }), 'Baseline program assignment');
    const initialA = (await db().query('SELECT * FROM program_workouts WHERE program_id=$1 ORDER BY id', [programs[0]])).rows;
    await page.goto('/coach/dashboard?section=program-workouts');
    const surface = page.locator('app-program-workouts-ass');
    await surface.locator('#programBoardSearch').fill(prefix);
    const board = surface.locator('app-coach-workout-board');
    await board.locator('#workoutSearch').fill(prefix);
    await expect(board.getByRole('checkbox')).toHaveCount(3);
    const save = surface.getByRole('button', { name: /^(mentés|save|speichern)$/i });
    const selectProgram = async (index: number) => {
      const loaded = page.waitForResponse(response => response.request().method() === 'GET' &&
        new URL(response.url()).pathname === API_ENDPOINTS.programWorkouts.base &&
        new URL(response.url()).searchParams.get('programId') === String(programs[index]));
      await surface.locator(`label[for="program-${programs[index]}"]`).click();
      expect((await loaded).ok()).toBe(true);
      await expect(surface.locator(`#program-${programs[index]}`)).toBeChecked();
      await expect(save).toBeEnabled();
    };
    await selectProgram(0);
    await expect(board.locator(`#workout-${workouts[0]}`)).toBeChecked();
    await board.locator(`#workout-${workouts[2]}`).check();
    await selectProgram(1);
    await expect(board.locator(`#workout-${workouts[0]}`)).not.toBeChecked();
    await expect(board.locator(`#workout-${workouts[1]}`)).toBeChecked();
    await expect(board.locator(`#workout-${workouts[2]}`)).not.toBeChecked();
    await board.locator(`#workout-${workouts[2]}`).check();
    const saved = page.waitForResponse(response => response.request().method() === 'POST' &&
      new URL(response.url()).pathname === API_ENDPOINTS.programWorkouts.base);
    await save.click();
    const response = await saved;
    expect(response.ok()).toBe(true);
    expect(response.request().postDataJSON()).toEqual({ programId: programs[1], workoutId: workouts[2], dayIndex: 3 });
    expect((await db().query('SELECT * FROM program_workouts WHERE program_id=$1 ORDER BY id', [programs[0]])).rows).toEqual(initialA);
    const expectedB = [{ workout_id: workouts[1], day_index: 2 }, { workout_id: workouts[2], day_index: 3 }];
    expect((await db().query('SELECT workout_id,day_index FROM program_workouts WHERE program_id=$1 ORDER BY day_index', [programs[1]])).rows).toEqual(expectedB);
    const apiB = await success(await api.get(API_ENDPOINTS.programWorkouts.base, { params: { programId: programs[1] } }), 'Saved active program');
    expect(apiB.data.map((row: any) => ({ workout_id: row.workoutId, day_index: row.dayIndex })).sort((a: any, b: any) => a.day_index - b.day_index)).toEqual(expectedB);
    await page.reload();
    await surface.locator('#programBoardSearch').fill(prefix);
    await board.locator('#workoutSearch').fill(prefix);
    await selectProgram(1);
    await expect(board.locator(`#workout-${workouts[1]}`)).toBeChecked();
    await expect(board.locator(`#workout-${workouts[2]}`)).toBeChecked();
    await expect(board.locator(`#workout-${workouts[0]}`)).not.toBeChecked();
  } finally {
    const errors: unknown[] = [];
    for (const id of programs) try { await deleteProgram(api, id); } catch (error) { errors.push(error); }
    for (const id of workouts) try { await deleteWorkout(api, id); } catch (error) { errors.push(error); }
    await api.dispose();
    if (errors.length) throw new AggregateError(errors, 'Selection fixture cleanup');
  }
});
