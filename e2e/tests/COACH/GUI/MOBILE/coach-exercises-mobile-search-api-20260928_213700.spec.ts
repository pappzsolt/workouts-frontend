import { API_ENDPOINTS } from '../../../helpers/api-endpoints';
import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../../helpers/read-only';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('COACH MOBILE GUI: exercise search sends the selected query to the API', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_COACH_USERNAME, process.env.E2E_COACH_PASSWORD, '/coach/dashboard');


  page.on('request', request => {
    if (request.url().includes(API_ENDPOINTS.exercises.search)) {
      console.log('[E2E REQUEST]', request.method(), request.url());
    }
  });

  page.on('response', response => {
    if (response.url().includes(API_ENDPOINTS.exercises.search)) {
      console.log('[E2E RESPONSE]', response.status(), response.url());
    }
  });
  await navigateSpa(page, '/coach/exercises');
  await expect(page.locator('#exerciseSearch')).toBeVisible();

  await page.locator('#exerciseSearch').fill('bench');

  // The backend endpoint uses the `search` query parameter, not `searchTerm`.
  // Register the listener before clicking because the request is emitted synchronously by search().
  const responsePromise = page.waitForResponse(r => {
    if (r.request().method() !== 'GET' || !r.url().includes(API_ENDPOINTS.exercises.search)) {
      return false;
    }

    const url = new URL(r.url());
    return url.searchParams.get('search') === 'bench';
  });

  await page.getByRole('button', { name: /keresés|search/i }).click();
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();

  await expect(page.locator('h2')).toBeVisible();
  expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(391);
});
