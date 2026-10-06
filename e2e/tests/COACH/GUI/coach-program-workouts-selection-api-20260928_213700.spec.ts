import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test('COACH GUI: program-workouts loads real program/workout data and selected program assignments', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_COACH_USERNAME, process.env.E2E_COACH_PASSWORD, '/coach/dashboard');

  const programsPromise = page.waitForResponse((response) =>
    response.request().method() === 'GET' &&
    response.url().includes(API_ENDPOINTS.programs.myCoach),
  );
  const workoutsPromise = page.waitForResponse((response) =>
    response.request().method() === 'GET' &&
    response.url().includes(API_ENDPOINTS.workouts.my),
  );

  await navigateSpa(page, '/coach/dashboard?section=program-workouts');

  const programsResponse = await programsPromise;
  const workoutsResponse = await workoutsPromise;
  expect(programsResponse.ok()).toBeTruthy();
  expect(workoutsResponse.ok()).toBeTruthy();

  const programsBody = await programsResponse.json() as { data?: Array<Record<string, unknown>> };
  const programs = Array.isArray(programsBody.data) ? programsBody.data : [];
  expect(programs.length, 'The authenticated E2E coach must have at least one program.').toBeGreaterThan(0);

  const programId = Number(programs[0].programId ?? programs[0].id);
  expect(programId).toBeGreaterThan(0);

  const programWorkoutsPromise = page.waitForResponse((response) =>
    response.request().method() === 'GET' &&
    new URL(response.url()).pathname === API_ENDPOINTS.programWorkouts.base &&
    Number(new URL(response.url()).searchParams.get('programId')) === programId,
  );

  const radio = page.locator(`#program-${programId}`);
  const programLabel = page.locator(`label[for="program-${programId}"]`);
  await expect(programLabel).toBeVisible({ timeout: 15000 });
  await programLabel.click();
  await expect(radio).toBeChecked();
  await expect(programLabel.locator('span.rounded-full > span')).toHaveCSS('opacity', '1');

  const programWorkoutsResponse = await programWorkoutsPromise;
  expect(programWorkoutsResponse.ok()).toBeTruthy();
  await expect(page.locator('app-program-workouts-ass')).toBeVisible();
});
