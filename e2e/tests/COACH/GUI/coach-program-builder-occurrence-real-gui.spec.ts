import { expect, test, type Page } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { apiFor, closeDb, createProgram, createWorkout, db, dbOne, deleteProgram, deleteWorkout, login, success, suffix } from '../../helpers/e2e-next-3-helpers';
import { addWorkoutThroughPicker } from '../../helpers/program-builder-workout-exercises';

test.describe.configure({ timeout: 120_000 });
test.afterAll(closeDb);

async function openExisting(page: Page, programId: number): Promise<void> {
  await page.goto(`/coach/program-builder?programId=${programId}`);
  await expect(page.locator('#programName')).toBeVisible();
  await page.locator('app-coach-program-builder').locator('button').filter({ hasText: /program módosítása|modify program/i }).click();
  await expect(page.locator('app-coach-program-builder-workouts')).toBeVisible();
}

async function assertApiAndDb(page: Page, programId: number, days: number[]): Promise<void> {
  const api=await apiFor(page);
  try {
    const body=await success(await api.get(API_ENDPOINTS.programWorkouts.base,{params:{programId}}),'Read GUI-created occurrences');
    expect(body.data.map((row:any)=>row.dayIndex).sort((a:number,b:number)=>a-b)).toEqual(days);
    expect((await db().query('SELECT day_index FROM program_workouts WHERE program_id=$1 ORDER BY day_index',[programId])).rows.map(row=>row.day_index)).toEqual(days);
    await expect(page.getByTestId('selected-workout')).toHaveCount(days.length);
    for(const day of days) await expect(page.getByTestId('selected-workout').filter({hasText:`${day}. nap`})).toHaveCount(1);
  } finally { await api.dispose(); }
}

test('New program: real form → page-two checkbox → add → repeated occurrence → UI/API/PostgreSQL', async ({ page }) => {
  await login(page,'coach'); const api=await apiFor(page);
  const prefix=`E2E PB PAGE ${suffix()}`;
  const workouts:{id:number;name:string}[]=[];
  let programId:number|undefined;
  try {
    for(let i=0;i<10;i++) { const name=`${prefix} ${String(i).padStart(2,'0')}`; workouts.push({id:await createWorkout(api,name),name}); }
    await page.goto('/coach/program-builder');
    await page.locator('#programName').fill(`E2E GUI Program ${suffix()}`);
    await page.locator('#programDescription').fill('Real form and picker regression');
    await page.locator('#startDate').fill('2035-03-15');
    await page.locator('#durationDays').fill('30');
    await page.locator('select#difficultyLevel').selectOption('BEGINNER');
    await expect(page.locator('#endDate')).toHaveValue('2035-04-13');
    const createdPromise=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname===API_ENDPOINTS.userPrograms.base);
    await page.locator('app-coach-program-builder').getByRole('button',{name:/program létrehozása|create program/i}).click();
    const created=await createdPromise; expect(created.status()).toBe(200);
    const body=await created.json(); expect(body.success).toBe(true); programId=Number(body.data); expect(programId).toBeGreaterThan(0);
    await expect(page.locator('app-coach-program-builder-workouts')).toBeVisible();
    await expect(page.getByTestId('selected-workout')).toHaveCount(0);
    expect((await db().query('SELECT id FROM program_workouts WHERE program_id=$1',[programId])).rows).toHaveLength(0);
    await page.getByTestId('open-workout-picker').click();
    const board=page.locator('app-coach-workout-board');
    const search=page.waitForResponse(r=>r.request().method()==='GET'&&new URL(r.url()).pathname===API_ENDPOINTS.workouts.mySearch&&new URL(r.url()).searchParams.get('search')===prefix);
    await board.locator('#workoutSearch').fill(prefix);
    const searched=await search; expect(searched.ok()).toBe(true);
    await expect(board.locator('app-pagination')).toContainText('1 / 2');
    await expect(board.locator(`#compact-workout-${workouts[9].id}`)).toHaveCount(0);
    const nextResponse=page.waitForResponse(r=>r.request().method()==='GET'&&new URL(r.url()).pathname===API_ENDPOINTS.workouts.mySearch&&new URL(r.url()).searchParams.get('page')==='1');
    await board.locator('app-pagination').getByRole('button',{name:/következő|next/i}).click();
    expect((await nextResponse).ok()).toBe(true);
    await expect(board.locator('app-pagination')).toContainText('2 / 2');
    await expect(board.locator(`#compact-workout-${workouts[9].id}`)).toBeVisible();
    // Helper performs selection and submission, starting from the first real page.
    await addWorkoutThroughPicker(page,programId!,workouts[9].id,workouts[9].name,1);
    await addWorkoutThroughPicker(page,programId!,workouts[9].id,workouts[9].name,2);
    await assertApiAndDb(page,programId!,[1,2]);
    const ids=(await db().query('SELECT id FROM program_workouts WHERE program_id=$1',[programId])).rows.map(row=>row.id);
    expect(new Set(ids).size).toBe(2);
    await expect(page.getByTestId('selected-workout').getByRole('heading',{name:workouts[9].name,exact:true})).toHaveCount(2);
  } finally {
    const errors:unknown[]=[];
    if(programId!==undefined) {try{await deleteProgram(api,programId);}catch(e){errors.push(e);}}
    for(const workout of workouts.reverse()){try{await deleteWorkout(api,workout.id);}catch(e){errors.push(e);}}
    await api.dispose(); if(errors.length)throw new AggregateError(errors,'GUI fixture cleanup');
  }
});

test('Existing sparse program: GUI add uses max+1; GUI delete preserves remaining schedule', async ({ page }) => {
  await login(page,'coach'); const api=await apiFor(page);
  const programId=await createProgram(api); const name=`E2E sparse ${suffix()}`; const workoutId=await createWorkout(api,name);
  try {
    // Baseline represents a genuinely existing program. Only the NEW relationship is the GUI operation under test.
    for(const dayIndex of [1,5,9,14]) await success(await api.post(API_ENDPOINTS.programWorkouts.base,{data:{programId,workoutId,dayIndex}}),'Existing program baseline');
    await openExisting(page,programId);
    await expect(page.getByTestId('selected-workout')).toHaveCount(4);
    await addWorkoutThroughPicker(page,programId,workoutId,name,15);
    const five=await dbOne<{id:number}>('SELECT id FROM program_workouts WHERE program_id=$1 AND day_index=5',[programId]); expect(five).not.toBeNull();
    const deletedPromise=page.waitForResponse(r=>r.request().method()==='DELETE'&&new URL(r.url()).pathname===API_ENDPOINTS.programWorkouts.deleteById(five!.id));
    await page.locator(`[data-testid="selected-workout"][data-occurrence-id="${five!.id}"]`).getByTestId('remove-workout-occurrence').click();
    const deleted=await deletedPromise; expect(deleted.status()).toBe(200); expect((await deleted.json()).success).toBe(true);
    await assertApiAndDb(page,programId,[1,9,14,15]);
    await page.reload();
    await openExisting(page,programId);
    await assertApiAndDb(page,programId,[1,9,14,15]);
  } finally {try{await deleteProgram(api,programId);}finally{try{await deleteWorkout(api,workoutId);}finally{await api.dispose();}}}
});

test('Real concurrent backend conflict: GUI shows 409 message and keeps DB relationship unchanged', async ({ page }) => {
  await login(page,'coach'); const api=await apiFor(page);
  const programId=await createProgram(api); const name=`E2E conflict ${suffix()}`; const workoutId=await createWorkout(api,name);
  try {
    await openExisting(page,programId);
    await expect(page.getByTestId('selected-workout')).toHaveCount(0);
    await page.getByTestId('open-workout-picker').click();
    const board=page.locator('app-coach-workout-board');
    const search=page.waitForResponse(r=>r.request().method()==='GET'&&new URL(r.url()).pathname===API_ENDPOINTS.workouts.mySearch&&new URL(r.url()).searchParams.get('search')===name);
    await board.locator('#workoutSearch').fill(name); expect((await search).ok()).toBe(true);
    await board.locator(`#compact-workout-${workoutId}`).check();
    // Another legitimate actor occupies day 1 after this GUI loaded its empty program.
    await success(await api.post(API_ENDPOINTS.programWorkouts.base,{data:{programId,workoutId,dayIndex:1}}),'Concurrent real API addition');
    const before=(await db().query('SELECT * FROM program_workouts WHERE program_id=$1 ORDER BY id',[programId])).rows;
    const rejectedPromise=page.waitForResponse(r=>r.request().method()==='POST'&&new URL(r.url()).pathname===API_ENDPOINTS.programWorkouts.base);
    await page.getByTestId('add-workouts-to-program').click();
    const response=await rejectedPromise; expect(response.status()).toBe(409);
    const error=await response.json(); expect(error.success).toBe(false); expect(error.message).toBeTruthy();
    await expect(page.locator('app-coach-program-builder-workouts > app-card app-message').first()).toContainText(error.message);
    expect((await db().query('SELECT * FROM program_workouts WHERE program_id=$1 ORDER BY id',[programId])).rows).toEqual(before);
    await expect(page.getByTestId('selected-workout')).toHaveCount(1);
  } finally {try{await deleteProgram(api,programId);}finally{try{await deleteWorkout(api,workoutId);}finally{await api.dispose();}}}
});
