import { expect, test } from '@playwright/test';
import { loginAs, setTestLanguage } from '../../../helpers/read-only';
import { assertWorkoutListSearch } from '../../../helpers/workout-list-search';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('COACH MOBILE GUI: workout search and clearing preserve the loaded cards without overflow', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_COACH_USERNAME, process.env.E2E_COACH_PASSWORD, '/coach/dashboard');
  await assertWorkoutListSearch(page, async () => {
    await page.goto('/coach/dashboard?section=workouts');
    await expect(page).toHaveURL(/\/coach\/dashboard\?section=workouts$/);
  });
  expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(391);
});
