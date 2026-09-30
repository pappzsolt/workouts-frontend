import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test('COACH GUI: program search triggers the coach-search API and renders its page', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_COACH_USERNAME, process.env.E2E_COACH_PASSWORD, '/coach/dashboard');

  const responsePromise = page.waitForResponse((r) =>
    r.request().method() === 'GET' && r.url().includes(API_ENDPOINTS.programs.coachSearch),
  );
  await navigateSpa(page, '/coach/programs');
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();

  const search = page.locator('input#programSearch');
  await expect(search).toBeVisible();
  await search.fill('a');

  const searchResponse = await page.waitForResponse((r) =>
    r.request().method() === 'GET' &&
    r.url().includes(API_ENDPOINTS.programs.coachSearch) &&
    new URL(r.url()).searchParams.get('search') === 'a',
  );
  await search.press('Enter').catch(() => {});
  await searchResponse;
  await expect(page).toHaveURL(/\/coach\/programs$/);
});
