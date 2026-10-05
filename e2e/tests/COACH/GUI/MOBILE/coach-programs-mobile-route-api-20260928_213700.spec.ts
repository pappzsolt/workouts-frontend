import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../../helpers/api-endpoints';
import { apiFor, closeDb, db, login } from '../../../helpers/e2e-next-3-helpers';
import { cleanupProgramListFixture, createProgramListFixture } from '../../../helpers/program-list-fixture';
import { navigateSpa, setTestLanguage } from '../../../helpers/read-only';
test.use({viewport:{width:390,height:844},isMobile:true,hasTouch:true});
test.describe.configure({timeout:90_000});
test.afterAll(closeDb);
test('COACH MOBILE GUI: fixture list matches real API and PostgreSQL; no empty-state alternative',async({page})=>{
  await setTestLanguage(page); await login(page,'coach');
  const api=await apiFor(page);
  try {
    const f=await createProgramListFixture(api,2);
    try {
      const initial=page.waitForResponse(r=>r.request().method()==='GET' && new URL(r.url()).pathname===API_ENDPOINTS.programs.coachSearch);
      await navigateSpa(page,'/coach/programs');
      expect((await initial).status()).toBe(200);
      const pending=page.waitForResponse(r=>r.request().method()==='GET' && new URL(r.url()).pathname===API_ENDPOINTS.programs.coachSearch && new URL(r.url()).searchParams.get('search')===f.prefix);
      await page.locator('#programSearch').fill(f.prefix);
      const response=await pending;
      expect(response.status()).toBe(200);
      const body=await response.json();
      expect(Array.isArray(body.content)).toBe(true);
      expect(body.totalElements).toBe(2);
      expect(body.content.map((p:{programId:number})=>p.programId).sort((a:number,b:number)=>a-b)).toEqual([...f.ids].sort((a,b)=>a-b));
      const cards=page.getByTestId('coach-program');
      await expect(cards).toHaveCount(2);
      await expect(cards.locator('h3')).toHaveText(body.content.map((p:{programName:string})=>p.programName));
      await expect.poll(()=>cards.evaluateAll(els=>els.map(el=>Number(el.getAttribute('data-program-id'))))).toEqual(body.content.map((p:{programId:number})=>p.programId));
      for(const name of f.names) await expect(cards.getByRole('heading',{name,exact:true})).toBeVisible();
      const persisted=await db().query('SELECT p.id FROM programs p JOIN coaches c ON c.id=p.coach_id WHERE p.id=ANY($1::int[]) AND c.name=$2 ORDER BY p.id',[f.ids,process.env.E2E_COACH_USERNAME]);
      expect(persisted.rows.map(r=>r.id)).toEqual([...f.ids].sort((a,b)=>a-b));
      expect(await page.locator('body').evaluate(el=>el.scrollWidth)).toBeLessThanOrEqual(391);
      for(let i=0;i<2;i++) expect(await cards.nth(i).evaluate(el=>el.getBoundingClientRect().width)).toBeLessThanOrEqual(390);
    } finally { await cleanupProgramListFixture(api,f); }
  } finally { await api.dispose(); }
});
