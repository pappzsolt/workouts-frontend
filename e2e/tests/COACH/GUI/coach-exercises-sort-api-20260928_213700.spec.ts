import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test('COACH GUI: exercise sort toggles the real exercise-search API sort direction', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_COACH_USERNAME, process.env.E2E_COACH_PASSWORD, '/coach/dashboard');

  await navigateSpa(page, '/coach/exercises');
  const controller = page.locator('app-exercise-controller');
  await expect(controller).toBeVisible({ timeout: 15000 });

  // The sort control is the second toolbar button in the current component:
  // first is Search, second is Sort by name. This targets the real rendered control.
  const sortButton = controller.locator('button').filter({
    has: page.locator('span.text-lg.font-bold'),
  }).first();
  await expect(sortButton).toBeVisible({ timeout: 15000 });

  const responsePromise = page.waitForResponse(r => {
    if (r.request().method() !== 'GET' || !r.url().includes('/api/exercises/exercise-search')) {
      return false;
    }
    return new URL(r.url()).searchParams.get('sortDirection') === 'desc';
  });

  await sortButton.click();

  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
});
