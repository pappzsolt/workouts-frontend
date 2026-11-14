import { expect, type Page } from '@playwright/test';

/** Dismiss the first-login guide through its actual control, once per account. */
export async function finishFirstVisit(page: Page, role: string, userId: number): Promise<void> {
  if (role === 'admin') return;
  expect(Number.isSafeInteger(userId), 'The authenticated account must have a numeric ID').toBe(true);
  const seen = await page.evaluate(({ role, userId }) =>
    localStorage.getItem(`workouts-guided-tour:v1:${role}:${userId}`) === 'done', { role, userId });
  if (seen) return;
  const guide = page.locator('app-guided-tour').getByRole('dialog');
  await guide.getByRole('button', { name: /^(Kihagyás|Skip|Überspringen)$/ }).click();
  await expect(guide).toHaveCount(0);
}
