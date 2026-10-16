import { test, expect } from '@playwright/test';
import { authenticate } from '../helpers/auth-session';
import { API_ENDPOINTS as E } from '../helpers/api-endpoints';
import { apiFor, currentUserId, anotherCoachClientUserId, dbOne, closeDb } from '../helpers/e2e-next-3-helpers';
import { createAuditFixture, cleanupAuditFixture, attach, assign, snapshotProgram } from '../helpers/audit-fixture';
test.describe.configure({timeout:120_000});test.afterAll(closeDb);
test('IDOR: USER cannot read foreign program or alter foreign workout set',async({browser})=>{
 const coachContext=await browser.newContext(); const userContext=await browser.newContext();
 let coachApi:Awaited<ReturnType<typeof apiFor>>|undefined; let userApi:Awaited<ReturnType<typeof apiFor>>|undefined;
 let own:Awaited<ReturnType<typeof createAuditFixture>>|undefined;let foreign:Awaited<ReturnType<typeof createAuditFixture>>|undefined;
 try{
  const coachPage=await coachContext.newPage();await authenticate(coachPage,'coach');coachApi=await apiFor(coachPage);
  own=await createAuditFixture(coachApi);foreign=await createAuditFixture(coachApi);
  const ownId=await currentUserId();const otherId=await anotherCoachClientUserId(ownId);
  await attach(coachApi,own);await attach(coachApi,foreign);await assign(coachApi,own,ownId);await assign(coachApi,foreign,otherId);
  const set=await dbOne<{id:number}>(`SELECT s.id FROM user_workout_exercise_sets s JOIN user_workout_exercises e ON e.id=s.user_workout_exercise_id JOIN user_workouts uw ON uw.id=e.user_workout_id WHERE uw.program_id=$1 AND uw.user_id=$2 ORDER BY s.id LIMIT 1`,[foreign.programId,otherId]);
  expect(set,'Foreign user must have an assigned set').not.toBeNull();
  const before=await dbOne(`SELECT * FROM user_workout_exercise_sets WHERE id=$1`,[set!.id]);const programBefore=await snapshotProgram(foreign.programId);
  const userPage=await userContext.newPage();await authenticate(userPage,'user');userApi=await apiFor(userPage);
  const read=await userApi.get(E.programs.byId(foreign.programId));expect(read.status()).toBe(403);
  const write=await userApi.put(E.userWorkoutExerciseSets.byId(set!.id),{data:{completed:true,actualRepetitions:8,actualWeightKg:90,notes:'E2E_UNAUTHORIZED'}});
  expect(write.status()).toBe(403);
  expect(await dbOne('SELECT * FROM user_workout_exercise_sets WHERE id=$1',[set!.id])).toEqual(before);
  expect(await snapshotProgram(foreign.programId)).toEqual(programBefore);
  console.log('[API-SECURITY IDOR]',{foreignProgramId:foreign.programId,foreignSetId:set!.id,readStatus:read.status(),writeStatus:write.status(),databaseUnchanged:true});
 }finally{
  const errors:unknown[]=[];
  if(coachApi){for(const f of [foreign,own])if(f){try{await cleanupAuditFixture(coachApi,f);}catch(e){errors.push(e);}}}
  if(userApi)await userApi.dispose();if(coachApi)await coachApi.dispose();await userContext.close();await coachContext.close();
  if(errors.length)throw new AggregateError(errors,'IDOR cleanup');
 }
});
