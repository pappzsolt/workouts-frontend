import { expect, test } from '@playwright/test';
import { setTestLanguage } from '../../../helpers/read-only';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('AUTH MOBILE GUI: login form keeps credentials and submit controls inside the viewport', async ({ page }) => {
  await setTestLanguage(page);
  await page.goto('/login');

  const username = page.locator('input[formcontrolname="username"]');
  const password = page.locator('input[formcontrolname="password"]');
  const submit = page.locator('form button[type="submit"]');

  await expect(username).toBeVisible();
  await expect(password).toBeVisible();
  await expect(submit).toBeVisible();

  await username.fill('invalid-mobile-user');
  await password.fill('invalid-mobile-password');
  await expect(username).toHaveValue('invalid-mobile-user');
  await expect(password).toHaveValue('invalid-mobile-password');

  expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(391);
});
