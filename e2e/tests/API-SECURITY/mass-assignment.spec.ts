import { test, expect } from '@playwright/test';
import { authenticate } from '../helpers/auth-session';
import { API_ENDPOINTS as E } from '../helpers/api-endpoints';
import { apiFor, dbOne, closeDb } from '../helpers/e2e-next-3-helpers';
import { createAuditFixture, cleanupAuditFixture } from '../helpers/audit-fixture';
test.afterAll(closeDb);
test('MASS ASSIGNMENT: workout update cannot redirect its ID to another record',async({page})=>{
 await authenticate(page,'coach');const api=await apiFor(page);
 let a:Awaited<ReturnType<typeof createAuditFixture>>|undefined;let b:Awaited<ReturnType<typeof createAuditFixture>>|undefined;
 try{
  a=await createAuditFixture(api);b=await createAuditFixture(api);
  const aBefore=await dbOne('SELECT * FROM workouts WHERE id=$1',[a.workoutId]);const bBefore=await dbOne('SELECT * FROM workouts WHERE id=$1',[b.workoutId]);
  const response=await api.put(E.workouts.byId(a.workoutId),{data:{id:b.workoutId,name:'E2E ID SPOOF',description:'should never save',workoutDate:'2035-02-02',durationMinutes:60,intensityLevel:'High'}});
  console.log('[API-SECURITY MASS ASSIGNMENT]',{path:E.workouts.byId(a.workoutId),injectedId:b.workoutId,status:response.status()});
  expect(response.status()).toBe(400);
  expect(await dbOne('SELECT * FROM workouts WHERE id=$1',[a.workoutId])).toEqual(aBefore);
  expect(await dbOne('SELECT * FROM workouts WHERE id=$1',[b.workoutId])).toEqual(bBefore);
  const marker=await dbOne('SELECT workout_id FROM workout_translations WHERE name=$1',['E2E ID SPOOF']);expect(marker).toBeNull();
 }finally{const failures:unknown[]=[];for(const f of [b,a])if(f)try{await cleanupAuditFixture(api,f);}catch(error){failures.push(error);}await api.dispose();if(failures.length)throw new AggregateError(failures,'Mass assignment cleanup');}
});
