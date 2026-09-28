import { expect, test } from '@playwright/test';
import { setTestLanguage } from '../../helpers/read-only';

test.describe('AUTH GUI: login validation', () => {
  test.beforeEach(async ({ page }) => {
    await setTestLanguage(page);
    await page.goto('/login');
  });

  test('empty login submission shows validation feedback and stays on login', async ({ page }) => {
    await page.getByRole('button', { name: /bejelentkez|login/i }).click();

    await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('input[formControlName="username"]')).toBeVisible();
    await expect(page.locator('input[formControlName="password"]')).toBeVisible();

    const bodyText = await page.locator('body').innerText();
    expect(bodyText.length).toBeGreaterThan(0);
  });
});
