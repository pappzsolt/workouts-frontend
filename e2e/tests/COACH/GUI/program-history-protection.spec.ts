import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { apiFor, closeDb, currentUserId, dbOne, login, success } from '../../helpers/e2e-next-3-helpers';
import { assign, attach, cleanupAuditFixture, createAuditFixture, snapshotProgram } from '../../helpers/audit-fixture';
import { setTestLanguage } from '../../helpers/read-only';

test.afterAll(closeDb);
test('COACH GUI: historical program deletion shows the real 409 and preserves all records', async ({ page }) => {
  await setTestLanguage(page); await login(page, 'coach');
  const coach = await apiFor(page); const f = await createAuditFixture(coach);
  let owner: Awaited<ReturnType<typeof apiFor>> | undefined;
  try {
    await attach(coach, f, 1); await assign(coach, f, await currentUserId());
    const set = await dbOne<{ id: number }>('SELECT s.id FROM user_workout_exercise_sets s JOIN user_workout_exercises e ON e.id=s.user_workout_exercise_id JOIN user_workouts w ON w.id=e.user_workout_id WHERE w.program_id=$1 ORDER BY s.id LIMIT 1', [f.programId]);
    expect(set).not.toBeNull();
    await login(page, 'user'); owner = await apiFor(page);
    await success(await owner.put(API_ENDPOINTS.userWorkoutExerciseSets.byId(set!.id), { data: { completed: true, actualRepetitions: 8, actualWeightKg: 20 } }), 'Create fixture execution history');
    const before = await snapshotProgram(f.programId);
    await login(page, 'coach'); await page.goto('/coach/programs');
    const name = await dbOne<{ name: string }>('SELECT name FROM program_translations WHERE program_id=$1 ORDER BY language_id LIMIT 1', [f.programId]);
    await page.locator('#programSearch').fill(name!.name);
    const card = page.locator(`[data-testid="coach-program"][data-program-id="${f.programId}"]`);
    await expect(card).toBeVisible();
    await card.getByRole('button', { name: /^Törlés$/ }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    const rejected = page.waitForResponse(r => r.request().method() === 'DELETE' && new URL(r.url()).pathname === API_ENDPOINTS.programs.coachDelete(f.programId));
    await dialog.getByRole('button', { name: /^Törlés$/ }).click();
    const response = await rejected; expect(response.status()).toBe(409);
    const error = await response.json(); expect(error.success).toBe(false); expect(error.message).toBeTruthy();
    await expect(page.locator('app-coach-program app-message').filter({ hasText: error.message })).toBeVisible();
    await expect(card).toBeVisible();
    expect(await snapshotProgram(f.programId)).toEqual(before);
  } finally {
    try { if (owner) await success(await owner.delete(API_ENDPOINTS.programs.myById(f.programId)), 'Owner fixture history cleanup'); }
    finally { try { await cleanupAuditFixture(coach, f); } finally { await owner?.dispose(); await coach.dispose(); } }
  }
});
