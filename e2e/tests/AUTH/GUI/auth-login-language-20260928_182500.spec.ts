import { expect, test } from '@playwright/test';
import { setTestLanguage } from '../../helpers/read-only';

test.describe('AUTH GUI: language selector', () => {
  test('login language selector changes the visible UI language', async ({ page }) => {
    await setTestLanguage(page);
    await page.goto('/login');

    const selector = page.locator('app-language-selector select');
    await expect(selector).toBeVisible();

    await selector.selectOption('en');
    await expect(selector).toHaveValue('en');

    await expect(page.getByRole('heading', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.getByLabel('Username', { exact: true })).toBeVisible();
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Login', exact: true })).toBeVisible();
    await expect(page.locator('input[formControlName="username"]')).toBeVisible();
    await expect(page.locator('input[formControlName="password"]')).toBeVisible();
  });
});
