import { expect, test } from '@playwright/test';
import { authenticateAndOpen } from '../../helpers/auth-session';
import { assertNoDataMutation, installReadOnlyGuard, setTestLanguage } from '../../helpers/read-only';

test.beforeEach(async ({ page }) => {
  await setTestLanguage(page);
  await authenticateAndOpen(page, 'admin');
});

test('ADMIN GUI: numeric coach selection populates the form and clearing resets it', async ({ page }) => {
  const mutations = installReadOnlyGuard(page);
  const coachesResponse = page.waitForResponse(response =>
    response.request().method() === 'GET' &&
    new URL(response.url()).pathname === '/api/members',
  );
  await page.goto('/admin/coach/edit');
  const response = await coachesResponse;
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBe(true);
  const coach = body.data.find((item: { id: number; type: string; usernameOrName: string; email: string }) =>
    item.type === 'coach' && item.id != null && item.usernameOrName != null && item.email != null,
  );
  expect(coach, 'The test database must contain an editable coach.').toBeDefined();
  const selector = page.getByRole('combobox', { name: /^(válassz edzőt|select coach|coach auswählen)$/i });
  await expect(selector).toHaveCount(1);
  await expect(selector).toBeEnabled();
  await selector.selectOption({ label: `${coach.usernameOrName} (${coach.email})` });
  await expect(page.locator('input#name')).toHaveValue(coach.usernameOrName);
  await expect(page.locator('input#email')).toHaveValue(coach.email);
  // Select the actual empty option, without depending on Angular's ngValue encoding.
  await selector.selectOption({ index: 0 });
  await expect(page.locator('input#name')).toHaveValue('');
  await expect(page.locator('input#email')).toHaveValue('');
  await assertNoDataMutation(mutations);
});

test('ADMIN GUI: numeric user selection populates the matching user fields', async ({ page }) => {
  const mutations = installReadOnlyGuard(page);
  const usersResponse = page.waitForResponse(response =>
    response.request().method() === 'GET' &&
    new URL(response.url()).pathname === '/api/members/users',
  );
  await page.goto('/admin/users/edit');
  const response = await usersResponse;
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBe(true);
  const user = body.data.find((item: { usernameOrName: string }) =>
    item.usernameOrName === process.env.E2E_USER_USERNAME,
  );
  expect(user, 'The configured E2E user must appear in the admin member list.').toBeDefined();
  const selector = page.locator('app-user-select').getByRole('combobox');
  await expect(selector).toBeEnabled();
  await selector.selectOption({ label: user.usernameOrName });
  await expect(page.locator('input#username')).toHaveValue(user.usernameOrName);
  await expect(page.locator('input#email')).toHaveValue(user.email);
  await expect(page.getByRole('button', { name: /^(mentés|save|speichern)$/i })).toBeEnabled();
  await assertNoDataMutation(mutations);
});

test('ADMIN GUI: gender select preserves its string values inside the shared form field', async ({ page }) => {
  const mutations = installReadOnlyGuard(page);
  await page.goto('/admin/users/new');
  const gender = page.getByRole('combobox', { name: /^(nem|gender|geschlecht)$/i });
  await expect(gender).toHaveCount(1);
  for (const value of ['female', 'male']) {
    await gender.selectOption(value);
    await expect(gender).toHaveValue(value);
  }
  await assertNoDataMutation(mutations);
});
