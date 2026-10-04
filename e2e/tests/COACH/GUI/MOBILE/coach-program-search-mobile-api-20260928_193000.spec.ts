import { API_ENDPOINTS } from '../../../helpers/api-endpoints';
import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../../helpers/read-only';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('COACH MOBILE GUI: program search sends the entered query and keeps the result surface usable', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_COACH_USERNAME, process.env.E2E_COACH_PASSWORD, '/coach/dashboard');
  const initial = page.waitForResponse(r => r.request().method() === 'GET' && r.url().includes(API_ENDPOINTS.programs.coachSearch));
  await navigateSpa(page, '/coach/programs');
  expect((await initial).ok()).toBeTruthy();
  const search = page.locator('#programSearch');
  await expect(search).toBeVisible();
  const query = 'a';
  const response = page.waitForResponse(r => r.request().method() === 'GET' && r.url().includes(API_ENDPOINTS.programs.coachSearch) && new URL(r.url()).searchParams.get('search') === query);
  // app-search emits automatically after its 300 ms debounce.
  await search.fill(query);
  expect((await response).ok()).toBeTruthy();
  expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(391);
});
