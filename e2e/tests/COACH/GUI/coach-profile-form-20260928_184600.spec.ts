import { expect, test } from '@playwright/test';
import { installReadOnlyGuard, assertNoDataMutation, loginAs, setTestLanguage } from '../../helpers/read-only';

test.describe('COACH GUI: profile form', () => {
  test('coach profile exposes the editable profile fields without saving', async ({ page }) => {
    await setTestLanguage(page);
    await loginAs(
      page,
      process.env.E2E_COACH_USERNAME,
      process.env.E2E_COACH_PASSWORD,
      '/coach/profile',
    );

    const violations = installReadOnlyGuard(page);

    await expect(page.locator('h2').first()).toBeVisible();
    await expect(page.locator('#name')).toBeVisible();
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password_hash')).toBeVisible();
    await expect(page.locator('#phone')).toBeVisible();
    await expect(page.locator('#specialization')).toBeVisible();
    await expect(page.locator('#avatar_url')).toBeVisible();

    await assertNoDataMutation(violations);
  });
});
