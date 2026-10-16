import { test, expect } from '@playwright/test';
import { authenticate } from '../helpers/auth-session';
import { API_ENDPOINTS as E } from '../helpers/api-endpoints';
import { apiFor, dbOne, closeDb } from '../helpers/e2e-next-3-helpers';
import { createAuditFixture, cleanupAuditFixture, snapshotProgram } from '../helpers/audit-fixture';
test.afterAll(closeDb);
test('WRITES: USER cannot create/delete coach workout or edit program',async({browser})=>{
 const coachCtx=await browser.newContext();const userCtx=await browser.newContext();let coachApi:Awaited<ReturnType<typeof apiFor>>|undefined;let userApi:Awaited<ReturnType<typeof apiFor>>|undefined;let fixture:Awaited<ReturnType<typeof createAuditFixture>>|undefined;
 try{
  const coachPage=await coachCtx.newPage();await authenticate(coachPage,'coach');coachApi=await apiFor(coachPage);fixture=await createAuditFixture(coachApi);
  const before=await snapshotProgram(fixture.programId);const workoutBefore=await dbOne('SELECT * FROM workouts WHERE id=$1',[fixture.workoutId]);
  const userPage=await userCtx.newPage();await authenticate(userPage,'user');userApi=await apiFor(userPage);
  const marker=`E2E_UNAUTHORIZED_${Date.now()}`;
  const attempts=[['POST',E.workouts.base,()=>userApi!.post(E.workouts.base,{data:{name:marker,workoutDate:'2035-01-01',durationMinutes:60,intensityLevel:'High'}})],['PUT',E.programs.byId(fixture.programId),()=>userApi!.put(E.programs.byId(fixture!.programId),{data:{name:marker,startDate:'2035-01-01'}})],['DELETE',E.workouts.byId(fixture.workoutId),()=>userApi!.delete(E.workouts.byId(fixture!.workoutId))]] as const;
  for(const [method,path,send] of attempts){const response=await send();console.log('[API-SECURITY WRITE]',{method,path,status:response.status()});expect(response.status()).toBe(403);}
  expect(await dbOne('SELECT * FROM workouts WHERE id=$1',[fixture.workoutId])).toEqual(workoutBefore);
  expect(await snapshotProgram(fixture.programId)).toEqual(before);
  const created=await dbOne(`SELECT id FROM workout_translations WHERE name=$1`,[marker]);expect(created).toBeNull();
 }finally{const errors:unknown[]=[];if(coachApi&&fixture)try{await cleanupAuditFixture(coachApi,fixture);}catch(e){errors.push(e);}if(userApi)await userApi.dispose();if(coachApi)await coachApi.dispose();await userCtx.close();await coachCtx.close();if(errors.length)throw new AggregateError(errors,'Unauthorized-write cleanup');}
});
