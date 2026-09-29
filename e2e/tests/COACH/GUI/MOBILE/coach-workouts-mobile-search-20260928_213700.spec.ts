import { expect, test } from '@playwright/test';
import { loginAs, setTestLanguage } from '../../../helpers/read-only';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('COACH MOBILE GUI: workout search filters the loaded workout cards without horizontal overflow', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_COACH_USERNAME, process.env.E2E_COACH_PASSWORD, '/coach/dashboard');

  // The dashboard exposes the workouts panel through the supported section query parameter.
  await page.goto('/coach/dashboard?section=workouts');
  await expect(page).toHaveURL(/\/coach\/dashboard\?section=workouts$/);

  const search = page.locator('#workoutSearch');
  await expect(search).toBeVisible({ timeout: 15000 });

  const cards = page.locator('app-coach-workouts app-card');
  const before = await cards.count();

  await search.fill('zzzz-no-match');
  await expect(cards).toHaveCount(0);

  await search.fill('');
  if (before > 0) {
    await expect(cards.first()).toBeVisible();
  }

  expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(391);
});
