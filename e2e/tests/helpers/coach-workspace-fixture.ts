import { test as base, expect, type APIRequestContext, type Page } from '@playwright/test';
import { API_ENDPOINTS as E } from './api-endpoints';
import { authenticate } from './auth-session';
import { apiFor, currentUserId, db, dbOne, login, success, closeDb, deleteProgram, deleteWorkout, deleteExercise } from './e2e-next-3-helpers';
import { assign, attach, cleanupAuditFixture, createAuditFixture, type AuditFixture } from './audit-fixture';

export type WorkspaceFixture = AuditFixture & { api: APIRequestContext; userId: number; name: string; extraPrograms: number[]; extraWorkouts: number[]; extraExercises: number[] };
export const test = base.extend<{ workspace: WorkspaceFixture }>({
  workspace: async ({ page }, use) => {
    await page.addInitScript(() => { localStorage.setItem('language', 'hu'); localStorage.setItem('lang', 'hu'); });
    await login(page, 'coach'); const api = await apiFor(page);
    let f: WorkspaceFixture | undefined;
    try {
      const fixture = await createAuditFixture(api);
      f = { ...fixture, api, userId: 0, name: '', extraPrograms: [], extraWorkouts: [], extraExercises: [] };
      f.userId = await currentUserId();
      const owner = await dbOne('SELECT u.id FROM users u JOIN coaches c ON c.id=u.coach_id WHERE u.id=$1 AND c.name=$2', [f.userId, process.env.E2E_COACH_USERNAME]);
      expect(owner, 'E2E_USER must be a client of E2E_COACH').not.toBeNull();
      await attach(api, f, 1); await attach(api, f, 8);
      await assign(api, f, f.userId);
      const p = await success(await api.get(E.programs.byId(f.programId), { params: { language: 'hu' } }), 'Read workspace program');
      f.name = p.data.programName;
      await use(f);
    } finally {
      const errors: unknown[] = [];
      if (f) {
        // Owner endpoint removes only this fixture's personal history, including sets completed by the coach.
        const cleanupPage = await page.context().newPage();
        let ownerApi: APIRequestContext | undefined;
        try {
          await authenticate(cleanupPage, 'user'); ownerApi = await apiFor(cleanupPage);
          for (const id of [f.programId, ...f.extraPrograms]) {
            const row = await dbOne('SELECT id FROM user_programs WHERE user_id=$1 AND program_id=$2', [f.userId, id]);
            if (row) await success(await ownerApi.delete(E.programs.myById(id)), 'Clean fixture personal history');
          }
        } catch (e) { errors.push(e); }
        finally { await ownerApi?.dispose(); await cleanupPage.close(); }
        for (const id of f.extraPrograms.reverse()) { try { await deleteProgram(api, id); } catch (e) { errors.push(e); } }
        for (const id of f.extraWorkouts.reverse()) { try { await deleteWorkout(api, id); } catch (e) { errors.push(e); } }
        try { await cleanupAuditFixture(api, f); } catch (e) { errors.push(e); }
        for (const id of f.extraExercises.reverse()) { try { await deleteExercise(api, id); } catch (e) { errors.push(e); } }
      }
      await api.dispose();
      if (errors.length) throw new AggregateError(errors, 'Workspace fixture cleanup failed');
    }
  },
});
export { expect };
export async function openWorkspace(page: Page, f: WorkspaceFixture) {
  await page.goto(`/coach/programs/${f.programId}`);
  await expect(page.locator('app-coach-program-editor [name=programName]')).toHaveValue(f.name);
}
export async function openClient(page: Page, f: WorkspaceFixture) {
  const w = await dbOne<{ id: number }>('SELECT id FROM user_workouts WHERE program_id=$1 AND user_id=$2 ORDER BY id LIMIT 1', [f.programId, f.userId]);
  expect(w).not.toBeNull();
  await page.goto(`/coach/clients/${f.userId}?program=${f.programId}&workout=${w!.id}`);
  await expect(page.locator('app-coach-client-detail article').first().getByRole('spinbutton').first()).toBeVisible();
  return w!.id;
}
export async function fixtureSets(f: WorkspaceFixture) {
  return (await db().query(`SELECT s.* FROM user_workout_exercise_sets s JOIN user_workout_exercises e ON e.id=s.user_workout_exercise_id
    JOIN user_workouts w ON w.id=e.user_workout_id WHERE w.program_id=$1 AND w.user_id=$2 ORDER BY w.id,e.id,s.set_number`, [f.programId, f.userId])).rows;
}
export { db, dbOne, success, closeDb };
