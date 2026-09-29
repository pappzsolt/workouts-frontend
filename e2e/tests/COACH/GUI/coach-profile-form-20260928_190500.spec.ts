import { expect, test } from '@playwright/test';
import {
  assertNoDataMutation,
  installReadOnlyGuard,
  loginAs,
  setTestLanguage,
} from '../../helpers/read-only';

test.describe('COACH GUI: profile form', () => {
  test('coach profile exposes all editable fields and save action without submitting changes', async ({ page }) => {
    await setTestLanguage(page);
    await loginAs(
      page,
      process.env.E2E_COACH_USERNAME,
      process.env.E2E_COACH_PASSWORD,
      '/coach/profile',
    );

    const violations = installReadOnlyGuard(page);

    await expect(page.locator('h2').first()).toBeVisible();

    const fields = ['name', 'email', 'password_hash', 'phone', 'specialization', 'avatar_url'];
    for (const id of fields) {
      const field = page.locator(`#${id}`);
      await expect(field).toBeVisible();
      await expect(field).toBeEditable();
    }

    await expect(page.locator('#email')).toHaveAttribute('type', 'email');
    await expect(page.locator('#password_hash')).toHaveAttribute('type', 'password');
    await expect(page.locator('button[type="button"]').filter({ hasText: /ment|save/i })).toBeVisible();

    await assertNoDataMutation(violations);
  });
});
