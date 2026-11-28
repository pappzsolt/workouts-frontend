import { returningAccount } from './onboarding-fixture';
import { test, expect, type Page } from '@playwright/test';

const ROOT = '/api/me/personal-programs';
const START_DATE = '2026-10-25';
const draft = () => ({ name: 'Saját terv', description: null, durationDays: 7, startDate: null as string | null,
  difficultyLevel: null, languageCode: 'hu', expectedVersion: 1, workouts: [{ dayIndex: 1, name: 'Első nap', description: null,
    exercises: [{ exerciseId: 11, sets: 3, repetitions: 10, restSeconds: 60, notes: null }] }] });

async function install(page: Page) {
  await returningAccount(page, 'user', 42);
  const state = { program: draft(), id: 7, started: false, standalone: false, failSave: false, failList: false,
    editableTargets: false, failTargetSave: false,
    calls: [] as { method: string; path: string; body: any }[], unexpected: [] as string[] };
  const token = [Buffer.from(JSON.stringify({ alg: 'none' })).toString('base64url'),
    Buffer.from(JSON.stringify({ sub: 'anna', id: 42, roles: 'ROLE_USER', exp: Math.floor(Date.now()/1000)+3600 })).toString('base64url'), 'signature'].join('.');
  await page.addInitScript(() => localStorage.setItem('language', 'hu'));
  await page.route('**/api/**', async route => {
    const req=route.request(), path=new URL(req.url()).pathname;
    const call={ method: req.method(), path, body: req.postData() ? req.postDataJSON() : null };
    state.calls.push(call);
    const ok=(data: unknown) => route.fulfill({ json: { success: true, data, message: null } });
    if (path === '/api/auth/web/refresh') return ok({ accessToken: token });
    if (path === '/api/exercises' && req.method() === 'GET') return ok([{ id: 11, name: 'Guggolás' }]);
    if (path === '/api/exercises/filter-options') return ok({ bodyParts: [], equipment: [] });
    if (path === '/api/exercises/search') return ok({ content: [{ id: 11, name: 'Guggolás' }], totalElements: 1, totalPages: 1 });
    if ((path === `${ROOT}/standalone/groups` || path === `${ROOT}/standalone/group-summaries` || path === `${ROOT}/standalone/groups/7/occasions`) && req.method() === 'GET') {
      if (state.failList) return route.fulfill({ status: 503, json: { success: false, message: 'Átmeneti betöltési hiba' } });
      const query = new URL(req.url()).searchParams;
      const status = state.started ? 'planned' : 'draft';
      const matches = state.standalone && state.program.name.toLowerCase().includes((query.get('search') ?? '').toLowerCase())
        && (!query.has('status') || query.get('status') === status);
      const item = { id: state.id, name: state.program.name, description: state.program.description, durationDays: 1,
        startDate: state.program.startDate, startedAt: state.started ? '2026-10-25T12:00:00' : null, standalone: true, status, completedDate: null, scheduledDate: state.program.startDate };
      const groups = matches ? [{ groupId: 7, name: item.name, description: item.description, occasions: [item] }] : [];
      const summaries = groups.map(group => ({ groupId: group.groupId, name: group.name, description: group.description,
        total: 1, matchingTotal: 1, draft: status === 'draft' ? 1 : 0, planned: status === 'planned' ? 1 : 0, inProgress: 0, done: 0,
        lastCompletedDate: null, nextDate: status === 'planned' ? item.scheduledDate : null, repeatSource: state.started ? item : null }));
      const entries = path.endsWith('/occasions') ? (matches ? [item] : []) : path.endsWith('/group-summaries') ? summaries : groups;
      const pageIndex = Number(query.get('page') ?? 0), size = Number(query.get('size') ?? 12);
      return ok({ content: entries.slice(pageIndex * size, (pageIndex + 1) * size), page: pageIndex, size,
        totalElements: entries.length, totalPages: Math.ceil(entries.length / size) });
    }
    if (path === `${ROOT}/page` && req.method() === 'GET') {
      if (state.failList) return route.fulfill({ status: 503, json: { success: false, message: 'Átmeneti betöltési hiba' } });
      const query = new URL(req.url()).searchParams;
      const pageIndex = Number(query.get('page') ?? 0);
      const size = Number(query.get('size') ?? 12);
      const search = (query.get('search') ?? '').toLowerCase();
      const items = [{ id: state.id, name: state.program.name, durationDays: state.program.durationDays,
        startDate: state.program.startDate, startedAt: state.started ? '2026-10-25T12:00:00' : null, standalone: state.standalone }]
        .filter(item => item.name.toLowerCase().includes(search)
          && (!query.has('standalone') || item.standalone === (query.get('standalone') === 'true')));
      return ok({ content: items.slice(pageIndex * size, (pageIndex + 1) * size), page: pageIndex, size,
        totalElements: items.length, totalPages: Math.ceil(items.length / size) });
    }
    if (path === ROOT && req.method() === 'GET') {
      if (state.failList) return route.fulfill({ status: 503, json: { success: false, message: 'Átmeneti betöltési hiba' } });
      return ok([{ id: state.id, name: state.program.name, durationDays: 7, startDate: null, startedAt: null }]);
    }
    if (path === `${ROOT}/standalone` && req.method() === 'POST') { state.standalone=true;state.program={...call.body,expectedVersion:1};return ok(state.id); }
    if (path === `${ROOT}/${state.id}/repeat`) { state.id++;state.started=false;state.program={...state.program,startDate:null,expectedVersion:1};return ok({id:state.id,standalone:true,startedAt:null,program:state.program}); }
    if (path === ROOT && req.method() === 'POST') { state.program={...call.body,expectedVersion:1}; return ok(state.id); }
    if (state.started && state.editableTargets && path === `${ROOT}/${state.id}/days/1/targets` && req.method() === 'PUT') {
      if (state.failTargetSave || call.body.expectedVersion !== 1) {
        return route.fulfill({ status: 409, json: { success: false, message: 'A célértékek mentése sikertelen.' } });
      }
      return ok({ dayIndex: 1, version: 2, editable: true,
        exercises: call.body.exercises.map((exercise: object) => ({ ...exercise, editable: true })),
      });
    }
    if (state.started && req.method() === 'GET') {
      if (path === `${ROOT}/${state.id}/schedule`) {
        return ok(state.program.workouts.map(day => ({
          dayIndex: day.dayIndex, scheduledAt: state.program.startDate, version: 1, editable: false,
        })));
      }
      const targets = path.match(new RegExp(`^${ROOT}/${state.id}/days/([0-9]+)/targets$`));
      const day = targets && state.program.workouts.find(workout => workout.dayIndex === Number(targets[1]));
      if (day) {
        return ok({
          dayIndex: day.dayIndex, version: 1, editable: state.editableTargets,
          exercises: day.exercises.map((exercise, exerciseIndex) => ({
            exerciseIndex, userExerciseId: 100 + exerciseIndex, exerciseId: exercise.exerciseId,
            editable: state.editableTargets,
            sets: Array.from({ length: exercise.sets }, (_, index) => ({
              userWorkoutSetId: 1000 + exerciseIndex * 20 + index,
              targetRepetitions: exercise.repetitions, targetWeightKg: null,
              restSeconds: exercise.restSeconds, targetRpe: null,
            })),
          })),
        });
      }
    }
    if (path === `${ROOT}/${state.id}` && req.method() === 'GET') return ok({ id: state.id, standalone: state.standalone, startedAt: state.started ? '2026-10-25T12:00:00' : null, program: state.program });
    if (path === `${ROOT}/${state.id}` && req.method() === 'PUT') {
      if (call.body.expectedVersion !== state.program.expectedVersion) return route.fulfill({ status: 409, json: { success: false, message: 'A saját programot időközben módosították. A szerkesztésed megmaradt.' } });
      if (state.failSave) return route.fulfill({ status: 409, json: { success: false, message: 'A mentés most nem sikerült.' } });
      state.program={...call.body,expectedVersion:state.program.expectedVersion+1}; return ok({id:state.id,standalone:state.standalone,startedAt:null,program:state.program});
    }
    if (path === `${ROOT}/${state.id}` && req.method() === 'DELETE') return ok(state.id);
    if (path === `${ROOT}/${state.id}/start`) { state.started=true; state.program={...state.program,startDate:START_DATE}; return ok({id:state.id,standalone:state.standalone,startedAt:'2026-10-25T12:00:00',program:state.program}); }
    if (path === `${ROOT}/${state.id}/copy`) { state.id++; state.started=false; state.program = { ...state.program, startDate: null }; return ok(state.id); }
    state.unexpected.push(`${req.method()} ${path}`);
    return route.abort('blockedbyclient');
  });
  return state;
}
const editor=(page: Page) => page.locator('app-personal-program-editor');

async function openProgramExercise(page: Page) {
  const root = editor(page);
  await root.getByRole('button', { name: '2. Edzésnap', exact: true }).click();
  await root.getByRole('button', { name: 'Gyakorlat szerkesztése: Guggolás', exact: true }).click();
}

async function selectProgramDay(page: Page, day: number) {
  const root = editor(page);
  await root.getByRole('button', { name: '1. Naptár és programadatok', exact: true }).click();
  await root.getByRole('button', { name: 'Hónap', exact: true }).click();
  await root.locator(`[data-personal-program-day="${day}"]`).click();
}


test('Saját program: létrehozás, gyakorlatválasztás, indítás, másolás és törlés', async ({ page }, info) => {
  const api=await install(page);
  await page.goto('/user/personal-programs/new');
  await editor(page).locator('input[name=name]').fill('Új saját terv');
  await editor(page).getByRole('button', { name: 'Edzésnap hozzáadása', exact: true }).click();
  await editor(page).getByLabel('Edzés neve', { exact: true }).nth(0).fill('Lábnap');
  await editor(page).getByRole('button', { name: 'Gyakorlat hozzáadása', exact: true }).click();
  await page.locator('app-exercise-picker').getByRole('button', { name: 'Hozzáadás: Guggolás', exact: true }).click();
  await editor(page).getByRole('button', { name: 'Piszkozat mentése', exact: true }).click();
  await expect(page).toHaveURL(/personal-programs\/7$/);
  await openProgramExercise(page);
  await expect(editor(page).getByRole('heading', { name: 'Guggolás', exact: true })).toBeVisible();
  expect(api.program.workouts[0].exercises).toEqual([{ exerciseId: 11, sets: 3, repetitions: 10, restSeconds: 60, notes: null,
    setTargets: Array.from({length:3}, () => ({targetRepetitions:10,targetWeightKg:null,restSeconds:60,targetRpe:null,notes:null})) }]);
  expect((api.program as any).userId).toBeUndefined();
  await editor(page).getByRole('button', { name: 'Program indítása', exact: true }).click();
  expect(api.calls.filter(c => c.path.endsWith('/start'))).toHaveLength(0);
  await page.getByRole('alertdialog').getByRole('button', { name: 'Megerősítés', exact: true }).click();
  await expect(editor(page).getByRole('link', { name: 'Edzések megnyitása', exact: true })).toBeVisible();
  await expect(editor(page).locator('input[name=name]')).toBeDisabled();
  await expect(editor(page).locator('input[name=startDate]')).toHaveValue('2026-10-25');
  await expect(editor(page).getByRole('button', { name: 'Program archiválása', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await openProgramExercise(page);
  await expect(editor(page).getByLabel('Guggolás 1. Cél súly (kg)', {exact:true})).toBeDisabled();
  await page.screenshot({ path: `/tmp/personal-program-${info.project.name}.png`, fullPage: true });
  await editor(page).getByRole('button', { name: 'Másolat készítése', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Megerősítés', exact: true }).click();
  await expect(page).toHaveURL(/personal-programs\/8$/);
  await expect(editor(page).locator('input[name=name]')).toBeEnabled();
  await editor(page).getByRole('button', { name: 'Program törlése', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Megerősítés', exact: true }).click();
  await expect(page).toHaveURL(/personal-programs$/);
  expect(api.unexpected).toEqual([]);
});

test('Saját program: hibás edzés és nem mentett változások védelme', async ({ page }) => {
  const api=await install(page);
  await page.goto('/user/personal-programs/7');
  await selectProgramDay(page, 2);
  await editor(page).getByRole('button', { name: 'Edzésnap hozzáadása', exact: true }).click();
  const dayName = editor(page).getByRole('textbox', { name: /Edzés neve/ });
  await dayName.fill('');
  await editor(page).getByRole('button', { name: 'Piszkozat mentése', exact: true }).click();
  await expect(dayName).toHaveValue('');
  await expect(editor(page).getByRole('alert').filter({ hasText: 'Ezt a mezőt kötelező kitölteni.' })).toBeVisible();
  expect(api.calls.filter(c => c.method === 'PUT')).toHaveLength(0);
  await editor(page).getByRole('link', { name: 'Vissza a saját programokhoz', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Mégse', exact: true }).click();
  await expect(page).toHaveURL(/personal-programs\/7$/);
  await expect(dayName).toHaveValue('');
  expect(api.calls.filter(c => c.method === 'PUT')).toHaveLength(0);
  await editor(page).getByRole('link', { name: 'Vissza a saját programokhoz', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Megerősítés', exact: true }).click();
  await expect(page).toHaveURL(/personal-programs$/);
  expect(api.unexpected).toEqual([]);
});

test('Saját program: sikertelen mentés megőrzi az adatokat és újrapróbálható', { tag: '@ci-workouts' }, async ({ page }) => {
  const api=await install(page); api.failSave=true;
  await page.goto('/user/personal-programs/7');
  await editor(page).locator('input[name=name]').fill('Megőrzendő változás');
  await editor(page).getByRole('button', { name: 'Piszkozat mentése', exact: true }).click();
  await expect(editor(page)).toContainText('A mentés most nem sikerült.');
  await expect(editor(page).locator('input[name=name]')).toHaveValue('Megőrzendő változás');
  await expect(editor(page).getByRole('button', { name: 'Program indítása', exact: true })).toBeDisabled();
  api.failSave=false;
  await editor(page).getByRole('button', { name: 'Piszkozat mentése', exact: true }).click();
  await expect(editor(page)).toContainText('A saját programot mentettük.');
  await expect(editor(page).getByRole('button', { name: 'Program indítása', exact: true })).toBeEnabled();
  expect(api.unexpected).toEqual([]);
});

for (const standalone of [false, true]) {
  test(`pagination moves focus to the loaded results (standalone=${standalone})`, async ({ page }) => {
    await install(page);
    const endpoint = standalone ? 'standalone/group-summaries' : 'page';
    await page.route(`**/api/me/personal-programs/${endpoint}?*`, async route => {
      const pageIndex = Number(new URL(route.request().url()).searchParams.get('page'));
      const item = { id: 7 + pageIndex, name: `Edzésterv ${pageIndex + 1}`, durationDays: 7, standalone };
      const group = { groupId: item.id, name: item.name, total: 1, matchingTotal: 1, draft: 1 };
      await route.fulfill({ json: { success: true, data: {
        content: [standalone ? group : item], page: pageIndex, size: 12, totalElements: 13, totalPages: 2,
      } } });
    });
    await page.goto(standalone ? '/user/personal-workouts' : '/user/personal-programs');
    const next = page.getByRole('button', { name: 'Következő', exact: true });
    await next.focus();
    await next.press('Enter');
    await expect(page.getByRole('heading', { name: 'Edzésterv 2' })).toBeVisible();
    await expect(page.getByRole('heading', { name: /Találatok.*2/ })).toBeFocused();
  });
}

test('Saját program: betöltési hiba újrapróbálható, nem mutat hamis üres listát', async ({ page }) => {
  const api=await install(page); api.failList=true;
  await page.goto('/user/personal-programs');
  await expect(page.locator('app-personal-programs')).toContainText('Átmeneti betöltési hiba');
  await expect(page.locator('app-empty-state')).toHaveCount(0);
  api.failList=false;
  await page.getByRole('button', { name: 'Újrapróbálás', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'Saját terv', exact: true })).toBeVisible();
  expect(api.unexpected).toEqual([]);
});

for (const [language, label] of [['en', 'Program name'], ['de', 'Programmname']]) {
  test(`Saját program: nyelvváltás megőrzi a piszkozatot (${language})`, async ({ page }) => {
    const api=await install(page);
    await page.goto('/user/personal-programs/7');
    await editor(page).getByLabel('Program neve', { exact: true }).fill('Megőrzött saját név');
    await page.locator('app-language-selector select').selectOption(language);
    await expect(editor(page).getByLabel(label, { exact: true })).toHaveValue('Megőrzött saját név');
    await expect(editor(page).getByRole('button', { name: language === 'en' ? 'Start program' : 'Programm starten', exact: true })).toBeDisabled();
    expect(api.calls.filter(c => c.method === 'PUT')).toHaveLength(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    expect(api.unexpected).toEqual([]);
  });
}

test('Saját program: régi verzió mentése nem veszít adatot', { tag: '@ci-workouts' }, async ({ page }) => {
  const api=await install(page);
  await page.goto('/user/personal-programs/7');
  await editor(page).getByLabel('Program neve',{exact:true}).fill('Megőrzendő helyi szerkesztés');
  api.program.expectedVersion++;
  api.program.name='Másik ablak mentése';
  await editor(page).getByRole('button',{name:'Piszkozat mentése',exact:true}).click();
  await expect(editor(page)).toContainText('A saját programot időközben módosították.');
  await expect(editor(page).getByLabel('Program neve',{exact:true})).toHaveValue('Megőrzendő helyi szerkesztés');
  expect(api.program.name).toBe('Másik ablak mentése');
  await expect(editor(page).getByRole('button',{name:'Program indítása',exact:true})).toBeDisabled();
  expect(api.unexpected).toEqual([]);
});

test('Saját program: egymást követő mentések az új verziót küldik', async ({page}) => {
  const api=await install(page);
  await page.goto('/user/personal-programs/7');
  for (const name of ['Első mentés','Második mentés']) {
    await editor(page).getByLabel('Program neve',{exact:true}).fill(name);
    await editor(page).getByRole('button',{name:'Piszkozat mentése',exact:true}).click();
    await expect(editor(page)).toContainText('A saját programot mentettük.');
    await expect(editor(page).getByRole('button',{name:'Piszkozat mentése',exact:true})).toBeDisabled();
  }
  expect(api.calls.filter(c=>c.method==='PUT').map(c=>c.body.expectedVersion)).toEqual([1,2]);
  expect(api.program.name).toBe('Második mentés');
  expect(api.unexpected).toEqual([]);
});

test('Önálló edzés: egyszerű létrehozás és új alkalom külön eredményekkel', async ({page}, info) => {
  const api=await install(page);
  await page.goto('/user/personal-workouts/new');
  await expect(editor(page).getByRole('heading',{name:'Önálló edzés létrehozása',exact:true})).toBeVisible();
  await expect(editor(page).locator('input[name=durationDays]')).toHaveCount(0);
  await expect(editor(page).getByRole('button',{name:'Edzésnap hozzáadása',exact:true})).toHaveCount(0);
  await editor(page).getByLabel('Edzés neve',{exact:true}).fill('Gyors erősítés');
  await editor(page).getByRole('button', {name:'Tovább a gyakorlatokhoz',exact:true}).click();
  await editor(page).getByRole('button',{name:'Gyakorlat hozzáadása',exact:true}).click();
  await page.locator('app-exercise-picker').getByRole('button',{name:'Hozzáadás: Guggolás',exact:true}).click();
  await editor(page).getByRole('button',{name:'Edzés mentése',exact:true}).click();
  await expect(page).toHaveURL(/personal-workouts\/7$/);
  expect(api.program.durationDays).toBe(1);expect(api.program.workouts.length).toBe(1);
  expect(api.program.workouts[0].name).toBe('Gyors erősítés');
  await editor(page).getByRole('button',{name:'Edzés indítása',exact:true}).click();
  await page.getByRole('alertdialog').getByRole('button',{name:'Megerősítés',exact:true}).click();
  await expect(editor(page).getByRole('button',{name:'Új alkalom',exact:true})).toBeVisible();
  await expect(editor(page).locator('input[name=startDate]')).toHaveValue('2026-10-25');
  await editor(page).getByRole('button',{name:'Új alkalom',exact:true}).click();
  await page.getByRole('alertdialog').getByRole('button',{name:'Megerősítés',exact:true}).click();
  await expect(page).toHaveURL(/personal-workouts\/8$/);
  await expect(editor(page).getByLabel('Edzés neve',{exact:true})).toHaveValue('Gyors erősítés');
  await expect(editor(page).locator('input[name=startDate]')).toHaveValue('');
  await expect(editor(page).getByLabel('Edzés neve',{exact:true})).toBeEnabled();
  await expect(editor(page).getByRole('button',{name:'Edzés indítása',exact:true})).toBeEnabled();
  await page.screenshot({path:`/tmp/standalone-workout-${info.project.name}.png`,fullPage:true});
  expect(api.calls.filter(c=>c.path.endsWith('/start'))).toHaveLength(1);
  expect(api.unexpected).toEqual([]);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

async function openStartedStandalone(page: Page) {
  const api=await install(page);
  api.standalone=true;api.started=true;api.program.durationDays=1;
  await page.goto('/user/personal-workouts/7');
  await expect(editor(page).getByRole('button',{name:'Új alkalom',exact:true})).toBeVisible();
  return api;
}

test('Önálló edzés: hibás ismétlés után az eredeti edzés megmarad és újrapróbálható',async({page})=>{
  await openStartedStandalone(page);
  let fail=true;
  await page.route('**/api/me/personal-programs/7/repeat*',async route=>{
    if(fail) return route.fulfill({status:503,json:{success:false,message:'Átmeneti ismétlési hiba'}});
    await route.fallback();
  });
  await editor(page).getByRole('button',{name:'Új alkalom',exact:true}).click();
  await page.getByRole('alertdialog').getByRole('button',{name:'Megerősítés',exact:true}).click();
  await expect(editor(page)).toContainText('Átmeneti ismétlési hiba');
  await expect(page).toHaveURL(/personal-workouts\/7$/);
  await expect(editor(page).getByLabel('Edzés neve',{exact:true})).toHaveValue('Saját terv');
  await expect(editor(page).getByLabel('Edzés neve',{exact:true})).toBeDisabled();
  fail=false;
  await editor(page).getByRole('button',{name:'Új alkalom',exact:true}).click();
  await page.getByRole('alertdialog').getByRole('button',{name:'Megerősítés',exact:true}).click();
  await expect(page).toHaveURL(/personal-workouts\/8$/);
  await expect(editor(page).getByLabel('Edzés neve',{exact:true})).toBeEnabled();
});

test('Önálló edzés: megerősítés visszavonása és függő ismétlés nem duplikál',async({page})=>{
  const api=await openStartedStandalone(page);
  await editor(page).getByRole('button',{name:'Új alkalom',exact:true}).click();
  await page.getByRole('alertdialog').getByRole('button',{name:'Mégse',exact:true}).click();
  expect(api.calls.filter(c=>c.path.endsWith('/repeat'))).toHaveLength(0);
  let release!:()=>void;
  const pending=new Promise<void>(resolve=>release=resolve);
  let requests=0;
  await page.route('**/api/me/personal-programs/7/repeat*',async route=>{
    requests++;await pending;await route.fallback();
  });
  try {
    await editor(page).getByRole('button',{name:'Új alkalom',exact:true}).click();
    const confirm=page.getByRole('alertdialog').getByRole('button',{name:'Megerősítés',exact:true});
    await confirm.click();await expect(confirm).toBeDisabled();
    await expect(page.getByRole('alertdialog').getByRole('button',{name:'Mégse',exact:true})).toBeDisabled();
    await expect.poll(()=>requests).toBe(1);
  } finally { release(); }
  await expect(page).toHaveURL(/personal-workouts\/8$/);
  expect(requests).toBe(1);
});

for(const [language,title,nameLabel,saveLabel] of [
  ['en','Create standalone workout','Workout name','Save workout'],
  ['de','Einzeltraining erstellen','Trainingsname','Training speichern'],
]) {
  test(`Önálló edzés: lokalizált egyszerű felület és kötelező név (${language})`,async({page})=>{
    const api=await install(page);
    await page.goto('/user/personal-workouts/new');
    await page.locator('app-language-selector select').selectOption(language);
    await expect(editor(page).getByRole('heading',{name:title,exact:true})).toBeVisible();
    await expect(editor(page).locator('input[name=durationDays]')).toHaveCount(0);
    await expect(editor(page).getByRole('button',{name:saveLabel,exact:true})).toBeDisabled();
    await editor(page).getByLabel(nameLabel,{exact:true}).fill('Workout');
    await expect(editor(page).getByRole('button',{name:saveLabel,exact:true})).toBeEnabled();
    expect(api.calls.filter(c=>c.method==='POST'&&c.path.endsWith('/standalone'))).toHaveLength(0);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  });
}

test('Saját program: függő mentés alatt nem hagyható el a szerkesztő és nincs második kérés', async ({ page }) => {
  const api = await install(page);
  let release!: () => void;
  const gate = new Promise<void>(resolve => release = resolve);
  const submitted: unknown[] = [];
  await page.route(`**${ROOT}/7?**`, async route => {
    if (route.request().method() !== 'PUT') return route.fallback();
    submitted.push(route.request().postDataJSON());
    await gate;
    await route.fallback();
  });
  try {
    await page.goto('/user/personal-programs/7');
    await editor(page).getByLabel('Program neve', { exact: true }).fill('Mentés alatt');
    const save = editor(page).getByRole('button', { name: 'Piszkozat mentése', exact: true });
    await save.click();
    await expect.poll(() => submitted.length).toBe(1);
    await expect(editor(page).locator('button[type=submit]')).toBeDisabled();
    await editor(page).getByRole('link', { name: 'Vissza a saját programokhoz', exact: true }).click();
    await expect(page).toHaveURL(/personal-programs\/7$/);
    await expect(page.getByRole('alertdialog')).toHaveCount(0);
    expect(submitted).toHaveLength(1);
    const finished = page.waitForResponse(response => response.request().method() === 'PUT' && new URL(response.url()).pathname === `${ROOT}/7`);
    release();
    await finished;
    await expect(editor(page).getByRole('button', { name: 'Program indítása', exact: true })).toBeEnabled();
    await expect(editor(page).getByLabel('Program neve', { exact: true })).toHaveValue('Mentés alatt');
    expect(api.calls.filter(call => call.method === 'PUT')).toHaveLength(1);
    expect(api.program.expectedVersion).toBe(2);
    expect(api.unexpected).toEqual([]);
  } finally {
    release();
  }
});

test('Saját program: eltérő sorozatcélok megmaradnak napváltás, mentés és újranyitás után', async ({page}) => {
  const api = await install(page);
  api.program.durationDays = 21;
  await page.goto('/user/personal-programs/7');
  const r = editor(page);
  await openProgramExercise(page);
  const weight = (set: number) => r.getByLabel(`Guggolás ${set}. Cél súly (kg)`, {exact:true});
  await weight(1).fill('42.5');
  await r.getByLabel('Guggolás 1. Cél ism.', {exact:true}).fill('12');
  await r.getByLabel('Guggolás 1. Tervezett RPE', {exact:true}).fill('7.5');
  await weight(2).fill('55.25');
  await r.getByLabel('Guggolás 2. Cél ism.', {exact:true}).fill('8');
  await selectProgramDay(page, 2);
  await expect(r.getByText('Erre a napra még nincs edzés:', {exact:false})).toBeVisible();
  await selectProgramDay(page, 1);
  await openProgramExercise(page);
  await expect(weight(1)).toHaveValue('42.5');
  await r.getByRole('button', {name:'Piszkozat mentése',exact:true}).click();
  await expect(r).toContainText('A saját programot mentettük.');
  const saved = api.calls.filter(c => c.method === 'PUT').at(-1)!.body.workouts[0].exercises[0];
  expect(saved.setTargets[0]).toEqual({targetRepetitions:12,targetWeightKg:42.5,restSeconds:60,targetRpe:7.5,notes:null});
  expect(saved.setTargets[1]).toMatchObject({targetRepetitions:8,targetWeightKg:55.25});
  await page.reload();
  await openProgramExercise(page);
  await expect(weight(1)).toHaveValue('42.5');
  await expect(weight(2)).toHaveValue('55.25');
  await expect(r.getByLabel('Guggolás 1. Tervezett RPE', {exact:true})).toHaveValue('7.5');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(api.unexpected).toEqual([]);
});

test('Saját program: heti ismétlés önálló sorozatokkal és sorozatkezelés', async ({page}) => {
  const api = await install(page); api.program.durationDays = 21;
  await page.goto('/user/personal-programs/7');
  const r = editor(page);
  await openProgramExercise(page);
  await r.getByLabel('Guggolás 1. Cél súly (kg)', {exact:true}).fill('40');
  await r.getByRole('button', {name:'Első sorozat értékei mindre',exact:true}).click();
  await expect(r.getByLabel('Guggolás 3. Cél súly (kg)', {exact:true})).toHaveValue('40');
  await r.getByRole('button', {name:'Sorozat hozzáadása',exact:true}).click();
  await expect(r.getByLabel('Guggolás 4. Cél súly (kg)', {exact:true})).toHaveValue('40');
  await r.getByRole('button', {name:'4. sorozat törlése: Guggolás',exact:true}).click();
  await expect(r.getByLabel('Guggolás 4. Cél súly (kg)', {exact:true})).toHaveCount(0);
  await r.getByRole('button', {name:'2. Edzésnap',exact:true}).click();
  await r.getByRole('button', {name:'Ismétlés hetente',exact:true}).click();
  await r.getByRole('button', { name: 'Másolás megerősítése', exact: true }).click();
  await expect(r).toContainText('Az edzést átmásoltuk');
  await selectProgramDay(page, 8);
  await openProgramExercise(page);
  await r.getByLabel('Guggolás 1. Cél súly (kg)', {exact:true}).fill('50');
  await selectProgramDay(page, 1);
  await openProgramExercise(page);
  await expect(r.getByLabel('Guggolás 1. Cél súly (kg)', {exact:true})).toHaveValue('40');
  await r.getByRole('button', {name:'Piszkozat mentése',exact:true}).click();
  await expect(r).toContainText('A saját programot mentettük.');
  const days = api.calls.filter(c => c.method === 'PUT').at(-1)!.body.workouts;
  expect(days.map((day:any) => day.dayIndex)).toEqual([1,8,15]);
  expect(days[1].exercises[0].setTargets[0].targetWeightKg).toBe(50);
  expect(api.unexpected).toEqual([]);
});

test('Saját program: másik napra váltva sem menthető hibás sorozatcél', async ({page}) => {
  const api = await install(page);
  await page.goto('/user/personal-programs/7');
  const r = editor(page);
  await openProgramExercise(page);
  await r.getByLabel('Guggolás 2. Cél ism.', {exact:true}).fill('0');
  await selectProgramDay(page, 2);
  await r.getByRole('button', {name:'Piszkozat mentése',exact:true}).click();
  await expect(r).toContainText('Ellenőrizd az összes edzés nevét és sorozatait');
  await expect(r.getByLabel('Guggolás 2. Cél ism.', {exact:true})).toBeVisible();
  await expect(r.getByLabel('Guggolás 2. Cél ism.', {exact:true})).toHaveValue('0');
  expect(api.calls.filter(c => c.method === 'PUT')).toHaveLength(0);
  await selectProgramDay(page, 1);
  await openProgramExercise(page);
  await expect(r.getByLabel('Guggolás 2. Cél ism.', {exact:true})).toHaveValue('0');
  await r.getByLabel('Guggolás 2. Cél ism.', {exact:true}).fill('8');
  await r.getByRole('button', {name:'Piszkozat mentése',exact:true}).click();
  await expect(r).toContainText('A saját programot mentettük.');
  expect(api.unexpected).toEqual([]);
});

test('Külön listák: az önálló edzések és programok lekérése, navigációja és mobilnézete elkülönül', async ({ page }, info) => {
  const api = await install(page);
  api.standalone = true;
  api.program.durationDays = 1;
  api.program.name = 'Külön önálló edzés';
  const queries: string[] = [];
  page.on('request', request => {
    const url = new URL(request.url());
    if (url.pathname === `${ROOT}/page`) queries.push(url.searchParams.get('standalone') ?? 'missing');
    if (url.pathname === `${ROOT}/standalone/group-summaries`) queries.push('groups');
  });
  await page.goto('/user/personal-workouts');
  const list = page.locator('app-personal-programs');
  await expect(list.getByRole('heading', { name: 'Önálló edzéseim', exact: true })).toBeVisible();
  await expect(list.getByRole('heading', { name: api.program.name, exact: true })).toBeVisible();
  await expect(list.locator('select[name=kind]')).toHaveCount(0);
  expect(queries.at(-1)).toBe('groups');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `/tmp/separate-workouts-${info.project.name}.png`, fullPage: true });
  await list.getByRole('link', { name: 'Saját készítésű programok', exact: true }).click();
  await expect(page).toHaveURL(/\/personal-programs$/);
  await expect(list.getByRole('heading', { name: 'Saját készítésű programok', exact: true })).toBeVisible();
  await expect(list.getByRole('heading', { name: api.program.name, exact: true })).toHaveCount(0);
  await expect(list.getByRole('link', { name: 'Önálló edzés létrehozása', exact: true })).toHaveCount(0);
  expect(queries.at(-1)).toBe('false');
  await list.getByRole('link', { name: 'Önálló edzéseim', exact: true }).click();
  await expect(list.getByRole('heading', { name: api.program.name, exact: true })).toBeVisible();
  await list.getByRole('button', { name: 'Edzésalkalmak megtekintése (1)', exact: true }).click();
  await list.getByRole('link', { name: 'Edzés szerkesztése', exact: true }).click();
  await expect(page).toHaveURL(/\/personal-workouts\/7$/);
  await editor(page).getByRole('link', { name: 'Vissza az önálló edzéseimhez', exact: true }).click();
  await expect(page).toHaveURL(/\/personal-workouts$/);
  expect(queries.every(value => value === 'groups' || value === 'false')).toBe(true);
  expect(api.unexpected).toEqual([]);
});

test('Önálló edzések: egy csoportkártyán külön alkalmak és állapotszűrés', async ({ page }) => {
  const api = await install(page);
  api.standalone = true;
  api.started = true;
  api.program.durationDays = 1;
  const group = { groupId: 7, name: 'Otthoni R nap', description: null, occasions: [
    { id: 8, name: 'Otthoni R nap', description: null, startDate: '2030-01-05', scheduledDate: '2030-01-06', durationDays: 1,
      startedAt: '2026-10-25T12:00:00', standalone: true, status: 'planned', completedDate: null },
    { id: 7, name: 'Otthoni R nap', description: null, startDate: '2026-10-25', scheduledDate: '2026-10-25', durationDays: 1,
      startedAt: '2026-10-25T12:00:00', standalone: true, status: 'done', completedDate: '2026-10-25' },
  ] };
  let occasionReads = 0;
  await page.route('**/api/me/personal-programs/standalone/group-summaries?**', route => {
    const status = new URL(route.request().url()).searchParams.get('status');
    const summary = { groupId: group.groupId, name: group.name, description: group.description, total: 2,
      matchingTotal: status ? 1 : 2, draft: 0, planned: 1, inProgress: 0, done: 1,
      lastCompletedDate: '2026-10-25', nextDate: '2030-01-06', repeatSource: group.occasions[1] };
    return route.fulfill({ json: { success: true, data: { content: [summary], page: 0, size: 12, totalElements: 1, totalPages: 1 } } });
  });
  await page.route('**/api/me/personal-programs/standalone/groups/7/occasions?**', route => {
    occasionReads++;
    const status = new URL(route.request().url()).searchParams.get('status');
    const occasions = group.occasions.filter(item => !status || item.status === status);
    return route.fulfill({ json: { success: true, data: { content: occasions, page: 0, size: 12, totalElements: occasions.length, totalPages: 1 } } });
  });
  await page.goto('/user/personal-workouts');
  const list = page.locator('app-personal-programs');
  await expect(list.locator('app-card')).toHaveCount(1);
  await expect(list.getByRole('heading', { name: group.name, exact: true })).toHaveCount(1);
  await expect(list.getByRole('link', { name: 'Terv megtekintése', exact: true })).toHaveCount(0);
  expect(occasionReads).toBe(0);
  await expect(list.getByText('Következő edzés: 2030.01.06', { exact: true })).toBeVisible();
  await list.getByRole('button', { name: 'Edzésalkalmak megtekintése (2)', exact: true }).click();
  await expect(list.getByRole('link', { name: 'Terv megtekintése', exact: true })).toHaveCount(2);
  expect(occasionReads).toBe(1);
  const filtered = page.waitForRequest(request => new URL(request.url()).searchParams.get('status') === 'done');
  await list.getByRole('button', { name: 'Elvégzett', exact: true }).click();
  await filtered;
  await expect(list.getByRole('link', { name: 'Terv megtekintése', exact: true })).toHaveCount(1);
  await expect(list.getByRole('link', { name: 'Terv megtekintése', exact: true })).toHaveAttribute('href', '/user/personal-workouts/7');
  expect(occasionReads).toBe(2);
  expect(api.calls.filter(call => call.method !== 'GET' && call.path.startsWith(ROOT))).toHaveLength(0);
  expect(api.unexpected).toEqual([]);
});

test('Önálló edzés: saját listáról archiválható, és a szerkesztő is ugyanoda tér vissza', async ({ page }) => {
  const api = await install(page);
  api.standalone = true;
  api.started = true;
  api.program.durationDays = 1;
  await page.goto('/user/personal-workouts');
  const list = page.locator('app-personal-programs');
  await list.getByRole('button', { name: 'Edzésalkalmak megtekintése (1)', exact: true }).click();
  await list.getByText('További műveletek', { exact: true }).click();
  await list.getByRole('button', { name: 'Edzés archiválása', exact: true }).click();
  expect(api.calls.filter(call => call.method === 'DELETE')).toHaveLength(0);
  await page.getByRole('alertdialog').getByRole('button', { name: 'Mégse', exact: true }).click();
  await list.getByRole('link', { name: 'Terv megtekintése', exact: true }).click();
  await editor(page).getByRole('button', { name: 'Edzés archiválása', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Megerősítés', exact: true }).click();
  await expect(page).toHaveURL(/\/personal-workouts$/);
  expect(api.calls.filter(call => call.method === 'DELETE' && call.path === `${ROOT}/7`)).toHaveLength(1);
  expect(api.unexpected).toEqual([]);
});

test('Önálló edzés: a programokkal egyező lépések megőrzik az adatokat és a sorozatcélokat', async ({ page }, info) => {
  const api = await install(page);
  await page.goto('/user/personal-workouts/new');
  const root = editor(page);
  await expect(root.getByRole('button', { name: '1. Edzésadatok', exact: true })).toHaveAttribute('aria-current', 'step');
  await expect(root.getByRole('button', { name: 'Gyakorlat hozzáadása', exact: true })).toHaveCount(0);
  await expect(root.locator('app-personal-program-calendar')).toHaveCount(0);
  await root.getByLabel('Edzés neve', { exact: true }).fill('Önálló lábnap');
  await root.getByRole('button', { name: 'Tovább a gyakorlatokhoz', exact: true }).click();
  await expect(root.getByRole('button', { name: '2. Gyakorlatok', exact: true })).toHaveAttribute('aria-current', 'step');
  await expect(root.getByLabel('Edzés neve', { exact: true })).toBeHidden();
  await root.getByRole('button', { name: 'Gyakorlat hozzáadása', exact: true }).click();
  await page.locator('app-exercise-picker').getByRole('button', { name: 'Hozzáadás: Guggolás', exact: true }).click();
  const weight = root.getByLabel('Guggolás 1. Cél súly (kg)', { exact: true });
  await weight.fill('42.5');
  await root.getByLabel('Guggolás 1. Cél ism.', { exact: true }).fill('12');
  await expect(root.getByRole('heading', { name: 'Guggolás', exact: true })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: info.outputPath('standalone-exercise-targets.png'), fullPage: true });
  await root.getByRole('button', { name: '1. Edzésadatok', exact: true }).click();
  await expect(root.getByLabel('Edzés neve', { exact: true })).toHaveValue('Önálló lábnap');
  await expect(weight).toHaveCount(0);
  await root.getByRole('button', { name: '2. Gyakorlatok', exact: true }).click();
  await expect(root.getByRole('button', { name: 'Gyakorlat szerkesztése: Guggolás', exact: true })).toBeVisible();
  await root.getByRole('button', { name: 'Gyakorlat szerkesztése: Guggolás', exact: true }).click();
  await expect(weight).toHaveValue('42.5');
  await root.getByRole('button', { name: 'Edzés mentése', exact: true }).click();
  await expect(page).toHaveURL(/\/personal-workouts\/7$/);
  expect(api.program.workouts[0].exercises[0]).toMatchObject({
    setTargets: [
      { targetRepetitions: 12, targetWeightKg: 42.5 },
      { targetRepetitions: 10, targetWeightKg: null },
      { targetRepetitions: 10, targetWeightKg: null },
    ],
  });
  await root.getByRole('button', { name: '2. Gyakorlatok', exact: true }).click();
  await root.getByRole('button', { name: 'Gyakorlat szerkesztése: Guggolás', exact: true }).click();
  await expect(weight).toHaveValue('42.5');
  expect(api.calls.filter(call => call.path.endsWith('/start'))).toHaveLength(0);
  expect(api.unexpected).toEqual([]);
});

test('Önálló edzés: az elindított terv ugyanazokon a lépéseken olvasható, céljai zároltak', async ({ page }) => {
  const api = await openStartedStandalone(page);
  const root = editor(page);
  await root.getByRole('button', { name: 'Gyakorlatok megtekintése', exact: true }).click();
  await expect(root.getByRole('button', { name: 'Gyakorlat hozzáadása', exact: true })).toHaveCount(0);
  await root.getByRole('button', { name: 'Gyakorlat szerkesztése: Guggolás', exact: true }).click();
  await expect(root.getByLabel('Guggolás 1. Cél súly (kg)', { exact: true })).toBeDisabled();
  await expect(root.getByRole('button', { name: 'Edzés mentése', exact: true })).toHaveCount(0);
  expect(api.calls.filter(call => call.method === 'PUT' || call.method === 'DELETE')).toHaveLength(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('Önálló edzés: a dashboard a saját listára vezet, onnan nyílik az új szerkesztő', async ({ page }, info) => {
  const api = await install(page);
  await page.goto('/user/dashboard');
  await page.locator('app-user-dashboard').getByRole('button', { name: 'Önálló edzéseim', exact: true }).click();
  await expect(page).toHaveURL(/\/personal-workouts$/);
  await page.locator('app-personal-programs').getByRole('link', { name: 'Önálló edzés létrehozása', exact: true }).click();
  const root = editor(page);
  await expect(root.getByRole('button', { name: '1. Edzésadatok', exact: true })).toBeVisible();
  await expect(root.getByRole('button', { name: 'Tovább a gyakorlatokhoz', exact: true })).toBeVisible();
  await expect(root.getByRole('link', { name: 'Vissza az önálló edzéseimhez', exact: true })).toBeVisible();
  const breadcrumb = page.getByRole('navigation', { name: 'Navigációs útvonal', exact: true });
  await expect(breadcrumb.getByRole('link', { name: 'Önálló edzéseim', exact: true })).toHaveAttribute('href', '/user/personal-workouts');
  await expect(breadcrumb.getByRole('link', { name: 'Saját készítésű programok', exact: true })).toHaveCount(0);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: `/tmp/standalone-new-editor-${info.project.name}.png`, fullPage: true });
  expect(api.unexpected).toEqual([]);
});

test('Saját program: foglalt dátumnál ugyanaz az edzés marad szerkeszthető', { tag: '@ci-workouts' }, async ({ page }) => {
  const api = await install(page);
  await page.clock.setFixedTime(new Date('2026-10-24T12:00:00+02:00'));
  api.program.startDate = START_DATE;
  api.program.workouts.push({ ...structuredClone(api.program.workouts[0]), dayIndex: 2, name: 'Második nap' });
  await page.goto('/user/personal-programs/7');
  await selectProgramDay(page, 2);
  const root = editor(page);
  await root.getByRole('button', { name: 'Edzés szerkesztése', exact: true }).click();
  const date = root.getByLabel('Edzés dátuma', { exact: true });
  await date.fill(START_DATE);
  await expect(date).toHaveValue('2026-10-26');
  await expect(root.getByLabel('Edzés neve', { exact: true })).toHaveValue('Második nap');
  await expect(root).toContainText('Válassz szabad dátumot');
  expect(api.calls.filter(call => call.method === 'PUT')).toHaveLength(0);
  await date.fill('2026-10-27');
  await root.getByRole('button', { name: 'Piszkozat mentése', exact: true }).click();
  await expect(root).toContainText('A saját programot mentettük.');
  expect(api.program.workouts.map(day => [day.dayIndex, day.name])).toEqual([[1, 'Első nap'], [3, 'Második nap']]);
  expect(api.unexpected).toEqual([]);
});

test('Saját program: rövidítés után a naptárból kilógó edzés javítható és menthető', async ({ page }) => {
  const api = await install(page);
  await page.clock.setFixedTime(new Date('2026-10-24T12:00:00+02:00'));
  api.program.startDate = START_DATE;
  api.program.workouts.push({ ...structuredClone(api.program.workouts[0]), dayIndex: 7, name: 'Hetedik nap' });
  await page.goto('/user/personal-programs/7');
  const root = editor(page);
  await root.getByLabel('Időtartam (nap)', { exact: true }).fill('3');
  await expect(root.locator('[data-personal-program-day="7"]')).toHaveCount(0);
  await root.getByRole('button', { name: 'Edzés szerkesztése: Hetedik nap', exact: true }).click();
  await expect(root.getByLabel('Edzés neve', { exact: true })).toHaveValue('Hetedik nap');
  await root.getByLabel('Edzés dátuma', { exact: true }).fill('2026-10-27');
  await root.getByRole('button', { name: 'Piszkozat mentése', exact: true }).click();
  await expect(root).toContainText('A saját programot mentettük.');
  expect(api.program.durationDays).toBe(3);
  expect(api.program.workouts.map(day => day.dayIndex)).toEqual([1, 3]);
  expect(api.unexpected).toEqual([]);
});

for (const standalone of [false, true]) {
  test(`${standalone ? 'Önálló edzés' : 'Saját program'}: sikertelen szerkesztőbetöltés helyben újrapróbálható`, async ({ page }) => {
    const api = await install(page);
    api.standalone = standalone;
    if (standalone) api.program.durationDays = 1;
    let failing = true;
    await page.route('**/api/me/personal-programs/7*', async route => {
      const request = route.request();
      if (new URL(request.url()).pathname === `${ROOT}/7` && request.method() === 'GET' && failing)
        return route.fulfill({ status: 503, json: { success: false, message: 'Átmeneti szerkesztőbetöltési hiba' } });
      await route.fallback();
    });
    const path = standalone ? '/user/personal-workouts/7' : '/user/personal-programs/7';
    await page.goto(path);
    const root = editor(page);
    await expect(root).toContainText('Átmeneti szerkesztőbetöltési hiba');
    await expect(root.locator('form')).toHaveCount(0);
    await expect(root.getByRole('button', { name: standalone ? 'Edzés indítása' : 'Program indítása', exact: true })).toHaveCount(0);
    failing = false;
    await root.getByRole('button', { name: 'Újrapróbálás', exact: true }).click();
    await expect(root.getByLabel(standalone ? 'Edzés neve' : 'Program neve', { exact: true })).toHaveValue('Saját terv');
    await expect(root.getByRole('button', { name: 'Újrapróbálás', exact: true })).toHaveCount(0);
    await expect(page).toHaveURL(path);
    expect(api.calls.filter(call => call.method !== 'GET' && !call.path.endsWith('/refresh'))).toHaveLength(0);
    expect(api.unexpected).toEqual([]);
  });
}

test('Saját program: heti ismétlés hibás időtartammal nem készít másolatokat', async ({ page }) => {
  const api = await install(page);
  await page.goto('/user/personal-programs/7');
  const root = editor(page);
  await root.locator('input[name=durationDays]').fill('1000000000');
  await root.getByRole('button', { name: '2. Edzésnap', exact: true }).click();
  await root.getByRole('button', { name: 'Ismétlés hetente', exact: true }).click();
  await root.getByRole('button', { name: 'Másolás megerősítése', exact: true }).click();
  await expect(root).toContainText('Ellenőrizd a kötelező és hibás mezőket');
  await root.getByRole('button', { name: '1. Naptár és programadatok', exact: true }).click();
  await expect(root).toContainText('1 edzésnap');
  await root.locator('input[name=durationDays]').fill('21');
  await root.getByRole('button', { name: '2. Edzésnap', exact: true }).click();
  await root.getByRole('button', { name: 'Ismétlés hetente', exact: true }).click();
  await root.getByRole('button', { name: 'Másolás megerősítése', exact: true }).click();
  await root.getByRole('button', { name: 'Piszkozat mentése', exact: true }).click();
  await expect(root).toContainText('A saját programot mentettük.');
  expect(api.program.workouts.map(day => day.dayIndex)).toEqual([1, 8, 15]);
  expect(api.calls.filter(call => call.method === 'PUT')).toHaveLength(1);
  expect(api.unexpected).toEqual([]);
});

for (const standalone of [false, true]) {
  test(`${standalone ? 'Önálló edzés' : 'Saját program'}: egyszerű útmutatás és valós összegzés az eltérő sorozatcélokról`, async ({ page }, info) => {
    const api = await install(page);
    api.standalone = standalone;
    if (standalone) api.program.durationDays = 1;
    (api.program.workouts[0].exercises[0] as any).setTargets = [12, 8, 10].map((reps, index) => ({
      targetRepetitions: reps, targetWeightKg: 40 + index * 5, restSeconds: 60, targetRpe: null, notes: null,
    }));
    await page.goto(standalone ? '/user/personal-workouts/7' : '/user/personal-programs/7');
    const root = editor(page);
    const limits = root.locator('details').filter({ hasText: 'Terv méretkorlátai' });
    await expect(limits.locator('p')).toBeHidden();
    await limits.locator('summary').click();
    await expect(limits.locator('p')).toBeVisible();
    await limits.locator('summary').click();
    await expect(root.getByRole('heading', { name: 'Következő lépés', exact: true })).toBeVisible();
    await expect(root).toContainText('A terv mentve és indítható');
    await expect(root.getByRole('heading', { name: 'További műveletek', exact: true })).toBeVisible();
    await expect(root.getByRole('button', { name: standalone ? 'Edzés törlése' : 'Program törlése', exact: true })).toBeVisible();
    await expect(root.getByRole('button', { name: standalone ? 'Mentés edzéssablonként' : 'Másolat készítése', exact: true })).toBeVisible();
    await root.getByRole('button', { name: standalone ? '2. Gyakorlatok' : '2. Edzésnap', exact: true }).click();
    const exercise = root.getByRole('button', { name: 'Gyakorlat szerkesztése: Guggolás', exact: true });
    await expect(exercise).toContainText('3 sorozat · eltérő célértékek');
    await expect(exercise).not.toContainText('40 kg');
    await exercise.click();
    await expect(root.getByLabel('Guggolás 1. Cél ism.', { exact: true })).toHaveValue('12');
    await expect(root.getByLabel('Guggolás 2. Cél ism.', { exact: true })).toHaveValue('8');
    await root.getByRole('button', { name: 'Kész, vissza a gyakorlatokhoz', exact: true }).click();
    await expect(exercise).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: `/tmp/personal-simplified-${standalone ? 'workout' : 'program'}-${info.project.name}.png`, fullPage: true });
    expect(api.calls.filter(call => call.method === 'PUT' || call.path.endsWith('/start'))).toHaveLength(0);
    expect(api.unexpected).toEqual([]);
  });
}

test('Saját program: teljesen foglalt heteknél nincs másolási művelet', async ({ page }) => {
  const api = await install(page);
  api.program.durationDays = 21;
  const original = structuredClone(api.program.workouts[0]);
  api.program.workouts = [1, 8, 15].map(dayIndex => ({ ...structuredClone(original), dayIndex }));
  await page.goto('/user/personal-programs/7');
  const root = editor(page);
  await root.getByRole('button', { name: '2. Edzésnap', exact: true }).click();
  await expect(root.getByRole('button', { name: 'Ismétlés hetente', exact: true })).toHaveCount(0);
  await expect(root.getByRole('button', { name: 'Piszkozat mentése', exact: true })).toBeDisabled();
  expect(api.program.workouts.map(day => day.dayIndex)).toEqual([1, 8, 15]);
  expect(api.calls.filter(call => call.method === 'PUT')).toHaveLength(0);
});

for (const standalone of [false, true]) {
  test(`${standalone ? 'Önálló edzés' : 'Saját program'}: a listáról készített másolat egyszer jön létre és megnyílik`, async ({ page }) => {
    const api = await install(page);
    api.standalone = standalone;
    api.started = true;
    if (standalone) api.program.durationDays = 1;
    await page.goto(standalone ? '/user/personal-workouts' : '/user/personal-programs');
    await page.locator('app-personal-programs').getByRole('button', {
      name: standalone ? 'Új, szerkeszthető alkalom' : 'Szerkeszthető másolat', exact: true,
    }).click();
    await expect(page).toHaveURL(standalone ? /\/personal-workouts\/8$/ : /\/personal-programs\/8$/);
    await expect(editor(page).getByLabel(standalone ? 'Edzés neve' : 'Program neve', { exact: true })).toBeEditable();
    expect(api.calls.filter(call => call.path.endsWith(standalone ? '/repeat' : '/copy'))).toHaveLength(1);
    expect(api.unexpected).toEqual([]);
  });
}


test('started program target draft protects back navigation and survives cancellation', async ({ page }) => {
  const api = await install(page);
  api.started = true;
  api.editableTargets = true;
  api.program.startDate = START_DATE;
  await page.goto('/user/personal-programs/7');
  await openProgramExercise(page);
  const weight = editor(page).getByRole('spinbutton', { name: 'Guggolás 1. Cél súly (kg)' });
  await weight.fill('42');
  await weight.blur();

  const back = editor(page).getByRole('link', { name: 'Vissza a saját programokhoz', exact: true });
  const dialog = page.getByRole('alertdialog');
  await back.click();
  await dialog.getByRole('button', { name: 'Mégse', exact: true }).click();
  await expect(page).toHaveURL(/personal-programs\/7$/);
  await expect(weight).toHaveValue('42');
  expect(await page.evaluate(() => {
    const event = new Event('beforeunload', { cancelable: true });
    window.dispatchEvent(event);
    return event.defaultPrevented;
  })).toBe(true);

  await back.click();
  await dialog.getByRole('button', { name: 'Megerősítés', exact: true }).click();
  await expect(page).toHaveURL(/personal-programs$/);
  expect(api.calls.filter(call => call.method === 'PUT')).toEqual([]);
});

test('started program target draft survives failed save and clears the sidebar guard after save', async ({ page }) => {
  const api = await install(page);
  api.started = true;
  api.editableTargets = true;
  api.failTargetSave = true;
  api.program.startDate = START_DATE;
  await page.goto('/user/personal-programs/7');
  await openProgramExercise(page);
  const root = editor(page);
  const weight = root.getByRole('spinbutton', { name: 'Guggolás 1. Cél súly (kg)' });
  const save = root.getByRole('button', { name: 'Célértékek mentése', exact: true });
  await weight.fill('42');
  await weight.blur();
  await save.click();
  await expect(root.getByText('A célértékek mentése sikertelen.', { exact: true })).toBeVisible();
  await expect(weight).toHaveValue('42');

  const sidebarLink = page.locator('#application-menu').getByRole('link', { name: 'Dashboard', exact: true });
  const openMenu = page.getByRole('button', { name: 'Menü megnyitása', exact: true });
  if (await openMenu.isVisible()) await openMenu.click();
  await sidebarLink.click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Mégse', exact: true }).click();
  await expect(weight).toHaveValue('42');

  api.failTargetSave = false;
  await save.click();
  await expect(root.getByText('Az edzés célértékeit elmentettük.', { exact: true })).toBeVisible();
  await expect(save).toBeDisabled();
  if (await openMenu.isVisible()) await openMenu.click();
  await sidebarLink.click();
  await expect(page).toHaveURL(/dashboard$/);
  await expect(page.getByRole('alertdialog')).toHaveCount(0);

  const writes = api.calls.filter(call => call.method === 'PUT');
  expect(writes).toHaveLength(2);
  expect(writes.map(call => call.path)).toEqual(Array(2).fill(`${ROOT}/7/days/1/targets`));
  expect(writes[0].body).toEqual(writes[1].body);
  expect(writes[1].body).toMatchObject({ expectedVersion: 1, exercises: [{ exerciseIndex: 0, sets: [
    { targetWeightKg: 42, targetRepetitions: 10, restSeconds: 60, targetRpe: null },
    { targetWeightKg: null, targetRepetitions: 10, restSeconds: 60, targetRpe: null },
    { targetWeightKg: null, targetRepetitions: 10, restSeconds: 60, targetRpe: null },
  ] }] });
});
