import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { apiFor, closeDb, dbOne, deleteProgram, login, suffix } from '../../helpers/e2e-next-3-helpers';
import { setTestLanguage } from '../../helpers/read-only';

test.afterAll(closeDb);
test('COACH GUI: language changes preserve entered program fields and persist the selected language', async ({ page }) => {
  await setTestLanguage(page); await login(page, 'coach'); const api = await apiFor(page);
  let programId: number | undefined;
  try {
    await page.goto('/coach/program-builder');
    const name = `E2E language ${suffix()}`; const description = 'Values survive language changes';
    await page.locator('#programName').fill(name); await page.locator('#programDescription').fill(description);
    await page.locator('#startDate').fill('2035-05-10'); await page.locator('#durationDays').fill('21');
    const difficulty = page.locator('app-program-details-form').getByRole('combobox');
    await difficulty.selectOption('ADVANCED');
    const language = page.getByRole('banner').getByRole('combobox');
    for (const code of ['en', 'de', 'en']) {
      await language.selectOption(code);
      await expect(page.locator('#programName')).toHaveValue(name);
      await expect(page.locator('#programDescription')).toHaveValue(description);
      await expect(page.locator('#startDate')).toHaveValue('2035-05-10');
      await expect(page.locator('#durationDays')).toHaveValue('21');
      await expect(page.locator('#endDate')).toHaveValue('2035-05-30');
      await expect(difficulty).toHaveValue('ADVANCED');
    }
    const created = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === API_ENDPOINTS.userPrograms.base);
    await page.locator('app-coach-program-builder').getByRole('button', { name: /^Create program\s*→?$/i }).click();
    const response = await created; expect(response.ok()).toBe(true);
    const body = await response.json(); expect(body.success).toBe(true); programId = Number(body.data); expect(programId).toBeGreaterThan(0);
    expect(response.request().postDataJSON()).toMatchObject({ programName: name, programDescription: description, startDate: '2035-05-10', durationDays: 21, languageCode: 'en' });
    const stored = await dbOne<any>('SELECT p.duration_days,p.start_date::text,pt.name,pt.description FROM programs p JOIN program_translations pt ON pt.program_id=p.id JOIN languages l ON l.id=pt.language_id WHERE p.id=$1 AND l.code=$2', [programId, 'en']);
    expect(stored).toMatchObject({ duration_days: 21, start_date: '2035-05-10', name, description });
    await page.goto(`/coach/program-builder?programId=${programId}`);
    await page.getByRole('banner').getByRole('combobox').selectOption('en');
    await expect(page.locator('#programName')).toHaveValue(name);
    await expect(page.locator('#programDescription')).toHaveValue(description);
    await expect(difficulty).toHaveValue('ADVANCED');
  } finally { try { if (programId !== undefined) await deleteProgram(api, programId); } finally { await api.dispose(); } }
});
