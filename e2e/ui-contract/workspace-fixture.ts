import { test as base, expect, type Page } from '@playwright/test';

// UI contract suite ONLY: no real backend/database, no credentials, no production writes.
// Unknown API calls fail after each test instead of receiving a generic success.
export const TODAY = '2030-04-15'; // Monday, Europe/Budapest
export type Call = { method: string; path: string; query: URLSearchParams; body: any };
export function seed() {
  const exercises = Array.from({ length: 15 }, (_, i) => ({
    id: i + 1, name: `Exercise ${String(i + 1).padStart(2, '0')}`, description: `Description ${i + 1}`,
    bodyPart: i % 2 ? 'chest' : 'back', equipment: i % 2 ? 'barbell' : 'cable', primaryMuscles: 'latissimus',
    sets: 3, repetitions: 8, restSeconds: 90,
  }));
  const workouts = [
    { id: 10, name: 'Workout A', exercises: exercises.slice(0, 2) },
    { id: 20, name: 'Workout B', exercises: exercises.slice(2, 3) },
  ];
  const programs = Array.from({ length: 15 }, (_, i) => ({
    programId: i + 1, programName: `Program ${String(i + 1).padStart(2, '0')}`, programDescription: `Description ${i + 1}`,
    durationDays: 22, difficultyLevel: 'INTERMEDIATE',
    startDate: i === 1 ? '2029-01-01' : i === 2 ? '2031-01-01' : TODAY,
    endDate: i === 1 ? '2029-01-22' : i === 2 ? '2031-01-22' : '2030-05-06', workouts: [] as any[],
  }));
  const links = [{ id: 100, programId: 1, workoutId: 10, dayIndex: 1 }, { id: 101, programId: 1, workoutId: 20, dayIndex: 8 }];
  const clients = [
    { userId: 7, username: 'Alice', email: 'alice@example.test', age: 32, weight: 60, height: 170, gender: 'FEMALE', goals: 'Strength', lastCompletedAt: TODAY,
      programs: [{ programId: 1, name: 'Program 01', startDate: TODAY, endDate: '2030-05-06', totalWorkouts: 2, completedWorkouts: 1 }],
      workouts: [
        { userWorkoutId: 70, programId: 1, workoutId: 10, dayIndex: 1, workoutName: 'Workout A', programName: 'Program 01', scheduledAt: TODAY, completed: false, startedAt: null },
        { userWorkoutId: 71, programId: 1, workoutId: 20, dayIndex: 8, workoutName: 'Workout B', programName: 'Program 01', scheduledAt: '2030-04-22', completed: true, startedAt: null },
      ] },
    { userId: 8, username: 'Bob', email: 'bob@example.test', programs: [], workouts: [], lastCompletedAt: null },
  ];
  const rows = [70, 71].map((id, i) => ({ user_workout_id: id, workout_id: i ? 20 : 10, workout_name: i ? 'Workout B' : 'Workout A',
    scheduled_date: i ? '2030-04-22' : TODAY, program_day_index: i ? 8 : 1, program_workout_id: 100 + i,
    user_workout_exercise_id: 700 + i, workout_exercise_id: 800 + i, exercise_id: i + 1,
    exercise_name: `Exercise 0${i + 1}`, exercise_order: 0, workout_completed: !!i,
    sets_done: 3, sets_completed: 1, template_sets: 3, template_repetitions: 8, template_rest_seconds: 90,
    workout_feedback: 'Workout feedback', exercise_feedback: 'Exercise feedback',
  }));
  const sets: Record<number, any[]> = {};
  for (const exercise of [700, 701]) sets[exercise] = Array.from({ length: 3 }, (_, i) => ({
    id: exercise * 10 + i, userWorkoutExerciseId: exercise, setNumber: i + 1, targetRepetitions: 8,
    targetWeightKg: 20, restSeconds: 90, actualRepetitions: i === 2 ? 8 : null, actualWeightKg: i === 2 ? 20 : null,
    completed: i === 2, notes: i === 2 ? 'Done note' : null,
  }));
  return { exercises, workouts, programs, links, clients, rows, sets };
}
export type State = ReturnType<typeof seed>;
export class WorkspaceApi {
  state = seed();
  calls: Call[] = [];
  unknown: string[] = [];
  failures = new Map<string, number>();
  delay = 0;
  nextId = 200;
  fail(method: string, path: string, status = 500) { this.failures.set(`${method} ${path}`, status); }
  writes(path?: string) { return this.calls.filter(c => c.method !== 'GET' && (!path || c.path === path) && !c.path.includes('/auth/')); }
  program(id: number) {
    const p = this.state.programs.find(p => p.programId === id);
    if (!p) throw new Error(`Unknown fixture program ${id}`);
    return { ...p, workouts: this.state.links.filter(l => l.programId === id).map(l => {
      const w = this.state.workouts.find(w => w.id === l.workoutId)!;
      return { programWorkoutId: l.id, workoutId: w.id, name: w.name, exercises: w.exercises };
    }) };
  }
  async install(page: Page) {
    await page.clock.install({ time: new Date(`${TODAY}T10:00:00+02:00`) });
    await page.addInitScript(() => { localStorage.setItem('language', 'hu'); localStorage.setItem('lang', 'hu'); });
    await page.route('**/api/**', async route => {
      const request = route.request(); const url = new URL(request.url());
      const c: Call = { method: request.method(), path: url.pathname, query: url.searchParams, body: request.postData() ? request.postDataJSON() : null };
      if (c.method === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': url.origin, 'access-control-allow-credentials': 'true' } });
      this.calls.push(c);
      const failure = this.failures.get(`${c.method} ${c.path}`);
      if (this.delay && c.method !== 'GET') await new Promise(resolve => setTimeout(resolve, this.delay));
      if (failure) return route.fulfill({ status: failure, json: { success: false, message: 'Contract failure', data: null } });
      let data: any; const s = this.state; const id = Number(c.path.split('/').at(-1));
      const match = (method: string, path: string) => c.method === method && c.path === path;
      if (c.method === 'GET' && /^\/api\/user-workout-exercises\/user-programs\/\d+\/\d+\/export$/.test(c.path)) {
        return route.fulfill({ status: 200, contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
          headers: { 'access-control-expose-headers': 'Content-Disposition' }, body: Buffer.from('PK contract xlsx') });
      }
      if (c.path === '/api/auth/web/refresh') {
        const payload = Buffer.from(JSON.stringify({ sub: 'contract-coach', roles: 'ROLE_COACH', exp: 4102444800 })).toString('base64url');
        data = { accessToken: `eyJhbGciOiJIUzI1NiJ9.${payload}.contract` };
      } else if (match('GET', '/api/coach/overview')) {
        data = { from: c.query.get('from'), to: c.query.get('to'), clients: s.clients.filter(u => !c.query.has('userId') || u.userId === Number(c.query.get('userId'))).map(u => ({ ...u, workouts: u.workouts.filter(w => w.scheduledAt >= c.query.get('from')! && w.scheduledAt <= c.query.get('to')!) })) };
      } else if (match('GET', '/api/programs/coach')) data = s.programs.map(p => this.program(p.programId));
      else if (match('GET', '/api/coach/programs/assignment-counts')) data = { 1: 1 };
      else if (c.method === 'GET' && /^\/api\/programs\/\d+$/.test(c.path)) data = this.program(id);
      else if (match('GET', '/api/program-workouts')) data = s.links.filter(l => l.programId === Number(c.query.get('programId')));
      else if (c.method === 'GET' && /^\/api\/program-workouts\/\d+$/.test(c.path)) data = s.links.filter(l => l.programId === id);
      else if (c.method === 'GET' && /\/assigned-users$/.test(c.path)) data = s.clients.filter(u => u.programs.some(p => p.programId === Number(c.path.split('/')[3]))).map(u => u.userId);
      else if (match('GET', '/api/workouts/my')) data = s.workouts;
      else if (match('GET', '/api/exercises/filter-options')) data = { bodyParts: ['back', 'chest'], equipment: ['cable', 'barbell'] };
      else if (match('GET', '/api/exercises/search')) {
        const q = c.query; const all = s.exercises.filter(e => (!q.get('search') || e.name.toLowerCase().includes(q.get('search')!.toLowerCase())) && (!q.get('bodyPart') || e.bodyPart === q.get('bodyPart')) && (!q.get('equipment') || e.equipment === q.get('equipment')));
        const size = Number(q.get('size') ?? 12); const page = Number(q.get('page') ?? 0);
        data = { content: all.slice(page * size, (page + 1) * size), totalElements: all.length, totalPages: Math.ceil(all.length / size) };
      } else if (c.method === 'GET' && /^\/api\/user-workout-exercises\/user-programs\//.test(c.path)) data = id === 1 ? s.rows : [];
      else if (c.method === 'GET' && /^\/api\/user-workout-exercise-sets\/\d+$/.test(c.path)) data = s.sets[id] ?? [];
      else if (c.method === 'PUT' && /^\/api\/user-workout-exercise-sets\/\d+$/.test(c.path)) {
        const row = Object.values(s.sets).flat().find(x => x.id === id)!;
        for (const [key, value] of Object.entries(c.body)) if (!key.startsWith('clear') && key !== 'expected') row[key] = value;
        data = null;
      } else if (c.method === 'POST' && /^\/api\/user-workout-exercise-sets\/\d+\/sets$/.test(c.path)) {
        const eid = Number(c.path.split('/')[3]); data = this.nextId++;
        s.sets[eid].push({ ...s.sets[eid][0], id: data, setNumber: s.sets[eid].length + 1, completed: false });
      } else if (c.method === 'DELETE' && /^\/api\/user-workout-exercise-sets\/\d+$/.test(c.path)) {
        for (const key of Object.keys(s.sets)) s.sets[Number(key)] = s.sets[Number(key)].filter(x => x.id !== id);
        data = null;
      } else if (match('PATCH', '/api/user-workout-exercises/schedule')) { s.rows.find(r => r.user_workout_id === c.body.userWorkoutId)!.scheduled_date = c.body.scheduledAt; data = null; }
      else if (match('POST', '/api/programs/assign')) {
        const p = this.program(c.body.programId); const u = s.clients.find(u => u.userId === c.body.userId)!;
        u.programs.push({ programId: p.programId, name: p.programName, startDate: p.startDate, endDate: p.endDate, totalWorkouts: p.workouts.length, completedWorkouts: 0 }); data = null;
      } else if (c.method === 'DELETE' && /^\/api\/programs\/\d+\/assigned-users\/\d+$/.test(c.path)) {
        const pid = Number(c.path.split('/')[3]); const u = s.clients.find(u => u.userId === id)!; u.programs = u.programs.filter(p => p.programId !== pid); data = null;
      } else if (match('POST', '/api/user-programs')) {
        data = this.nextId++; s.programs.push({ ...s.programs[0], ...c.body, programId: data, workouts: [] });
      } else if (c.method === 'PUT' && /^\/api\/programs\/\d+$/.test(c.path)) { Object.assign(s.programs.find(p => p.programId === id)!, c.body); data = null; }
      else if (c.method === 'DELETE' && /^\/api\/programs\/coach\/\d+$/.test(c.path)) { s.programs = s.programs.filter(p => p.programId !== id); data = null; }
      else if (match('POST', '/api/program-workouts')) { data = { ...c.body, id: this.nextId++ }; s.links.push(data); }
      else if (c.method === 'PUT' && /^\/api\/program-workouts\/\d+$/.test(c.path)) { Object.assign(s.links.find(l => l.id === id)!, c.body); data = null; }
      else if (c.method === 'DELETE' && /^\/api\/program-workouts\/id\/\d+$/.test(c.path)) { s.links = s.links.filter(l => l.id !== id); data = null; }
      else if (match('PUT', '/api/workout-exercises/prescription')) { Object.assign(s.workouts.find(w => w.id === Number(c.query.get('workoutId')))!.exercises.find(e => e.id === Number(c.query.get('exerciseId')))!, c.body); data = null; }
      else if (match('PUT', '/api/workout-exercises/order')) {
        const w = s.workouts.find(w => w.id === Number(c.query.get('workoutId')))!; const index = w.exercises.findIndex(e => e.id === Number(c.query.get('exerciseId')));
        w.exercises.splice(Number(c.query.get('orderIndex')), 0, w.exercises.splice(index, 1)[0]); data = null;
      } else if (c.method === 'POST' && /\/apply-template$/.test(c.path)) data = { userWorkouts: 1, setsUpdated: 3, setsAdded: 0, setsRemoved: 0 };
      else if (match('POST', '/api/workouts')) { data = { id: this.nextId++ }; s.workouts.push({ id: data.id, name: c.body.name, exercises: [] }); }
      else if (match('POST', '/api/workout-exercises')) { s.workouts.find(w => w.id === Number(c.query.get('workoutId')))!.exercises.push({ ...s.exercises.find(e => e.id === Number(c.query.get('exerciseId')))! }); data = null; }
      else if (match('POST', '/api/workout-copy')) {
        data = this.nextId++; const source = s.workouts.find(w => w.id === c.body.sourceWorkoutId)!;
        s.workouts.push({ ...structuredClone(source), id: data, name: c.body.workoutName });
        s.links.push({ id: this.nextId++, programId: c.body.programId, workoutId: data, dayIndex: c.body.dayIndex });
      } else if (c.method === 'POST' && /^\/api\/coach\/programs\/\d+\/copy$/.test(c.path)) {
        const source = Number(c.path.split('/')[4]); data = this.nextId++;
        s.programs.push({ ...structuredClone(this.program(source)), programId: data, programName: c.body.name, startDate: c.body.startDate });
        for (const l of [...s.links.filter(l => l.programId === source)]) {
          const w = structuredClone(s.workouts.find(w => w.id === l.workoutId)!); w.id = this.nextId++; s.workouts.push(w);
          s.links.push({ ...l, id: this.nextId++, programId: data, workoutId: w.id });
        }
      } else if (c.method === 'GET' && /^\/api\/workouts\/\d+$/.test(c.path)) {
        const w: any = s.workouts.find(w => w.id === id);
        if (!w) return route.fulfill({ status: 404, json: { success: false, message: 'A workout nem található.', data: null } });
        data = { workoutId: w.id, workoutName: w.name, workoutDescription: w.description ?? 'Workout description', workoutDate: w.workoutDate ?? TODAY,
          durationMinutes: w.durationMinutes ?? 45, intensityLevel: w.intensityLevel ?? 'MEDIUM', done: w.done ?? false };
      } else if (c.method === 'PUT' && /^\/api\/workouts\/\d+$/.test(c.path)) {
        Object.assign(s.workouts.find(w => w.id === id)!, { name: c.body.name, description: c.body.description, workoutDate: c.body.workoutDate,
          durationMinutes: c.body.durationMinutes, intensityLevel: c.body.intensityLevel, done: c.body.done });
        data = { status: 'ok', message: 'Workout sikeresen módosítva', workoutId: id };
      } else if (match('GET', '/api/exercises/workouts/page')) data = { content: [], page: 0, size: Number(c.query.get('size') ?? 12), totalElements: 0, totalPages: 0 };
      else if (match('GET', '/api/exercises')) data = s.exercises.map(e => ({ ...e }));
      else if (c.method === 'GET' && /^\/api\/exercises\/workouts\/\d+$/.test(c.path)) {
        const w = s.workouts.find(w => w.id === id);
        if (!w) return route.fulfill({ status: 404, json: { success: false, message: 'A workout nem található.', data: null } });
        data = { id: w.id, name: w.name, exercises: w.exercises.map((e, i) => ({ id: w.id * 1000 + e.id, workoutId: w.id, exercise: { ...e },
          sets: e.sets, repetitions: e.repetitions, orderIndex: i, restSeconds: e.restSeconds, notes: null, done: false })) };
      } else if (c.method === 'GET' && /^\/api\/program-workouts\/workouts\/\d+\/assigned$/.test(c.path)) {
        const wid = Number(c.path.split('/')[4]); data = { assigned: s.links.some(l => l.workoutId === wid) };
      } else if (c.method === 'GET' && /^\/api\/coach\/workouts\/\d+\/programs$/.test(c.path)) {
        const wid = Number(c.path.split('/')[4]);
        data = s.programs.filter(p => s.links.some(l => l.programId === p.programId && l.workoutId === wid)).map(p => ({ programId: p.programId, name: p.programName }));
      } else if (c.method === 'POST' && /^\/api\/coach\/workouts\/\d+\/copy$/.test(c.path)) {
        const source = s.workouts.find(w => w.id === Number(c.path.split('/')[4]))!; data = this.nextId++;
        s.workouts.push({ ...structuredClone(source), id: data, name: c.body.name });
      } else if (match('DELETE', '/api/workout-exercises')) {
        const w = s.workouts.find(w => w.id === Number(c.query.get('workoutId')))!;
        w.exercises = w.exercises.filter(e => e.id !== Number(c.query.get('exerciseId'))); data = null;
      } else { this.unknown.push(`${c.method} ${c.path}`); return route.fulfill({ status: 501, json: { success: false, message: 'Unhandled contract API' } }); }
      await route.fulfill({ json: { success: true, data } });
    });
  }
}
export const test = base.extend<{ api: WorkspaceApi }>({
  api: async ({ page }, use) => {
    const api = new WorkspaceApi(); await api.install(page); await use(api);
    expect(api.unknown, 'Unexpected API calls in UI contract suite').toEqual([]);
  },
});
export { expect };
