import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { apiFor, closeDb, currentUserId, db, login } from '../../helpers/e2e-next-3-helpers';
import { cleanupProgramListFixture, createProgramListFixture } from '../../helpers/program-list-fixture';
import { assertNoDataMutation, installReadOnlyGuard, navigateSpa, setTestLanguage } from '../../helpers/read-only';
test.describe.configure({ timeout: 120_000 });
test.afterAll(closeDb);
test('USER GUI: statistics pages match API/DB, next and previous preserve exact order', async ({ page }) => {
  await setTestLanguage(page);
  await login(page,'coach');
  const coachApi=await apiFor(page);
  try {
    const userId=await currentUserId();
    const f=await createProgramListFixture(coachApi,13,userId);
    try {
      const mutations = installReadOnlyGuard(page);
      await login(page,'user');
      const pending=page.waitForResponse(r=>r.request().method()==='GET' && new URL(r.url()).pathname===API_ENDPOINTS.statistics.userProgram);
      await navigateSpa(page,'/user/program-statistics');
      const response=await pending;
      expect(response.status()).toBe(200);
      const body=await response.json();
      expect(body.success).toBe(true);
      expect(Array.isArray(body.data?.programs)).toBe(true);
      const programs: {programId:number;programName:string}[]=body.data.programs;
      expect(programs.length).toBeGreaterThanOrEqual(13);
      const ids=programs.map(p=>p.programId);
      const dbIds=(await db().query("SELECT program_id FROM user_programs WHERE user_id=$1 AND status='assigned' ORDER BY program_id",[userId])).rows.map(r=>r.program_id);
      expect([...ids].sort((a,b)=>a-b)).toEqual(dbIds);
      for(const id of f.ids) expect(ids).toContain(id);
      // Oldalanként egy program (heti volumen és haladás részletesen), előre-hátra lapozással.
      const surface=page.locator('app-user-program-statistics');
      const cards=surface.getByTestId('statistics-program');
      const pager=surface.getByRole('navigation', { name: /^(program statisztikák lapozása|program statistics pages|programmstatistik blättern)$/i });
      const previous=pager.getByRole('button', { name: /^(előző program|previous program|vorheriges programm)$/i });
      const next=pager.getByRole('button', { name: /^(következő program|next program|nächstes programm)$/i });
      const assertPage=async(number:number)=>{
        await expect(cards).toHaveCount(1);
        await expect(cards).toHaveAttribute('data-program-id', String(programs[number-1].programId));
        await expect(cards.locator('h3')).toHaveText(programs[number-1].programName);
        await expect(pager).toContainText(`${number} / ${programs.length}`);
      };
      await assertPage(1);
      await expect(previous).toBeDisabled();
      await next.click(); await assertPage(2);
      await previous.click(); await assertPage(1);
      const rendered:number[]=[];
      for(let number=1;number<=programs.length;number++){
        if(number>1) await next.click();
        await assertPage(number);
        rendered.push(Number(await cards.getAttribute('data-program-id')));
      }
      expect(rendered).toEqual(ids);
      await expect(next).toBeDisabled();
      await assertNoDataMutation(mutations);
      expect((await db().query("SELECT program_id FROM user_programs WHERE user_id=$1 AND status='assigned' ORDER BY program_id",[userId])).rows.map(r=>r.program_id)).toEqual(dbIds);
    } finally { await cleanupProgramListFixture(coachApi,f); }
  } finally { await coachApi.dispose(); }
});
