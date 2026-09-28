import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test.describe('USER GUI: my programs', () => {
  test('assigned program cards are rendered and the first card opens its workouts', async ({ page }) => {
    await setTestLanguage(page);

    await loginAs(
      page,
      process.env.E2E_USER_USERNAME,
      process.env.E2E_USER_PASSWORD,
      '/user/dashboard',
    );

    const responsePromise = page.waitForResponse((response) =>
      response.request().method() === 'GET' &&
      response.url().includes('/programs/my/assigned-programs') &&
      !response.url().includes('/progress'),
    );

    await navigateSpa(page, '/user/my-programs');
    const response = await responsePromise;
    expect(response.ok()).toBeTruthy();

    const body = await response.json() as { data?: unknown[] };
    const programs = body.data ?? [];
    test.skip(programs.length === 0, 'The E2E user has no assigned program.');

    const cards = page.locator('app-card').filter({ has: page.locator('h3') });
    await expect(cards.first()).toBeVisible({ timeout: 15_000 });

    await cards.first().click();
    await expect(page).toHaveURL(/\/user\/programs\/\d+\/workouts(?:\?.*)?$/);
  });
});
