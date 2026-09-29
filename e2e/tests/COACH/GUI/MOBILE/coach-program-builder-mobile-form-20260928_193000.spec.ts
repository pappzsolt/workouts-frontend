import { expect, test } from '@playwright/test';
import { assertNoDataMutation, installReadOnlyGuard, loginAs, setTestLanguage } from '../../../helpers/read-only';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('COACH MOBILE GUI: program builder exposes the difficulty control and calculates end date', async ({ page }) => {
  await setTestLanguage(page);
  const violations = installReadOnlyGuard(page);

  await loginAs(page, process.env.E2E_COACH_USERNAME, process.env.E2E_COACH_PASSWORD, '/coach/program-builder');

  for (const id of ['programName', 'programDescription', 'startDate', 'endDate', 'durationDays']) {
    await expect(page.locator(`#${id}`)).toBeVisible();
  }

  // app-select renders the actual native <select> with the same id inside
  // the wrapper component. Target the native control explicitly to avoid
  // Angular's host element + inner select duplicate-id strict-mode error.
  const difficulty = page.locator('select#difficultyLevel');
  await expect(difficulty).toHaveCount(1);
  await expect(difficulty).toBeVisible();

  await page.locator('#programName').fill('Mobile GUI preview');
  await page.locator('#startDate').fill('2035-03-15');
  await page.locator('#durationDays').fill('7');
  await difficulty.selectOption('BEGINNER');

  await expect(page.locator('#endDate')).toHaveValue('2035-03-22');
  expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(391);
  await assertNoDataMutation(violations);
});
