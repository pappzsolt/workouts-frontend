import { expect, test } from '@playwright/test';
import {
  assertNoDataMutation,
  installReadOnlyGuard,
  loginAs,
  setTestLanguage,
} from '../../helpers/read-only';

test.describe('COACH GUI: program builder form', () => {
  test('program builder renders required fields and calculates the end date from duration', async ({ page }) => {
    await setTestLanguage(page);
    const violations = installReadOnlyGuard(page);

    await loginAs(
      page,
      process.env.E2E_COACH_USERNAME,
      process.env.E2E_COACH_PASSWORD,
      '/coach/program-builder',
    );

    for (const id of ['programName', 'programDescription', 'startDate', 'endDate', 'durationDays']) {
      await expect(page.locator(`#${id}`)).toBeVisible();
    }
    await expect(page.getByRole('combobox', { name: /^(nehézségi szint|difficulty level|schwierigkeitsgrad)$/i })).toBeVisible();

    await page.locator('#programName').fill('GUI E2E preview only');
    await page.locator('#programDescription').fill('GUI preview without persistence');
    await page.locator('#startDate').fill('2035-03-15');
    await page.locator('#durationDays').fill('7');
    await page.getByRole('combobox', { name: /^(nehézségi szint|difficulty level|schwierigkeitsgrad)$/i }).selectOption('BEGINNER');

    await expect(page.locator('#endDate')).toHaveValue('2035-03-21');
    await assertNoDataMutation(violations);
  });
});
