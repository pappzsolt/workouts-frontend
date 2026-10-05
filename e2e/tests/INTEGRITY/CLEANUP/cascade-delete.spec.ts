import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { apiFor, closeDb, currentUserId, db, dbCount, dbOne, deleteProgram, login, rejected, success } from '../../helpers/e2e-next-3-helpers';
import { assign, attach, cleanupAuditFixture, createAuditFixture, snapshotProgram } from '../../helpers/audit-fixture';

test.describe.configure({ timeout: 90_000 });
test.afterAll(closeDb);
test('Program delete clears pending descendants and preserves workout/exercise templates', async ({ page }) => {
  await login(page,'coach');
  const api = await apiFor(page);
  const f = await createAuditFixture(api);
  let deleted = false;
  try {
    await attach(api,f);
    await assign(api,f,await currentUserId());
    const ids = (await db().query(`SELECT e.id FROM user_workout_exercises e JOIN user_workouts w ON w.id=e.user_workout_id WHERE w.program_id=$1`,[f.programId])).rows.map(row=>row.id);
    expect(ids.length).toBeGreaterThan(0);
    expect(await dbCount('SELECT count(*) AS count FROM user_workout_exercise_sets WHERE user_workout_exercise_id=ANY($1::integer[])',[ids])).toBeGreaterThan(0);
    await deleteProgram(api,f.programId);
    deleted = true;
    for (const table of ['program_workouts','user_programs','user_workouts']) expect(await dbCount(`SELECT count(*) AS count FROM ${table} WHERE program_id=$1`,[f.programId])).toBe(0);
    expect(await dbCount('SELECT count(*) AS count FROM user_workout_exercises WHERE id=ANY($1::integer[])',[ids])).toBe(0);
    expect(await dbCount('SELECT count(*) AS count FROM user_workout_exercise_sets WHERE user_workout_exercise_id=ANY($1::integer[])',[ids])).toBe(0);
    expect(await dbCount('SELECT count(*) AS count FROM workouts WHERE id=$1',[f.workoutId])).toBe(1);
    expect(await dbCount('SELECT count(*) AS count FROM exercises WHERE id=$1',[f.exerciseId])).toBe(1);
  } finally {
    try {
      if (deleted) {
        const {deleteWorkout,deleteExercise}=await import('../../helpers/e2e-next-3-helpers');
        await deleteWorkout(api,f.workoutId); await deleteExercise(api,f.exerciseId);
      } else await cleanupAuditFixture(api,f);
    } finally { await api.dispose(); }
  }
});

test('Historical set blocks occurrence and program delete with 409 and transaction rollback', async ({ page }) => {
  await login(page,'coach');
  const coachApi = await apiFor(page);
  const f = await createAuditFixture(coachApi);
  let userApi: Awaited<ReturnType<typeof apiFor>> | undefined;
  let setId: number | undefined;
  let original: any;
  try {
    const occurrence = await attach(coachApi,f);
    await attach(coachApi,f,5); // Pending descendants must also survive the rejected program-delete transaction.
    await assign(coachApi,f,await currentUserId());
    original = await dbOne(`SELECT s.* FROM user_workout_exercise_sets s JOIN user_workout_exercises e ON e.id=s.user_workout_exercise_id JOIN user_workouts w ON w.id=e.user_workout_id WHERE w.program_workout_id=$1 ORDER BY s.id LIMIT 1`,[occurrence]);
    expect(original).not.toBeNull();
    setId = original.id;
    await login(page,'user'); userApi = await apiFor(page);
    const payload = (completed:boolean) => ({setNumber:original.set_number,targetRepetitions:original.target_repetitions,targetWeightKg:original.target_weight_kg,actualRepetitions:completed?original.target_repetitions:null,actualWeightKg:completed?original.target_weight_kg:null,completed,notes:original.notes});
    await success(await userApi.put(API_ENDPOINTS.userWorkoutExerciseSets.byId(setId!),{data:payload(true)}),'Complete real user set');
    const before = await snapshotProgram(f.programId);
    const beforeSets = (await db().query('SELECT * FROM user_workout_exercise_sets WHERE id=$1',[setId])).rows;
    await rejected(await coachApi.delete(API_ENDPOINTS.programWorkouts.deleteById(occurrence)),'Historical occurrence deletion',409);
    expect(await snapshotProgram(f.programId)).toEqual(before);
    await rejected(await coachApi.delete(API_ENDPOINTS.programs.coachDelete(f.programId)),'Historical program deletion',409);
    expect(await snapshotProgram(f.programId)).toEqual(before);
    expect((await db().query('SELECT * FROM user_workout_exercise_sets WHERE id=$1',[setId])).rows).toEqual(beforeSets);
  } finally {
    try {
      if (setId !== undefined && userApi) {
        // Owner removes only this test program's history through the actual user endpoint.
        await success(await userApi.delete(API_ENDPOINTS.programs.myById(f.programId)), 'Owner fixture history cleanup');
      }
      await cleanupAuditFixture(coachApi,f);
    } finally { if(userApi) await userApi.dispose(); await coachApi.dispose(); }
  }
});
