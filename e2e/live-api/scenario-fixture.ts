import { test as base, expect, apiFor, ok, API, environment } from './live-fixture';
import { request, type APIRequestContext, type Page } from '@playwright/test';
import { randomUUID } from 'node:crypto';
export { expect, ok, API, environment };
export const unique = (prefix: string) => `${prefix}_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
export const date = (offset = 0) => { const d = new Date(); d.setDate(d.getDate() + offset); return new Intl.DateTimeFormat('sv-SE', { timeZone: 'Europe/Budapest' }).format(d); };
export type Actor = { id: number; username: string; password: string; email: string; role: 'coach' | 'user'; api: APIRequestContext };
export async function credentials(username: string, password: string, apiURL = API) {
  const api = await request.newContext({ baseURL: apiURL });
  try { const body = await ok(await api.post('/api/auth/login', { data: { username, password } }));
    return { token: body.data.accessToken as string, api: await request.newContext({ baseURL: apiURL, extraHTTPHeaders: { Authorization: `Bearer ${body.data.accessToken}` } }) };
  } finally { await api.dispose(); }
}
export async function actor(admin: APIRequestContext, role: 'coach' | 'user', coachId?: number, apiURL = API): Promise<Actor> {
  const username = unique(role), password = 'Scenario-password-123!', email = `${username}@example.test`;
  const roles = (await ok(await admin.get('/api/roles'))).data;
  const roleId = roles.find((r: any) => r.name === role.toUpperCase()).id;
  await ok(await admin.post('/api/members', { data: { type: role, ...(role === 'coach' ? { name: username } : { username }), email, password, roleIds: [roleId], ...(coachId ? { coachId } : {}) } }));
  const auth = await credentials(username, password, apiURL);
  const id = JSON.parse(Buffer.from(auth.token.split('.')[1], 'base64url').toString()).id;
  expect(id).toBeGreaterThan(0); return { id, username, password, email, role, api: auth.api };
}
export async function signIn(page: Page, who: Pick<Actor, 'username' | 'password' | 'role'>) {
  await page.goto('/login'); await page.locator('#login-username').fill(who.username); await page.locator('#login-password').fill(who.password);
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/web/login' && r.request().method() === 'POST');
  await page.locator('app-login button[type=submit]').click(); expect((await response).status()).toBe(200);
  await expect(page).toHaveURL(new RegExp(`/${who.role}/dashboard$`));
}
export async function result(api: APIRequestContext, path: string) { return (await ok(await api.get(path))).data; }
export async function save(api: APIRequestContext, method: 'post' | 'put' | 'patch' | 'delete', path: string, data?: any) { return (await ok(await api[method](path, data === undefined ? {} : { data }))).data; }
export async function plan(coach: Actor, user: Actor, options: { start?: string; days?: number[]; exercises?: number; sets?: number; duration?: number; name?: string } = {}) {
  const name = options.name ?? unique('Program'), start = options.start ?? date(), days = options.days ?? [1, 2];
  const workout = await save(coach.api, 'post', '/api/workouts?language=hu', { name: `${name} edzés`, description: 'Live scenario', workoutDate: start, durationMinutes: 45, intensityLevel: 'MEDIUM' });
  const exercises: any[] = [];
  for (let i = 0; i < (options.exercises ?? 2); i++) {
    const exercise = await save(coach.api, 'post', '/api/exercises?language=hu', { name: `${name} gyakorlat ${i + 1}`, bodyPart: i ? 'back' : 'legs', equipment: i ? 'dumbbell' : 'barbell' });
    await save(coach.api, 'post', `/api/workout-exercises?workoutId=${workout.id}&exerciseId=${exercise.id}`);
    await save(coach.api, 'put', `/api/workout-exercises/prescription?workoutId=${workout.id}&exerciseId=${exercise.id}`, { sets: options.sets ?? 2, repetitions: 10, restSeconds: 0 });
    exercises.push({ ...exercise, name: `${name} gyakorlat ${i + 1}` });
  }
  const id = await save(coach.api, 'post', '/api/user-programs', { programName: name, programDescription: 'Live scenario', durationDays: options.duration ?? 14, startDate: start, languageCode: 'hu', difficultyLevel: 'BEGINNER', workouts: [] });
  const links = [];
  for (const dayIndex of days) links.push(await save(coach.api, 'post', '/api/program-workouts', { programId: id, workoutId: workout.id, dayIndex }));
  await save(coach.api, 'post', '/api/programs/assign', { userId: user.id, programId: id });
  const scheduled = (await result(user.api, '/api/user-workout-exercises/scheduled')).filter((w: any) => w.program_id === id).sort((a: any, b: any) => a.scheduled_at.localeCompare(b.scheduled_at));
  expect(scheduled).toHaveLength(days.length);
  return { id, name, start, workout, exercises, links, scheduled };
}
export async function detail(user: Actor, id: number) { return result(user.api, `/api/exercises/user-workouts/${id}?language=hu`); }
export const setsOf = (detail: any) => detail.exercises.flatMap((e: any) => e.userWorkoutExerciseSets);
export async function complete(user: Actor, id: number, weight = 25) {
  const before = await detail(user, id);
  for (const set of setsOf(before)) await save(user.api, 'put', `/api/user-workout-exercise-sets/${set.id}`, { completed: true, actualRepetitions: 8, actualWeightKg: weight });
  expect((await detail(user, id)).completed).toBe(true);
}
export const detailURL = (p: Awaited<ReturnType<typeof plan>>, index = 0, exercise = 0) => `/user/workouts/${p.workout.id}/exercises/${p.exercises[exercise].id}?programId=${p.id}&userWorkoutId=${p.scheduled[index].user_workout_id}&programWorkoutId=${p.scheduled[index].program_workout_id}`;
export function response(page: Page, method: string, path: string) { return page.waitForResponse(r => r.request().method() === method && new URL(r.url()).pathname === path); }
export const draft = (exerciseId: number, name = unique('Saját')) => ({ name, description: 'Valódi saját edzés', durationDays: 7, startDate: null, difficultyLevel: null, languageCode: 'hu', workouts: [{ dayIndex: 1, name: 'Első nap', description: null, exercises: [{ exerciseId, sets: 1, repetitions: 10, restSeconds: 0, notes: null }] }] });
export const test = base.extend<{ actors: { admin: APIRequestContext; coach: Actor; user: Actor; outsider: Actor; create: (role: 'coach' | 'user', coachId?: number) => Promise<Actor> } }>({
  actors: async ({}, use) => {
    const admin = await apiFor('admin'), created: Actor[] = [];
    const create = async (role: 'coach' | 'user', coachId?: number) => { const a = await actor(admin, role, coachId); created.push(a); return a; };
    try { const coach = await create('coach'), user = await create('user', coach.id), outsider = await create('user'); await use({ admin, coach, user, outsider, create }); }
    finally { for (const a of created) await a.api.dispose(); await admin.dispose(); }
  },
});

/** Verify the real blur autosave before exercising the separate completion action. */
export async function recordActuals(page: Page, repetitions: number, weight: number) {
  await page.locator('#user-set-actual-repetitions').fill(String(repetitions));
  await page.locator('#user-set-actual-weight').fill(String(weight));
  const saved = page.waitForResponse(r => r.request().method() === 'PATCH'
    && new URL(r.url()).pathname === '/api/exercises/user-workouts/sets/completed'
    && r.request().postDataJSON()?.actualWeightKg === weight
    && r.request().postDataJSON()?.completed === false);
  await page.locator('#user-set-actual-weight').press('Tab');
  expect((await saved).status()).toBe(200);
}
