import { test, expect, signIn, save, result, date, unique, response } from './scenario-fixture';

test('Edzés: két ablak egyidejű mentése, mindkét ablak ugyanazt a tárolt eredményt olvassa', async ({ page, context, actors: a }) => {
  const name = unique('Párhuzamos'), workout = await save(a.coach.api, 'post', '/api/workouts', { name, workoutDate: date(), durationMinutes: 45, intensityLevel: 'MEDIUM' });
  await signIn(page, a.coach); await page.goto(`/coach/workouts/${workout.id}/edit`);
  const other = await context.newPage();
  try {
    await other.goto(`/coach/workouts/${workout.id}/edit`);
    await expect(page.locator('#workoutName')).toHaveValue(name); await expect(other.locator('#workoutName')).toHaveValue(name);
    await page.locator('#description').fill('Az első ablak módosítása'); await other.locator('#description').fill('A második ablak módosítása');
    const firstSave = response(page, 'PUT', `/api/workouts/${workout.id}`), secondSave = response(other, 'PUT', `/api/workouts/${workout.id}`);
    await Promise.all([page.locator('app-coach-workout-edit button[type=submit]').click(), other.locator('app-coach-workout-edit button[type=submit]').click()]);
    expect((await firstSave).status()).toBe(200); expect((await secondSave).status()).toBe(200);
    const stored = await result(a.coach.api, `/api/workouts/${workout.id}`); expect(['Az első ablak módosítása', 'A második ablak módosítása']).toContain(stored.workoutDescription); expect(stored.workoutName).toBe(name);
    await expect(page).toHaveURL(/\/coach\/workouts$/); await expect(other).toHaveURL(/\/coach\/workouts$/);
    await page.goto(`/coach/workouts/${workout.id}/edit`); await other.goto(`/coach/workouts/${workout.id}/edit`);
    await expect(page.locator('#description')).toHaveValue(stored.workoutDescription); await expect(other.locator('#description')).toHaveValue(stored.workoutDescription);
  } finally { await other.close(); }
});
