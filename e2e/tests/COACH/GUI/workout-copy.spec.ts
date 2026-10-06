import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { apiFor, closeDb, db, dbOne, deleteExercise, deleteProgram, deleteWorkout, login, success, suffix } from '../../helpers/e2e-next-3-helpers';
import { attach, createAuditFixture } from '../../helpers/audit-fixture';
import { openProgramBuilder } from '../../helpers/program-picker-fixture';
import { setTestLanguage } from '../../helpers/read-only';

test.afterAll(closeDb);
test('COACH GUI: copied workout has independent metadata and exercise relationships', async ({ page }) => {
  await setTestLanguage(page); await login(page, 'coach');
  const api = await apiFor(page); const f = await createAuditFixture(api);
  let copyId: number | undefined;
  try {
    await attach(api, f, 1);
    const original = await dbOne('SELECT * FROM workouts WHERE id=$1', [f.workoutId]);
    const translations = (await db().query('SELECT * FROM workout_translations WHERE workout_id=$1 ORDER BY language_id', [f.workoutId])).rows;
    const relations = (await db().query('SELECT * FROM workout_exercises WHERE workout_id=$1 ORDER BY id', [f.workoutId])).rows;
    await openProgramBuilder(page, f.programId);
    await page.getByTestId('selected-workout').getByRole('button', { name: /^Workout másolása$/ }).click();
    const dialog = page.getByRole('dialog', { name: /^Workout másolása$/ });
    const copyName = `E2E independent copy ${suffix()}`;
    await dialog.locator('#copyWorkoutName').fill(copyName);
    await dialog.locator('#copyWorkoutDate').fill('2035-03-02');
    await dialog.locator('#copyWorkoutDayIndex').fill('2');
    const copied = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === API_ENDPOINTS.workouts.copy);
    await dialog.getByRole('button', { name: /^Workout másolása$/ }).click();
    const response = await copied; expect(response.ok()).toBe(true);
    const body = await response.json(); expect(body.success).toBe(true);
    copyId = Number(body.data); expect(copyId).toBeGreaterThan(0); expect(copyId).not.toBe(f.workoutId);
    await expect(dialog).not.toBeVisible();
    await expect(page.getByTestId('selected-workout')).toHaveCount(2);
    const copiedRelations = (await db().query('SELECT * FROM workout_exercises WHERE workout_id=$1 ORDER BY order_index', [copyId])).rows;
    expect(copiedRelations).toHaveLength(relations.length);
    for (let i=0; i<relations.length; i++) {
      expect(copiedRelations[i].id).not.toBe(relations[i].id);
      const { id, workout_id, ...sourceFields } = relations[i];
      const { id: newId, workout_id: newWorkoutId, ...copiedFields } = copiedRelations[i];
      expect(newWorkoutId).toBe(copyId); expect(copiedFields).toEqual(sourceFields);
    }
    await page.goto(`/coach/workouts/${copyId}/edit`);
    await page.locator('#description').fill('Independent copy description');
    await page.locator('#durationMinutes').fill('75');
    const updated = page.waitForResponse(r => r.request().method() === 'PUT' && new URL(r.url()).pathname === API_ENDPOINTS.workouts.byId(copyId!));
    await page.locator('app-coach-workout-edit').locator('form').getByRole('button', { name: /edzés mentése|save workout|workout speichern/i }).click();
    expect((await updated).ok()).toBe(true);
    expect((await dbOne('SELECT duration_minutes FROM workouts WHERE id=$1', [copyId])).duration_minutes).toBe(75);
    expect((await dbOne('SELECT description FROM workout_translations wt JOIN languages l ON l.id=wt.language_id WHERE workout_id=$1 AND l.code=$2', [copyId, process.env.E2E_LANGUAGE ?? 'hu'])).description).toBe('Independent copy description');
    const occurrence = await dbOne<{ id: number }>('SELECT id FROM program_workouts WHERE program_id=$1 AND workout_id=$2', [f.programId, copyId]);
    await success(await api.delete(API_ENDPOINTS.programWorkouts.deleteById(occurrence!.id)), 'Detach only copy');
    await success(await api.delete(API_ENDPOINTS.workoutExercises.base, { params: { workoutId: copyId, exerciseId: f.exerciseId } }), 'Remove only copied relation');
    expect(await dbOne('SELECT * FROM workouts WHERE id=$1', [f.workoutId])).toEqual(original);
    expect((await db().query('SELECT * FROM workout_translations WHERE workout_id=$1 ORDER BY language_id', [f.workoutId])).rows).toEqual(translations);
    expect((await db().query('SELECT * FROM workout_exercises WHERE workout_id=$1 ORDER BY id', [f.workoutId])).rows).toEqual(relations);
    expect((await db().query('SELECT id FROM workout_exercises WHERE workout_id=$1', [copyId])).rows).toEqual([]);
  } finally {
    const errors: unknown[] = [];
    try { await deleteProgram(api, f.programId); } catch (error) { errors.push(error); }
    if (copyId !== undefined) try { await deleteWorkout(api, copyId); } catch (error) { errors.push(error); }
    try { await deleteWorkout(api, f.workoutId); } catch (error) { errors.push(error); }
    try { await deleteExercise(api, f.exerciseId); } catch (error) { errors.push(error); }
    await api.dispose(); if (errors.length) throw new AggregateError(errors, 'Copy fixture cleanup');
  }
});
