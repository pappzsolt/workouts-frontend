import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test('COACH GUI: exercise search renders the backend search result and preserves edit actions', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_COACH_USERNAME, process.env.E2E_COACH_PASSWORD, '/coach/dashboard');

  const responsePromise = page.waitForResponse((r) =>
    r.request().method() === 'GET' && r.url().includes(API_ENDPOINTS.exercises.search),
  );
  await navigateSpa(page, '/coach/exercises');
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();

  await expect(page.locator('input').first()).toBeVisible();
  const cards = page.locator('app-card').filter({ has: page.locator('h3') });
  if (await cards.count()) {
    await expect(cards.first().getByRole('button').filter({ hasText: /edit|szerkeszt/i }).first()).toBeVisible();
  }
});
