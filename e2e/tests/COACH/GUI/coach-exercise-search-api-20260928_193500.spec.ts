import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';
import { findExistingExercise } from '../../helpers/db';

test('COACH GUI: exercise search renders the backend search result and preserves edit actions', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_COACH_USERNAME, process.env.E2E_COACH_PASSWORD, '/coach/dashboard');

  const responsePromise = page.waitForResponse((r) =>
    r.request().method() === 'GET' && r.url().includes(API_ENDPOINTS.exercises.search),
  );
  await navigateSpa(page, '/coach/exercises');
  const response = await responsePromise;
  expect(response.ok()).toBeTruthy();

  const exercise = await findExistingExercise();
  expect(exercise, 'A coach exercise search E2E teszthez nincs lefordított exercise rekord a teszt DB-ben.').not.toBeNull();
  expect(exercise!.name.trim(), 'A kiválasztott exercise fordított neve üres.').not.toBe('');

  const search = page.locator('#exerciseSearch');
  await expect(search).toBeVisible();

  const searchResponsePromise = page.waitForResponse((r) => {
    if (r.request().method() !== 'GET' || !r.url().includes(API_ENDPOINTS.exercises.search)) {
      return false;
    }
    const url = new URL(r.url());
    return url.searchParams.get('search') === exercise!.name;
  });

  await search.fill(exercise!.name);
  await page.getByRole('button', { name: /^(keresés|search|suche)$/i }).click();

  const searchResponse = await searchResponsePromise;
  expect(searchResponse.ok()).toBeTruthy();

  const card = page.locator('app-card').filter({
    has: page.locator('h3', { hasText: exercise!.name }),
  }).first();
  await expect(card).toBeVisible({ timeout: 15_000 });
  await expect(card.getByRole('button', { name: /edit|szerkeszt/i })).toBeVisible();
});
