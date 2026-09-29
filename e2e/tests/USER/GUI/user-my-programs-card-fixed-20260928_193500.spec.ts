import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test.describe('USER GUI: my programs pagination + occurrence API', () => {
  test('program list renders one page item and pagination matches the API result', async ({ page }) => {
    await setTestLanguage(page);
    await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');

    const assignedResponsePromise = page.waitForResponse((response) =>
      response.request().method() === 'GET' &&
      response.url().includes('/programs/my/assigned-programs') &&
      !response.url().includes('/progress'),
    );

    await navigateSpa(page, '/user/my-programs');
    const response = await assignedResponsePromise;
    expect(response.ok()).toBeTruthy();

    const body = await response.json() as { data?: Array<Record<string, unknown>> };
    const programs = Array.isArray(body.data) ? body.data : [];
    expect(programs.length).toBeGreaterThan(0);

    // The component deliberately uses pageSize=1, so one visible card is correct.
    const cards = page.locator('app-user-my-programs app-card, app-card').filter({ has: page.locator('h3') });
    await expect(cards).toHaveCount(1);
    await expect(cards.first()).toBeVisible();

    const pagination = page.locator('app-side-pagination');
    if (programs.length > 1) {
      await expect(pagination).toBeVisible();
    }

    await expect(page.locator('h3').first()).toContainText(String(programs[0].name ?? ''));
  });
});
