import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { apiFor, closeDb, login } from '../../helpers/e2e-next-3-helpers';
import { cleanupProgramPickerFixture, createProgramPickerFixture, openProgramBuilder } from '../../helpers/program-picker-fixture';
import { setTestLanguage } from '../../helpers/read-only';

test.afterAll(closeDb);
test('COACH GUI: searching from page two resets to page one and clearing renders the real catalogue', async ({ page }) => {
  await setTestLanguage(page);
  await login(page, 'coach');
  const api = await apiFor(page);
  const f = await createProgramPickerFixture(api);
  try {
    await openProgramBuilder(page, f.programId);
    await page.getByTestId('open-workout-picker').click();
    const board = page.locator('app-coach-workout-board');
    const search = async (term: string) => {
      const loaded = page.waitForResponse(response => response.request().method() === 'GET' &&
        new URL(response.url()).pathname === API_ENDPOINTS.workouts.mySearch &&
        new URL(response.url()).searchParams.get('search') === term);
      await board.locator('#workoutSearch').fill(term);
      const response = await loaded;
      expect(response.ok()).toBe(true);
      expect(new URL(response.url()).searchParams.get('page')).toBe('0');
      const body = await response.json();
      expect(Array.isArray(body.content)).toBe(true);
      await expect(board.getByRole('checkbox')).toHaveCount(body.content.length);
      expect(await board.getByRole('checkbox').evaluateAll(inputs => inputs.map(input => input.id))).toEqual(body.content.map((row: any) => `compact-workout-${row.id}`));
      return body;
    };
    const first = await search(f.prefix);
    expect(first.totalElements).toBe(10);
    expect(first.totalPages).toBe(2);
    const next = page.waitForResponse(response => response.request().method() === 'GET' &&
      new URL(response.url()).pathname === API_ENDPOINTS.workouts.mySearch && new URL(response.url()).searchParams.get('page') === '1');
    await board.locator('app-pagination').getByRole('button', { name: /következő|next/i }).click();
    expect((await next).ok()).toBe(true);
    await expect(board.locator('app-pagination')).toContainText('2 / 2');
    const narrowed = await search(f.workouts[9].name);
    expect(narrowed.content.map((row: any) => row.id)).toEqual([f.workouts[9].id]);
    await expect(board.locator(`#compact-workout-${f.workouts[9].id}`)).toBeVisible();
    const cleared = await search('');
    expect(cleared.totalElements).toBeGreaterThanOrEqual(10);
    await expect(board.locator('app-pagination')).toContainText(`1 / ${cleared.totalPages}`);
  } finally {
    try { await cleanupProgramPickerFixture(api, f); } finally { await api.dispose(); }
  }
});
