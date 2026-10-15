import { expect, test } from '@playwright/test';
import { loginControls } from '../tests/helpers/auth-session';

// Actual Angular login form + shared production-test locators; no real account/backend.
for (const language of ['hu', 'en', 'de']) {
  test(`login controls: ${language} required labels do not block shared authentication selectors`, async ({ page }) => {
    await page.addInitScript(lang => {
      localStorage.setItem('language', lang);
      localStorage.setItem('lang', lang);
    }, language);
    const submissions: unknown[] = [];
    const unexpected: string[] = [];
    await page.route('**/api/**', async route => {
      const request = route.request();
      if (request.method() === 'POST' && new URL(request.url()).pathname === '/api/auth/web/login') {
        submissions.push(request.postDataJSON());
        await route.fulfill({ status: 401, json: { success: false, message: 'Contract login rejected', data: null } });
      } else {
        unexpected.push(`${request.method()} ${new URL(request.url()).pathname}`);
        await route.abort();
      }
    });
    await page.goto('/login');
    const { usernameInput, passwordInput, submitButton } = loginControls(page);
    await expect(usernameInput).toBeVisible();
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(submitButton).toHaveCount(1);
    await usernameInput.fill('contract-coach');
    await passwordInput.fill('Contract-test-123!');
    await submitButton.click();
    await expect(page.locator('app-login app-message')).toContainText('Contract login rejected');
    expect(submissions).toEqual([{ username: 'contract-coach', password: 'Contract-test-123!' }]);
    expect(unexpected).toEqual([]);
    await expect(page).toHaveURL(/\/login$/);
  });
}
