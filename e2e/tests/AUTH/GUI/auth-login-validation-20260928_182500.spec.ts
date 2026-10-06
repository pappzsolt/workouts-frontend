import { expect, test } from '@playwright/test';
import { setTestLanguage } from '../../helpers/read-only';

test.describe('AUTH GUI: login validation', () => {
  test.beforeEach(async ({ page }) => {
    await setTestLanguage(page);
    await page.goto('/login');
  });

  test('empty login submission shows validation feedback and stays on login', async ({ page }) => {
    const loginRequests: string[] = [];
    page.on('request', request => {
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/auth/web/login') loginRequests.push(request.url());
    });
    await page.getByRole('button', { name: /^(bejelentkezés|login|anmelden)$/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('input[formControlName="username"]')).toBeVisible();
    const username = page.locator('input[formControlName="username"]');
    const password = page.locator('input[formControlName="password"]');
    await expect(username).toBeVisible();
    await expect(password).toBeVisible();

    await expect(username).toHaveClass(/ng-invalid/);
    await expect(password).toHaveClass(/ng-invalid/);
    await expect(page.locator('form app-message')).toBeVisible();
    await expect(page.locator('form app-message')).toContainText(/\S/);
    expect(loginRequests).toEqual([]);

  });
});
