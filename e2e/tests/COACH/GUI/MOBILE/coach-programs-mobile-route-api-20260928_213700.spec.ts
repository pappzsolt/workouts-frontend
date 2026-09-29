import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../../helpers/read-only';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('COACH MOBILE GUI: program list renders its API-backed surface without horizontal overflow', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_COACH_USERNAME, process.env.E2E_COACH_PASSWORD, '/coach/dashboard');

  await navigateSpa(page, '/coach/programs');
  await expect(page.locator('h2').first()).toBeVisible({ timeout: 15000 });

  const cards = page.locator('app-card');
  if (await cards.count()) {
    await expect(cards.first()).toBeVisible();
  } else {
    await expect(page.locator('app-message')).toBeVisible();
  }

  expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(391);
});
