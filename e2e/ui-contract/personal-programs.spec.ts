import { returningAccount } from './onboarding-fixture';
import { test, expect, type Page } from '@playwright/test';

const ROOT = '/api/me/personal-programs';
const draft = () => ({ name: 'Saját terv', description: null, durationDays: 7, startDate: null,
  difficultyLevel: null, languageCode: 'hu', expectedVersion: 1, workouts: [{ dayIndex: 1, name: 'Első nap', description: null,
    exercises: [{ exerciseId: 11, sets: 3, repetitions: 10, restSeconds: 60, notes: null }] }] });

async function install(page: Page) {
  await returningAccount(page, 'user', 42);
  const state = { program: draft(), id: 7, started: false, standalone: false, failSave: false, failList: false,
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
    if (path === `${ROOT}/${state.id}` && req.method() === 'GET') return ok({ id: state.id, standalone: state.standalone, startedAt: state.started ? '2026-10-25T12:00:00' : null, program: state.program });
    if (path === `${ROOT}/${state.id}` && req.method() === 'PUT') {
      if (call.body.expectedVersion !== state.program.expectedVersion) return route.fulfill({ status: 409, json: { success: false, message: 'A saját programot időközben módosították. A szerkesztésed megmaradt.' } });
      if (state.failSave) return route.fulfill({ status: 409, json: { success: false, message: 'A mentés most nem sikerült.' } });
      state.program={...call.body,expectedVersion:state.program.expectedVersion+1}; return ok({id:state.id,standalone:state.standalone,startedAt:null,program:state.program});
    }
    if (path === `${ROOT}/${state.id}` && req.method() === 'DELETE') return ok(state.id);
    if (path === `${ROOT}/${state.id}/start`) { state.started=true; state.program={...state.program,startDate:'2026-10-25'} as typeof state.program; return ok({id:state.id,standalone:state.standalone,startedAt:'2026-10-25T12:00:00',program:state.program}); }
    if (path === `${ROOT}/${state.id}/copy`) { state.id++; state.started=false; return ok(state.id); }
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
  await expect(editor(page).getByRole('button', { name: 'Program törlése', exact: true })).toBeVisible();
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

test('Saját program: hibás nap és nem mentett változások védelme', async ({ page }) => {
  const api=await install(page);
  await page.goto('/user/personal-programs/7');
  await selectProgramDay(page, 2);
  await editor(page).getByRole('button', { name: 'Edzésnap hozzáadása', exact: true }).click();
  await editor(page).getByLabel('Edzés neve', { exact: true }).fill('Második nap');
  await editor(page).getByLabel('Nap sorszáma', { exact: true }).fill('1');
  await editor(page).getByRole('button', { name: 'Piszkozat mentése', exact: true }).click();
  await expect(editor(page)).toContainText('Minden edzésnap sorszáma legyen egyedi');
  expect(api.calls.filter(c => c.method === 'PUT')).toHaveLength(0);
  await editor(page).getByRole('link', { name: 'Vissza a saját programokhoz', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Mégse', exact: true }).click();
  await expect(page).toHaveURL(/personal-programs\/7$/);
  await expect(editor(page)).toContainText('Minden edzésnap sorszáma legyen egyedi');
  expect(api.calls.filter(c => c.method === 'PUT')).toHaveLength(0);
  await editor(page).getByRole('link', { name: 'Vissza a saját programokhoz', exact: true }).click();
  await page.getByRole('alertdialog').getByRole('button', { name: 'Megerősítés', exact: true }).click();
  await expect(page).toHaveURL(/personal-programs$/);
  expect(api.unexpected).toEqual([]);
});

test('Saját program: sikertelen mentés megőrzi az adatokat és újrapróbálható', async ({ page }) => {
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

test('Saját program: régi verzió mentése nem veszít adatot', async ({ page }) => {
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
  });
  await page.goto('/user/personal-workouts');
  const list = page.locator('app-personal-programs');
  await expect(list.getByRole('heading', { name: 'Önálló edzéseim', exact: true })).toBeVisible();
  await expect(list.getByRole('heading', { name: api.program.name, exact: true })).toBeVisible();
  await expect(list.locator('select[name=kind]')).toHaveCount(0);
  expect(queries.at(-1)).toBe('true');
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
  await list.getByRole('link', { name: 'Edzés szerkesztése', exact: true }).click();
  await expect(page).toHaveURL(/\/personal-workouts\/7$/);
  await editor(page).getByRole('link', { name: 'Vissza az önálló edzéseimhez', exact: true }).click();
  await expect(page).toHaveURL(/\/personal-workouts$/);
  expect(queries.every(value => value === 'true' || value === 'false')).toBe(true);
  expect(api.unexpected).toEqual([]);
});

test('Önálló edzés: saját listáról archiválható, és a szerkesztő is ugyanoda tér vissza', async ({ page }) => {
  const api = await install(page);
  api.standalone = true;
  api.started = true;
  api.program.durationDays = 1;
  await page.goto('/user/personal-workouts');
  const list = page.locator('app-personal-programs');
  await list.getByRole('button', { name: 'Edzés archiválása', exact: true }).click();
  expect(api.calls.filter(call => call.method === 'DELETE')).toHaveLength(0);
  await page.getByRole('alertdialog').getByRole('button', { name: 'Mégse', exact: true }).click();
  await list.getByRole('link', { name: 'Megnyitás', exact: true }).click();
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

test('Saját program: ütköző napsorszámnál ugyanaz az edzés marad szerkeszthető', async ({ page }) => {
  const api = await install(page);
  api.program.workouts.push({ ...structuredClone(api.program.workouts[0]), dayIndex: 2, name: 'Második nap' });
  await page.goto('/user/personal-programs/7');
  await selectProgramDay(page, 2);
  const root = editor(page);
  await root.getByRole('button', { name: 'Edzés szerkesztése', exact: true }).click();
  await root.getByLabel('Nap sorszáma', { exact: true }).fill('1');
  await expect(root.getByLabel('Edzés neve', { exact: true })).toHaveValue('Második nap');
  await root.getByRole('button', { name: 'Piszkozat mentése', exact: true }).click();
  await expect(root).toContainText('Minden edzésnap sorszáma legyen egyedi');
  expect(api.calls.filter(call => call.method === 'PUT')).toHaveLength(0);
  // A user can leave this screen and still recover either conflicting draft.
  await root.getByRole('button', { name: '1. Naptár és programadatok', exact: true }).click();
  await root.getByRole('button', { name: 'Edzés szerkesztése: Második nap', exact: true }).click();
  await expect(root.getByLabel('Edzés neve', { exact: true })).toHaveValue('Második nap');
  await root.getByLabel('Nap sorszáma', { exact: true }).fill('3');
  await root.getByRole('button', { name: 'Piszkozat mentése', exact: true }).click();
  await expect(root).toContainText('A saját programot mentettük.');
  expect(api.program.workouts.map(day => [day.dayIndex, day.name])).toEqual([[1, 'Első nap'], [3, 'Második nap']]);
  expect(api.unexpected).toEqual([]);
});

test('Saját program: rövidítés után a naptárból kilógó edzés javítható és menthető', async ({ page }) => {
  const api = await install(page);
  api.program.workouts.push({ ...structuredClone(api.program.workouts[0]), dayIndex: 7, name: 'Hetedik nap' });
  await page.goto('/user/personal-programs/7');
  const root = editor(page);
  await root.getByLabel('Időtartam (nap)', { exact: true }).fill('3');
  await expect(root.locator('[data-personal-program-day="7"]')).toHaveCount(0);
  await root.getByRole('button', { name: 'Edzés szerkesztése: Hetedik nap', exact: true }).click();
  await expect(root.getByLabel('Edzés neve', { exact: true })).toHaveValue('Hetedik nap');
  await root.getByLabel('Nap sorszáma', { exact: true }).fill('3');
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

test('Saját program: heti ismétlés hibás időtartammal és napsorszámmal nem készít másolatokat', async ({ page }) => {
  const api = await install(page);
  await page.goto('/user/personal-programs/7');
  const root = editor(page);
  await root.locator('input[name=durationDays]').fill('1000000000');
  await root.getByRole('button', { name: '2. Edzésnap', exact: true }).click();
  await root.getByRole('button', { name: 'Ismétlés hetente', exact: true }).click();
  await expect(root).toContainText('Ellenőrizd a kötelező és hibás mezőket');
  await root.getByRole('button', { name: '1. Naptár és programadatok', exact: true }).click();
  await expect(root).toContainText('1 edzésnap');
  await root.locator('input[name=durationDays]').fill('21');
  await root.getByRole('button', { name: '2. Edzésnap', exact: true }).click();
  await root.getByRole('spinbutton', { name: /^Nap sorszáma/ }).fill('');
  await root.getByRole('button', { name: 'Ismétlés hetente', exact: true }).click();
  await expect(root).toContainText('Minden edzésnap sorszáma legyen egyedi');
  await root.getByRole('spinbutton', { name: /^Nap sorszáma/ }).fill('1');
  await root.getByRole('button', { name: 'Ismétlés hetente', exact: true }).click();
  await root.getByRole('button', { name: 'Piszkozat mentése', exact: true }).click();
  await expect(root).toContainText('A saját programot mentettük.');
  expect(api.program.workouts.map(day => day.dayIndex)).toEqual([1, 8, 15]);
  expect(api.calls.filter(call => call.method === 'PUT')).toHaveLength(1);
  expect(api.unexpected).toEqual([]);
});
