import { expectRejected as rejected } from '../../helpers/expect-rejected';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { authenticateAndOpen, getAuthenticatedAccessToken } from '../../helpers/auth-session';

import { expect, request, test, type APIRequestContext, type Page } from '@playwright/test';
import { Pool } from 'pg';

const BASE_API_URL = process.env.E2E_API_URL ?? 'http://localhost:8080';
const LANGUAGE = process.env.E2E_LANGUAGE ?? 'hu';
let pool: Pool | undefined;

function db(): Pool {
  if (!pool) {
    const required = (name: string) => {
      const v = process.env[name];
      if (!v || v === 'CHANGE_ME') throw new Error(`Hiányzó E2E DB konfiguráció: ${name}`);
      return v;
    };
    pool = new Pool({
      host: required('E2E_DB_HOST'),
      port: Number(process.env.E2E_DB_PORT ?? 5432),
      database: required('E2E_DB_NAME'),
      user: required('E2E_DB_USER'),
      password: required('E2E_DB_PASSWORD'),
      ssl: process.env.E2E_DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
      max: 2,
    });
  }
  return pool;
}
function suffix() { return `${Date.now()}-${Math.floor(Math.random()*1_000_000)}`; }
async function dbOne<T=any>(sql:string, params:unknown[]=[]):Promise<T|null>{ return (await db().query<T>(sql,params)).rows[0]??null; }
async function dbCount(sql:string,params:unknown[]=[]):Promise<number>{ const r=await dbOne<{count:string}>(sql,params); return Number(r?.count??0); }

async function login(page:Page, role:'coach'|'user'):Promise<void>{
  await authenticateAndOpen(page, role);
}
async function apiFor(page:Page):Promise<APIRequestContext>{
  const token=getAuthenticatedAccessToken(page);
  if(!token) throw new Error('E2E: accessToken nem található.');
  return request.newContext({baseURL:BASE_API_URL,extraHTTPHeaders:{Authorization:`Bearer ${token}`}});
}
async function json(response:any){const text=await response.text(); let body:any=null; if(text) body=JSON.parse(text); return {text,body};}
async function success(response:any,label:string){const {text,body}=await json(response); expect(response.ok(),`${label}: HTTP ${response.status()} ${text}`).toBeTruthy(); expect(body?.success??true,`${label}: success=false: ${text}`).toBeTruthy(); return body;}


async function coachUserId():Promise<number>{
  const username=process.env.E2E_COACH_USERNAME;
  const r=await dbOne<{id:number}>(`SELECT u.id FROM public.users u JOIN public.coaches c ON c.id=u.coach_id WHERE c.name=$1 ORDER BY u.id LIMIT 1`,[username]);
  if(!r) throw new Error('A coachhoz tartozó teszt user nem található.');
  return Number(r.id);
}
async function createProgram(api:APIRequestContext,name:string):Promise<number>{
  const b=await success(await api.post(API_ENDPOINTS.userPrograms.base,{data:{userId:null,programName:name,programDescription:`E2E ${suffix()}`,durationDays:30,startDate:'2035-03-01',difficultyLevel:'intermediate',languageCode:LANGUAGE,workouts:null}}),'POST /api/user-programs');
  return Number(b.data);
}
async function createWorkout(api:APIRequestContext,name:string):Promise<number>{
  const b=await success(await api.post(API_ENDPOINTS.workouts.base,{params:{language:LANGUAGE},data:{name,description:`E2E ${suffix()}`,workoutDate:'2035-03-10',durationMinutes:60,intensityLevel:'High',dayIndex:1,done:false}}),'POST /api/workouts');
  return Number(b.data?.id);
}
async function deleteProgram(api:APIRequestContext,id:number){ await success(await api.delete(`${API_ENDPOINTS.programs.coachDelete(id)}`),`DELETE /api/programs/coach/${id}`); }
async function deleteWorkout(api:APIRequestContext,id:number){ const r=await api.delete(`${API_ENDPOINTS.workouts.byId(id)}`); if(!r.ok()) console.log(`Workout cleanup HTTP ${r.status()}: ${await r.text()}`); }

test.describe('Coach - Program ↔ User assignment comprehensive',()=>{
 test('ASSIGNMENT: create program → assign own user → assigned-users → duplicate idempotency → DB → user sees program',async({page})=>{
  await login(page,'coach'); const coachApi=await apiFor(page); const userId=await coachUserId();
  const programId=await createProgram(coachApi,`E2E USER ASSIGN ${suffix()}`);
  try{
   await success(await coachApi.post(API_ENDPOINTS.programs.assign,{data:{userId,programId}}),'POST /api/programs/assign');
   expect(await dbCount(`SELECT count(*)::text count FROM public.user_programs WHERE user_id=$1 AND program_id=$2`,[userId,programId])).toBe(1);
   const assigned=await success(await coachApi.get(`${API_ENDPOINTS.programs.assignedUsers(programId)}`),'GET assigned-users');
   expect((assigned.data??[]).map(Number)).toContain(userId);

   await success(await coachApi.post(API_ENDPOINTS.programs.assign,{data:{userId,programId}}),'POST duplicate');
   expect(await dbCount(`SELECT count(*)::text count FROM public.user_programs WHERE user_id=$1 AND program_id=$2`,[userId,programId])).toBe(1);

   await coachApi.dispose();
   await login(page,'user'); const userApi=await apiFor(page);
   const mine=await success(await userApi.get(`/api/programs/my/assigned?language=${LANGUAGE}`),'GET my assigned programs');
   expect((mine.data??[]).some((p:any)=>Number(p.id??p.programId)===programId)).toBeTruthy();
   await userApi.dispose();
  }finally{
   // cleanup with a fresh coach session if the user session is active
   await login(page,'coach'); const cleanup=await apiFor(page);
   await deleteProgram(cleanup,programId);
   expect(await dbCount(`SELECT count(*)::text count FROM public.user_programs WHERE program_id=$1`,[programId])).toBe(0);
   await cleanup.dispose();
  }
 });
 test('NEGATIVE: coach nem rendelhet admin/nem saját usert',async({page})=>{
  await login(page,'coach'); const api=await apiFor(page);
  const target=await dbOne<{id:number}>(`SELECT u.id FROM public.users u JOIN public.user_roles ur ON ur.user_id=u.id JOIN public.roles r ON r.id=ur.role_id WHERE r.name='ADMIN' ORDER BY u.id LIMIT 1`);
  expect(target, 'The configured E2E database must contain an ADMIN user for the authorization check.').toBeTruthy();
  const programId=await createProgram(api,`E2E FORBIDDEN ASSIGN ${suffix()}`);
  try{
   await rejected(await api.post(API_ENDPOINTS.programs.assign,{data:{userId:Number(target!.id),programId}}),'foreign user assignment', 403);
   expect(await dbCount(`SELECT count(*)::text count FROM public.user_programs WHERE user_id=$1 AND program_id=$2`,[Number(target!.id),programId])).toBe(0);
  }finally{ await deleteProgram(api,programId); await api.dispose(); }
 });
});
