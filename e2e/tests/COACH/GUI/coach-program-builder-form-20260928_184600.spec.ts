import { expect, test } from '@playwright/test';
import { installReadOnlyGuard, assertNoDataMutation, loginAs, setTestLanguage } from '../../helpers/read-only';

test.describe('COACH GUI: program builder form', () => {
  test('program builder renders its first-step fields and calculates the end date', async ({ page }) => {
    await setTestLanguage(page);
    const violations = installReadOnlyGuard(page);

    await loginAs(
      page,
      process.env.E2E_COACH_USERNAME,
      process.env.E2E_COACH_PASSWORD,
      '/coach/program-builder',
    );

    await expect(page.locator('#programName')).toBeVisible();
    await expect(page.locator('#programDescription')).toBeVisible();
    await expect(page.locator('#startDate')).toBeVisible();
    await expect(page.locator('#endDate')).toBeVisible();
    await expect(page.locator('#durationDays')).toBeVisible();
    await expect(page.locator('select#difficultyLevel')).toBeVisible();

    await page.locator('#programName').fill('GUI E2E preview only');
    await page.locator('#startDate').fill('2035-03-15');
    await page.locator('#durationDays').fill('7');
    await page.locator('select#difficultyLevel').selectOption('BEGINNER');

    await expect(page.locator('#endDate')).toHaveValue('2035-03-22');
    await assertNoDataMutation(violations);
  });
});
