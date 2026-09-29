import { expect, test } from '@playwright/test';
import { loginAs, setTestLanguage } from '../../helpers/read-only';

test.describe('USER GUI: workout calendar', () => {
  test('previous and next month controls update the calendar header and restore the original month', async ({ page }) => {
    await setTestLanguage(page);
    await loginAs(
      page,
      process.env.E2E_USER_USERNAME,
      process.env.E2E_USER_PASSWORD,
      '/user/workouts',
    );

    const header = page.locator('h2').filter({ hasText: /\d{4}/ }).first();
    await expect(header).toBeVisible();
    const initial = await header.innerText();

    await page.getByRole('button', { name: /előző hónap|previous month/i }).click();
    await expect(header).not.toHaveText(initial);
    const previous = await header.innerText();
    expect(previous).not.toBe(initial);

    await page.getByRole('button', { name: /következő hónap|next month/i }).click();
    await expect(header).toHaveText(initial);

    await page.getByRole('button', { name: /következő hónap|next month/i }).click();
    const next = await header.innerText();
    expect(next).not.toBe(initial);

    await page.getByRole('button', { name: /előző hónap|previous month/i }).click();
    await expect(header).toHaveText(initial);
  });
});
