import { expect, test } from '@playwright/test';
import { installReadOnlyGuard, assertNoDataMutation, loginAs, setTestLanguage } from '../../helpers/read-only';

test.describe('USER GUI: profile form', () => {
  test('user profile renders its editable fields without submitting changes', async ({ page }) => {
    await setTestLanguage(page);
    await loginAs(
      page,
      process.env.E2E_USER_USERNAME,
      process.env.E2E_USER_PASSWORD,
      '/user/profile',
    );

    const violations = installReadOnlyGuard(page);

    await expect(page.locator('h2').first()).toBeVisible();

    const inputs = page.locator('input, textarea, select');
    await expect(inputs.first()).toBeVisible();

    const saveButtons = page.getByRole('button', { name: /ment|save/i });
    await expect(saveButtons.first()).toBeVisible();

    await assertNoDataMutation(violations);
  });
});
