import { test, expect, dbOne, success, closeDb } from '../../helpers/coach-workspace-fixture';
import { API_ENDPOINTS as E } from '../../helpers/api-endpoints';
import { login, apiFor, deleteProgram, suffix } from '../../helpers/e2e-next-3-helpers';
import { reportSelect } from '../../helpers/select-report';

const sql = `SELECT p.id, p.start_date::text AS start_date, p.duration_days,
 p.difficulty_level, pt.name, pt.description
 FROM programs p JOIN program_translations pt ON pt.program_id=p.id
 JOIN languages l ON l.id=pt.language_id
 WHERE p.id=$1 AND l.code='hu'`;
test.afterAll(closeDb);
test('COACH: új program → mentés → PostgreSQL SELECT → takarítás', async ({ page }) => {
  await login(page,'coach');
  const api = await apiFor(page);
  let createdId: number | undefined;
  const expected = { name:`E2E Program ${suffix()}`, description:'E2E create SELECT', start_date:'2035-06-04', duration_days:14 };
  try {
    await page.goto('/coach/programs/new');
    const root=page.locator('app-coach-program-editor');
    await root.locator('[name=programName]').fill(expected.name);
    await root.locator('[name=programDescription]').fill(expected.description);
    await root.locator('[name=startDate]').fill(expected.start_date);
    await root.locator('[name=durationDays]').fill(String(expected.duration_days));
    await root.getByRole('radio', {name:'Profi',exact:true}).check();
    const pending=page.waitForResponse(r=>r.request().method()==='POST' && new URL(r.url()).pathname===E.userPrograms.base);
    await root.getByRole('button',{name:'Létrehozás',exact:true}).click();
    const body=await success(await pending,'Create program');
    createdId=Number(body.data);
    expect(Number.isSafeInteger(createdId) && createdId>0).toBe(true);
    await expect(page).toHaveURL(new RegExp(`/coach/programs/${createdId}$`));
    const stored=await dbOne<any>(sql,[createdId]);
    await reportSelect('new-program',sql,expected,stored);
    expect(stored).toMatchObject(expected);
    expect(stored?.difficulty_level).toBeTruthy();
  } finally {
    if(createdId) await deleteProgram(api,createdId);
    await api.dispose();
  }
});
