import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test('COACH GUI: exercise sort toggles the real exercise-search API sort direction', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_COACH_USERNAME, process.env.E2E_COACH_PASSWORD, '/coach/dashboard');

  await navigateSpa(page, '/coach/exercises');
  const controller = page.locator('app-exercise-controller');
  await expect(controller).toBeVisible({ timeout: 15000 });

  const sortButton = controller.getByRole('button', { name: /^(gyakorlat neve|exercise name|übungsname)$/i });
  await expect(sortButton).toBeVisible({ timeout: 15000 });

  const responsePromise = page.waitForResponse(r => {
    if (r.request().method() !== 'GET' || !r.url().includes(API_ENDPOINTS.exercises.search)) {
      return false;
    }
    return new URL(r.url()).searchParams.get('sortDirection') === 'desc';
  });

  await sortButton.click();

  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();
});
