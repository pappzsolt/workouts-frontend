import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';
import { findAssignedProgramWithWorkouts } from '../../helpers/user-workout-fixture';

test('USER GUI: workout tabs switch between pending and completed panels', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');

  const assignedPromise = page.waitForResponse(r =>
    r.request().method() === 'GET' &&
    new URL(r.url()).pathname === API_ENDPOINTS.programs.assigned,
  );
  await navigateSpa(page, '/user/my-programs');
  const assigned = await assignedPromise;
  expect(assigned.ok()).toBeTruthy();

  const body = await assigned.json() as { data?: Array<Record<string, unknown>> };
  const programs = Array.isArray(body.data) ? body.data : [];
  expect(programs.length).toBeGreaterThan(0);

  const { programId, workouts: fixtureWorkouts } = await findAssignedProgramWithWorkouts(page, programs);
  expect(fixtureWorkouts.length).toBeGreaterThan(0);

  const workoutsPromise = page.waitForResponse(r => {
    const url = new URL(r.url());
    return r.request().method() === 'GET' &&
      url.pathname === API_ENDPOINTS.workouts.byProgram(programId);
  });
  await navigateSpa(page, `/user/programs/${programId}/workouts`);
  const workouts = await workoutsPromise;
  expect(workouts.ok()).toBeTruthy();
  const workoutsBody = await workouts.json() as { data?: Array<Record<string, unknown>> };
  expect(Array.isArray(workoutsBody.data) ? workoutsBody.data.length : 0).toBeGreaterThan(0);

  const tabs = page.getByRole('tab');
  await expect(tabs).toHaveCount(2, { timeout: 15000 });

  await tabs.nth(1).click();
  await expect(tabs.nth(1)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toBeVisible();

  await tabs.nth(0).click();
  await expect(tabs.nth(0)).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByRole('tabpanel')).toBeVisible();
});
