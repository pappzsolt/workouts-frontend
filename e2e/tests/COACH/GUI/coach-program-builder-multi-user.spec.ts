import { expect, test, type Response } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { anotherCoachClientUserId, apiFor, closeDb, coachUserId, db, login, success } from '../../helpers/e2e-next-3-helpers';
import { cleanupProgramListFixture, createProgramListFixture } from '../../helpers/program-list-fixture';
import { setTestLanguage } from '../../helpers/read-only';

test.describe.configure({ timeout: 90_000 });
test.afterAll(closeDb);
test('Builder: two GUI-selected users persist; reload retains both without repeating assignment', async ({ page }) => {
  await setTestLanguage(page);
  await login(page, 'coach');
  const api = await apiFor(page);
  try {
    const f = await createProgramListFixture(api, 1);
    try {
      const programId = f.ids[0];
      const first = await coachUserId();
      const second = await anotherCoachClientUserId(first);
      const open = async () => {
        await page.goto(`/coach/program-builder?programId=${programId}`);
        await expect(page.locator('#programName')).toBeVisible();
        await page.locator('app-coach-program-builder').getByRole('button', { name: /program módosítása|modify program/i }).click();
        await expect(page.getByTestId('program-users')).toBeVisible();
      };
      await open();
      const firstCheckbox = page.getByTestId('program-users').locator(`[data-user-id="${first}"]`);
      const secondCheckbox = page.getByTestId('program-users').locator(`[data-user-id="${second}"]`);
      await expect(firstCheckbox).toBeEnabled();
      await expect(secondCheckbox).toBeEnabled();
      await firstCheckbox.check();
      await secondCheckbox.check();
      await expect(firstCheckbox).toBeChecked();
      await expect(secondCheckbox).toBeChecked();
      const responses: Response[] = [];
      page.on('response', response => {
        if (response.request().method() === 'POST' && new URL(response.url()).pathname === API_ENDPOINTS.programs.assign) responses.push(response);
      });
      await page.getByTestId('finish-program').click();
      await expect(page).toHaveURL(/\/coach\/dashboard\?/);
      expect(responses).toHaveLength(2);
      expect(responses.map(response => response.request().postDataJSON().userId)).toEqual([first, second]);
      for (const response of responses) {
        expect(response.status()).toBe(200);
        expect((await response.json()).success).toBe(true);
      }
      const assigned = await success(await api.get(API_ENDPOINTS.programs.assignedUsers(programId)), 'Read GUI-created assignments');
      expect([...assigned.data].sort((a: number, b: number) => a-b)).toEqual([first, second].sort((a,b)=>a-b));
      const snapshot = (await db().query('SELECT id,user_id,status,assigned_at::text FROM user_programs WHERE program_id=$1 ORDER BY user_id', [programId])).rows;
      expect(snapshot.map(row => row.user_id)).toEqual([first, second].sort((a,b)=>a-b));
      expect(snapshot.every(row => row.status === 'assigned')).toBe(true);
      await open();
      await expect(firstCheckbox).toBeChecked();
      await expect(secondCheckbox).toBeChecked();
      await expect(firstCheckbox).toBeDisabled();
      await expect(secondCheckbox).toBeDisabled();
      await expect(page.getByTestId('finish-program')).toBeEnabled();
      await page.getByTestId('finish-program').click();
      await expect(page).toHaveURL(/\/coach\/dashboard\?/);
      expect(responses).toHaveLength(2);
      expect((await db().query('SELECT id,user_id,status,assigned_at::text FROM user_programs WHERE program_id=$1 ORDER BY user_id', [programId])).rows).toEqual(snapshot);
    } finally { await cleanupProgramListFixture(api, f); }
  } finally { await api.dispose(); }
});

test('Existing Builder: adding a second user preserves the first assignment and sends only the new ID', async ({ page }) => {
  await setTestLanguage(page);
  await login(page, 'coach');
  const api = await apiFor(page);
  try {
    const f = await createProgramListFixture(api, 1);
    try {
      const programId = f.ids[0];
      const first = await coachUserId();
      const second = await anotherCoachClientUserId(first);
      await success(await api.post(API_ENDPOINTS.programs.assign, { data: { programId, userId: first } }), 'Prepare existing assignment');
      const original = (await db().query('SELECT id,user_id,status,assigned_at::text FROM user_programs WHERE program_id=$1 AND user_id=$2', [programId, first])).rows;
      expect(original).toHaveLength(1);
      await page.goto(`/coach/program-builder?programId=${programId}`);
      await page.locator('app-coach-program-builder').getByRole('button', { name: /program módosítása|modify program/i }).click();
      const users = page.getByTestId('program-users');
      const existing = users.locator(`[data-user-id="${first}"]`);
      await expect(existing).toBeChecked();
      await expect(existing).toBeDisabled();
      const added = users.locator(`[data-user-id="${second}"]`);
      await expect(added).toBeEnabled();
      await added.check();
      const requests: number[] = [];
      page.on('request', request => {
        if (request.method() === 'POST' && new URL(request.url()).pathname === API_ENDPOINTS.programs.assign) requests.push(request.postDataJSON().userId);
      });
      const pending = page.waitForResponse(response => response.request().method() === 'POST' &&
        new URL(response.url()).pathname === API_ENDPOINTS.programs.assign);
      await page.getByTestId('finish-program').click();
      const response = await pending;
      expect(response.status()).toBe(200);
      expect((await response.json()).success).toBe(true);
      await expect(page).toHaveURL(/\/coach\/dashboard\?/);
      expect(requests).toEqual([second]);
      expect((await db().query('SELECT id,user_id,status,assigned_at::text FROM user_programs WHERE program_id=$1 AND user_id=$2', [programId, first])).rows).toEqual(original);
      const assigned = await success(await api.get(API_ENDPOINTS.programs.assignedUsers(programId)), 'Verify all assigned users');
      expect([...assigned.data].sort((a: number,b: number)=>a-b)).toEqual([first,second].sort((a,b)=>a-b));
      expect((await db().query('SELECT user_id FROM user_programs WHERE program_id=$1 ORDER BY user_id', [programId])).rows.map(row=>row.user_id)).toEqual([first,second].sort((a,b)=>a-b));
    } finally { await cleanupProgramListFixture(api, f); }
  } finally { await api.dispose(); }
});
