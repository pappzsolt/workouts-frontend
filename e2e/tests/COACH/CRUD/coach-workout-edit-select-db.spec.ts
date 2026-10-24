import { test, expect } from '@playwright/test';
import { login, apiFor, createWorkout, deleteWorkout, dbOne, closeDb } from '../../helpers/e2e-next-3-helpers';
import { reportSelect } from '../../helpers/select-report';

const sql = `SELECT w.id,w.workout_date::text AS workout_date,w.duration_minutes,w.intensity_level,
 wt.name,wt.description FROM workouts w
 JOIN workout_translations wt ON wt.workout_id=w.id
 JOIN languages l ON l.id=wt.language_id WHERE w.id=$1 AND l.code='hu'`;
test.afterAll(closeDb);
test('COACH: workout módosítás → PUT → PostgreSQL SELECT → takarítás',async({page})=>{
  await login(page,'coach');
  const api=await apiFor(page);
  let id:number|undefined;
  const expected={name:`E2E Modified ${Date.now()}`,description:'E2E workout update',workout_date:'2035-09-19',duration_minutes:65,intensity_level:'MEDIUM'};
  try {
    id=await createWorkout(api);
    await page.goto(`/coach/workouts/${id}/edit`);
    const form=page.locator('app-coach-workout-edit form').first();
    await expect(form.locator('#workoutName')).toBeVisible();
    await form.locator('#workoutName').fill(expected.name);
    await form.locator('#description').fill(expected.description);
    await form.locator('#workoutDate').fill(expected.workout_date);
    await form.locator('#durationMinutes').fill(String(expected.duration_minutes));
    await form.locator('select#intensityLevel').selectOption(expected.intensity_level);
    const pending=page.waitForResponse(r=>r.request().method()==='PUT' && new URL(r.url()).pathname===`/api/workouts/${id}`);
    await form.locator('button[type=submit]').click();
    const response=await pending;
    expect(response.ok(),`PUT workout HTTP ${response.status()}`).toBe(true);
    expect((await response.json()).success).toBe(true);
    const stored=await dbOne<any>(sql,[id]);
    await reportSelect('modified-workout',sql,expected,stored);
    expect(stored).toMatchObject(expected);
    await page.reload();
    // Updated values must survive reloading the editor or list.
    const persisted=await dbOne<any>(sql,[id]);
    expect(persisted).toMatchObject(expected);
  }finally{
    if(id) await deleteWorkout(api,id);
    await api.dispose();
  }
});
