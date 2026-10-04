import { expect, test } from '@playwright/test';
import { assertNoDataMutation, installReadOnlyGuard, loginAs, setTestLanguage } from '../../helpers/read-only';
import { findExistingExercise } from '../../helpers/db';

test.describe('Coach - read-only surfaces', () => {
  test.beforeEach(async ({ page }) => {
    await setTestLanguage(page);
  });

  test('coach dashboard can be opened without changing data', async ({ page }) => {
    const violations = installReadOnlyGuard(page);

    await loginAs(
      page,
      process.env.E2E_COACH_USERNAME,
      process.env.E2E_COACH_PASSWORD,
      '/coach/dashboard',
    );

    await expect(page.locator('h2').first()).toBeVisible();

    await assertNoDataMutation(violations);
  });

  test('coach profile can be viewed without changing data', async ({ page }) => {
    const violations = installReadOnlyGuard(page);

    await loginAs(
      page,
      process.env.E2E_COACH_USERNAME,
      process.env.E2E_COACH_PASSWORD,
      '/coach/profile',
    );

    await expect(page.locator('h2').first()).toBeVisible({ timeout: 15_000 });

    await assertNoDataMutation(violations);
  });

  test('coach program list can be viewed without changing data', async ({ page }) => {
    const violations = installReadOnlyGuard(page);

    await loginAs(
      page,
      process.env.E2E_COACH_USERNAME,
      process.env.E2E_COACH_PASSWORD,
      '/coach/programs',
    );

    await expect(page.locator('#programSearch')).toBeVisible({ timeout: 15_000 });

    await assertNoDataMutation(violations);
  });

  test('coach exercise list searches for a real exercise from PostgreSQL', async ({ page }) => {
    const violations = installReadOnlyGuard(page);
    const exercise = await findExistingExercise();

    expect(
      exercise,
      'A read-only coach exercise teszthez nincs lefordított exercise rekord a teszt DB-ben.',
    ).not.toBeNull();
    expect(exercise!.name.trim(), 'A kiválasztott exercise fordított neve üres.').not.toBe('');

    await loginAs(
      page,
      process.env.E2E_COACH_USERNAME,
      process.env.E2E_COACH_PASSWORD,
      '/coach/exercises',
    );

    await expect(page.locator('#exerciseSearch')).toBeVisible({ timeout: 15_000 });

    await page.locator('#exerciseSearch').fill(exercise!.name);
    await page.getByRole('button', { name: /keres|search/i }).click();

    await expect(page.locator('h3').filter({ hasText: exercise!.name }).first()).toBeVisible({
      timeout: 15_000,
    });

    await assertNoDataMutation(violations);
  });
});
