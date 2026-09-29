import { expect, test } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('AUTH MOBILE GUI: login form fits the mobile viewport and remains usable', async ({ page }) => {
  await page.goto('/login');
  await expect(page.locator('input[formControlName="username"]')).toBeVisible();
  await expect(page.locator('input[formControlName="password"]')).toBeVisible();
  await expect(page.locator('app-button button, button[type="submit"]').first()).toBeVisible();
  const viewportWidth = page.viewportSize()!.width;
  const bodyWidth = await page.locator('body').evaluate(el => el.scrollWidth);
  expect(bodyWidth).toBeLessThanOrEqual(viewportWidth + 1);
});
