import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { anotherCoachClientUserId, apiFor, closeDb, currentUserId, db, dbOne, login, rejected, success } from '../../helpers/e2e-next-3-helpers';
import { assign, attach, cleanupAuditFixture, createAuditFixture, snapshotProgram } from '../../helpers/audit-fixture';

test.describe.configure({ timeout: 90_000 });
test.afterAll(closeDb);
test('USER ownership: own workout readable, foreign program/workout/member/sets inaccessible and unchanged', async ({ page }) => {
  await login(page,'coach'); const coachApi=await apiFor(page);
  const own=await createAuditFixture(coachApi);
  const foreign=await createAuditFixture(coachApi);
  let userApi: Awaited<ReturnType<typeof apiFor>> | undefined;
  try {
    const me=await currentUserId(); const other=await anotherCoachClientUserId(me);
    const ownOccurrence=await attach(coachApi,own); const foreignOccurrence=await attach(coachApi,foreign);
    await assign(coachApi,own,me); await assign(coachApi,foreign,other);
    const ownUw=await dbOne('SELECT id FROM user_workouts WHERE program_workout_id=$1 AND user_id=$2',[ownOccurrence,me]);
    const foreignUw=await dbOne('SELECT id FROM user_workouts WHERE program_workout_id=$1 AND user_id=$2',[foreignOccurrence,other]);
    expect(ownUw).not.toBeNull(); expect(foreignUw).not.toBeNull();
    const set=await dbOne(`SELECT s.* FROM user_workout_exercise_sets s JOIN user_workout_exercises e ON e.id=s.user_workout_exercise_id WHERE e.user_workout_id=$1 ORDER BY s.id LIMIT 1`,[foreignUw!.id]);
    expect(set).not.toBeNull();
    const before=await snapshotProgram(foreign.programId);
    await login(page,'user'); userApi=await apiFor(page);
    await rejected(await userApi.get(API_ENDPOINTS.exercises.userWorkout(ownUw!.id)), 'Missing required language parameter', 400);
    await success(await userApi.get(API_ENDPOINTS.exercises.userWorkout(ownUw!.id), { params: { language: process.env.E2E_LANGUAGE ?? 'hu' } }),'Own user workout');
    await rejected(await userApi.get(API_ENDPOINTS.programs.byId(foreign.programId)),'Foreign assigned program',403);
    await rejected(await userApi.get(API_ENDPOINTS.exercises.userWorkout(foreignUw!.id), { params: { language: process.env.E2E_LANGUAGE ?? 'hu' } }),'Foreign workout',403);
    await rejected(await userApi.get(`/api/members/users/${other}`),'Foreign member',403);
    await rejected(await userApi.put(API_ENDPOINTS.userWorkoutExerciseSets.byId(set!.id),{data:{setNumber:set!.set_number,targetRepetitions:set!.target_repetitions,targetWeightKg:set!.target_weight_kg,actualRepetitions:set!.target_repetitions,actualWeightKg:set!.target_weight_kg,completed:true,notes:'must not be stored'}}),'Foreign set update',403);
    await rejected(await userApi.delete(API_ENDPOINTS.userWorkoutExerciseSets.byId(set!.id)),'Foreign set deletion',403);
    expect(await snapshotProgram(foreign.programId)).toEqual(before);
    expect(await dbOne('SELECT * FROM user_workout_exercise_sets WHERE id=$1',[set!.id])).toEqual(set);
    expect((await db().query('SELECT id FROM user_workouts WHERE program_id=$1',[own.programId])).rows).toHaveLength(1);
  } finally {
    const errors:unknown[]=[];
    for(const f of [foreign,own]) { try { await cleanupAuditFixture(coachApi,f); } catch(error){errors.push(error);} }
    if(userApi) await userApi.dispose(); await coachApi.dispose();
    if(errors.length) throw new AggregateError(errors,'Ownership fixture cleanup');
  }
});

test('COACH ownership: foreign program and occurrence cannot be read, modified, assigned or deleted', async ({ page }) => {
  await login(page,'coach'); const api=await apiFor(page);
  try {
    const foreign=await dbOne<{program_id:number;id:number;workout_id:number;day_index:number}>(`
      SELECT pw.program_id,pw.id,pw.workout_id,pw.day_index
      FROM program_workouts pw JOIN programs p ON p.id=pw.program_id JOIN coaches c ON c.id=p.coach_id
      WHERE c.name<>$1 ORDER BY pw.id LIMIT 1`,[process.env.E2E_COACH_USERNAME]);
    expect(foreign,'Ownership fixture requires another coach program occurrence in the test DB').not.toBeNull();
    const before=await snapshotProgram(foreign!.program_id);
    await rejected(await api.get(API_ENDPOINTS.programs.byId(foreign!.program_id)),'Foreign coach program read',403);
    await rejected(await api.put(API_ENDPOINTS.programWorkouts.updateById(foreign!.id),{data:{dayIndex:foreign!.day_index}}),'Foreign coach occurrence update',403);
    await rejected(await api.delete(API_ENDPOINTS.programWorkouts.deleteById(foreign!.id)),'Foreign coach occurrence delete',403);
    await rejected(await api.delete(API_ENDPOINTS.programs.coachDelete(foreign!.program_id)),'Foreign coach program delete',403);
    await rejected(await api.post(API_ENDPOINTS.programs.assign,{data:{programId:foreign!.program_id,userId:await currentUserId()}}),'Foreign coach program assignment',403);
    expect(await snapshotProgram(foreign!.program_id)).toEqual(before);
  } finally { await api.dispose(); }
});
