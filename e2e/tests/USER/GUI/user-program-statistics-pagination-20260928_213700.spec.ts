import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { apiFor, closeDb, currentUserId, db, login } from '../../helpers/e2e-next-3-helpers';
import { cleanupProgramListFixture, createProgramListFixture } from '../../helpers/program-list-fixture';
import { navigateSpa, setTestLanguage } from '../../helpers/read-only';
test.describe.configure({ timeout: 120_000 });
test.afterAll(closeDb);
test('USER GUI: statistics pages match API/DB, next and previous preserve exact order', async ({ page }) => {
  await setTestLanguage(page);
  await login(page,'coach');
  const coachApi=await apiFor(page);
  try {
    const userId=await currentUserId();
    const f=await createProgramListFixture(coachApi,7,userId);
    try {
      await login(page,'user');
      const pending=page.waitForResponse(r=>r.request().method()==='GET' && new URL(r.url()).pathname===API_ENDPOINTS.statistics.userProgram);
      await navigateSpa(page,'/user/program-statistics');
      const response=await pending;
      expect(response.status()).toBe(200);
      const body=await response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data?.programs)).toBe(true);
      const programs: {programId:number;programName:string}[]=body.data.programs;
      expect(programs.length).toBeGreaterThanOrEqual(7);
      const ids=programs.map(p=>p.programId);
      const dbIds=(await db().query("SELECT program_id FROM user_programs WHERE user_id=$1 AND status='assigned' ORDER BY program_id",[userId])).rows.map(r=>r.program_id);
      expect([...ids].sort((a,b)=>a-b)).toEqual(dbIds);
      for(const id of f.ids) expect(ids).toContain(id);
      const surface=page.locator('app-user-program-statistics');
      const cards=surface.getByTestId('statistics-program');
      const pager=surface.locator('app-pagination');
      const previous=pager.getByRole('button').first();
      const next=pager.getByRole('button').last();
      const assertPage=async(number:number)=>{
        const expected=programs.slice((number-1)*6,number*6);
        await expect(cards).toHaveCount(expected.length);
        await expect.poll(()=>cards.evaluateAll(els=>els.map(el=>Number(el.getAttribute('data-program-id'))))).toEqual(expected.map(p=>p.programId));
        await expect(cards.locator('h3')).toHaveText(expected.map(p=>p.programName));
        await expect(pager).toContainText(`${number} / ${Math.ceil(programs.length/6)}`);
      };
      await assertPage(1);
      await expect(previous).toBeDisabled();
      await next.click(); await assertPage(2);
      await previous.click(); await assertPage(1);
      const rendered:number[]=[];
      for(let number=1;number<=Math.ceil(programs.length/6);number++){
        if(number>1) await next.click();
        await assertPage(number);
        rendered.push(...await cards.evaluateAll(els=>els.map(el=>Number(el.getAttribute('data-program-id')))));
      }
      expect(rendered).toEqual(ids);
      await expect(next).toBeDisabled();
      expect((await db().query("SELECT program_id FROM user_programs WHERE user_id=$1 AND status='assigned' ORDER BY program_id",[userId])).rows.map(r=>r.program_id)).toEqual(dbIds);
    } finally { await cleanupProgramListFixture(coachApi,f); }
  } finally { await coachApi.dispose(); }
});
