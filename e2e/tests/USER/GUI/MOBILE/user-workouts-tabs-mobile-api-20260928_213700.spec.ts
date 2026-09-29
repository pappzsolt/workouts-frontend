import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../../helpers/read-only';

test.use({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });

test('USER MOBILE GUI: workout tabs switch the visible workout group', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');

  // /user/workouts is the calendar component and has no pending/completed tabs.
  // The tab UI belongs to /user/programs/:id/workouts.
  const assignedPromise = page.waitForResponse(r =>
    r.request().method() === 'GET' &&
    r.url().includes('/api/programs/my/assigned-programs') &&
    !r.url().includes('/progress'),
  );
  await navigateSpa(page, '/user/my-programs');
  const assigned = await assignedPromise;
  expect(assigned.ok()).toBeTruthy();

  const assignedBody = await assigned.json() as { data?: Array<Record<string, unknown>> };
  const programs = Array.isArray(assignedBody.data) ? assignedBody.data : [];
  expect(programs.length).toBeGreaterThan(0);

  const program = programs[0];
  const programId = Number(program.id ?? program.programId ?? program.program_id);
  expect(programId).toBeGreaterThan(0);

  const workoutsPromise = page.waitForResponse(r =>
    r.request().method() === 'GET' &&
    r.url().includes(`/api/workouts/program/${programId}`),
  );

  await navigateSpa(page, `/user/programs/${programId}/workouts`);
  expect((await workoutsPromise).ok()).toBeTruthy();

  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveCount(2);

  const pending = tabs.nth(0);
  const completed = tabs.nth(1);
  await expect(pending).toBeVisible();
  await expect(completed).toBeVisible();

  await completed.click();
  await expect(completed).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toBeVisible();

  await pending.click();
  await expect(pending).toHaveAttribute('aria-selected', 'true');
  expect(await page.locator('body').evaluate(el => el.scrollWidth)).toBeLessThanOrEqual(391);
});
