import { expect, type Page } from '@playwright/test';
import { API_ENDPOINTS } from './api-endpoints';
import { assertNoDataMutation, installReadOnlyGuard } from './read-only';

/** Exercise local filtering only after the actual workout catalog has rendered. */
export async function assertWorkoutListSearch(page: Page, open: () => Promise<void>): Promise<void> {
  const mutations = installReadOnlyGuard(page);
  const loaded = page.waitForResponse(response =>
    response.request().method() === 'GET' &&
    new URL(response.url()).pathname === API_ENDPOINTS.exercises.uniqueWorkouts,
  );
  await open();
  const response = await loaded;
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(Array.isArray(body.data)).toBe(true);
  expect(body.data.length, 'The configured coach must have a workout to exercise filtering.').toBeGreaterThan(0);

  const surface = page.locator('app-coach-workouts');
  const cards = surface.locator('app-card');
  await expect(cards).toHaveCount(Math.min(4, body.data.length));
  const headings = cards.getByRole('heading', { level: 3 });
  await expect(headings).toHaveCount(Math.min(4, body.data.length));
  const originalNames = await headings.allTextContents();
  const search = surface.locator('app-search').getByRole('textbox');
  await expect(search).toBeVisible();
  await search.fill(`no-match-${Date.now()}`);
  await expect(cards).toHaveCount(0);
  await search.fill('');
  await expect(search).toHaveValue('');
  await expect(headings).toHaveText(originalNames.map(name => name.trim()));
  await assertNoDataMutation(mutations);
}
