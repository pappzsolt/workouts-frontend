import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { apiFor, closeDb, dbOne, login, rejected, success } from '../../helpers/e2e-next-3-helpers';
import { attach, cleanupAuditFixture, createAuditFixture } from '../../helpers/audit-fixture';

test.describe.configure({ timeout: 90_000 });
test.afterAll(closeDb);
test('Workout/exercise relation persists and locks after program attachment', async ({ page }) => {
  await login(page, 'coach');
  const api = await apiFor(page);
  const f = await createAuditFixture(api);
  try {
    const before = await dbOne('SELECT * FROM workout_exercises WHERE workout_id=$1 AND exercise_id=$2', [f.workoutId,f.exerciseId]);
    expect(before).not.toBeNull();
    expect(before!.sets).toBeGreaterThan(0);
    expect(before!.repetitions).toBeGreaterThan(0);
    const body = await success(await api.get(API_ENDPOINTS.exercises.workout(f.workoutId)), 'Read workout exercises');
    expect(body.data.exercises.map((row: any) => Number(row.exercise.id))).toContain(f.exerciseId);
    await attach(api, f);
    await rejected(await api.delete(API_ENDPOINTS.workoutExercises.base, { params: { workoutId: f.workoutId, exerciseId: f.exerciseId } }), 'Assigned workout structure locked', 400);
    await rejected(await api.delete(API_ENDPOINTS.exercises.byId(f.exerciseId)), 'Referenced exercise is a business conflict', 409);
    expect(await dbOne('SELECT * FROM workout_exercises WHERE workout_id=$1 AND exercise_id=$2', [f.workoutId,f.exerciseId])).toEqual(before);
  } finally { try { await cleanupAuditFixture(api,f); } finally { await api.dispose(); } }
});
