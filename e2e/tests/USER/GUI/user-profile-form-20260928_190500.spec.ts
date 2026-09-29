import { expect, test } from '@playwright/test';
import {
  assertNoDataMutation,
  installReadOnlyGuard,
  loginAs,
  setTestLanguage,
} from '../../helpers/read-only';

test.describe('USER GUI: profile form', () => {
  test('user profile exposes all editable profile fields and save action without submitting changes', async ({ page }) => {
    await setTestLanguage(page);
    await loginAs(
      page,
      process.env.E2E_USER_USERNAME,
      process.env.E2E_USER_PASSWORD,
      '/user/profile',
    );

    const violations = installReadOnlyGuard(page);
    await expect(page.locator('h2').first()).toBeVisible();

    const fields = ['username', 'email', 'password_hash', 'age', 'weight', 'height', 'goals', 'avatar_url'];
    for (const id of fields) {
      const field = page.locator(`#${id}`);
      await expect(field).toBeVisible();
      await expect(field).toBeEditable();
    }

    await expect(page.locator('#email')).toHaveAttribute('type', 'email');
    await expect(page.locator('#password_hash')).toHaveAttribute('type', 'password');
    await expect(page.locator('#age')).toHaveAttribute('type', 'number');
    await expect(page.locator('#weight')).toHaveAttribute('type', 'number');
    await expect(page.locator('#height')).toHaveAttribute('type', 'number');
    await expect(page.getByRole('button', { name: /ment|save/i })).toBeVisible();

    await assertNoDataMutation(violations);
  });
});
