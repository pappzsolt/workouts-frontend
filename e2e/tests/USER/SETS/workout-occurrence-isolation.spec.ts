import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { apiFor, closeDb, currentUserId, db, dbOne, login, success } from '../../helpers/e2e-next-3-helpers';
import { assign, attach, cleanupAuditFixture, createAuditFixture } from '../../helpers/audit-fixture';
import { setTestLanguage } from '../../helpers/read-only';

test.afterAll(closeDb);
test('USER SETS: completing one repeated workout occurrence leaves the other occurrence unchanged', async ({ page }) => {
  await setTestLanguage(page);
  await login(page, 'coach');
  const coach = await apiFor(page);
  const fixture = await createAuditFixture(coach);
  let owner: Awaited<ReturnType<typeof apiFor>> | undefined;
  try {
    const userId = await currentUserId();
    const occurrences = [await attach(coach, fixture, 1), await attach(coach, fixture, 2)];
    await assign(coach, fixture, userId);
    const workouts = (await db().query<{ id: number; program_workout_id: number }>('SELECT id,program_workout_id FROM user_workouts WHERE user_id=$1 AND program_id=$2 ORDER BY program_workout_id', [userId, fixture.programId])).rows;
    expect(workouts).toHaveLength(2);
    expect(workouts.map(row => row.program_workout_id)).toEqual(occurrences);
    expect(workouts[0].id).not.toBe(workouts[1].id);
    const snapshot = async (id: number) => {
      const workout = await dbOne('SELECT * FROM user_workouts WHERE id=$1', [id]);
      const exercises = (await db().query('SELECT * FROM user_workout_exercises WHERE user_workout_id=$1 ORDER BY id', [id])).rows;
      const sets = (await db().query('SELECT s.* FROM user_workout_exercise_sets s JOIN user_workout_exercises e ON e.id=s.user_workout_exercise_id WHERE e.user_workout_id=$1 ORDER BY s.id', [id])).rows;
      return { workout, exercises, sets };
    };
    const secondBefore = await snapshot(workouts[1].id);
    const firstBefore = await snapshot(workouts[0].id);
    expect(firstBefore.exercises).toHaveLength(1);
    expect(secondBefore.exercises).toHaveLength(1);
    expect(firstBefore.sets.length).toBeGreaterThan(0);
    expect(secondBefore.sets).toHaveLength(firstBefore.sets.length);
    await login(page, 'user');
    owner = await apiFor(page);
    const secondApiBefore = await success(await owner.get(API_ENDPOINTS.userWorkoutExerciseSets.byExercise(secondBefore.exercises[0].id)), 'Second occurrence baseline');
    for (const set of firstBefore.sets) {
      await success(await owner.put(API_ENDPOINTS.userWorkoutExerciseSets.byId(set.id), {
        data: { actualRepetitions: 9, actualWeightKg: 22.5, completed: true },
      }), 'Complete set only in first occurrence');
    }
    const completed = await snapshot(workouts[0].id);
    expect(completed.workout.completed).toBe(true);
    expect(completed.exercises[0].completed).toBe(true);
    expect(Number(completed.exercises[0].sets_done)).toBe(firstBefore.sets.length);
    for (let i = 0; i < completed.sets.length; i++) {
      expect(completed.sets[i].completed).toBe(true);
      expect(completed.sets[i].completed_at).not.toBeNull();
      expect(Number(completed.sets[i].actual_repetitions)).toBe(9);
      expect(Number(completed.sets[i].actual_weight_kg)).toBe(22.5);
      expect(completed.sets[i].target_repetitions).toBe(firstBefore.sets[i].target_repetitions);
      expect(completed.sets[i].target_weight_kg).toBe(firstBefore.sets[i].target_weight_kg);
    }
    expect(await snapshot(workouts[1].id)).toEqual(secondBefore);
    const secondApiAfter = await success(await owner.get(API_ENDPOINTS.userWorkoutExerciseSets.byExercise(secondBefore.exercises[0].id)), 'Second occurrence remains unchanged');
    expect(secondApiAfter.data).toEqual(secondApiBefore.data);
    const firstApi = await success(await owner.get(API_ENDPOINTS.userWorkoutExerciseSets.byExercise(firstBefore.exercises[0].id)), 'First occurrence completion persisted');
    expect(firstApi.data.every((set: any) => set.completed === true)).toBe(true);
  } finally {
    try {
      if (owner) await success(await owner.delete(API_ENDPOINTS.programs.myById(fixture.programId)), 'Owner removes only fixture execution history');
    } finally {
      try { await cleanupAuditFixture(coach, fixture); }
      finally { await owner?.dispose(); await coach.dispose(); }
    }
  }
});
