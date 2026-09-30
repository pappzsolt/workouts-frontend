import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { expect, test } from '@playwright/test';
import { loginAs, navigateSpa, setTestLanguage } from '../../helpers/read-only';

test('INTEGRITY GUI: USER dashboard navigation does not call coach-only APIs', async ({ page }) => {
  await setTestLanguage(page);
  await loginAs(page, process.env.E2E_USER_USERNAME, process.env.E2E_USER_PASSWORD, '/user/dashboard');

  const coachApiCalls: string[] = [];
  page.on('request', (request) => {
    if (request.method() !== 'GET') return;
    const url = request.url();
    if ([API_ENDPOINTS.programs.coachSearch, API_ENDPOINTS.workouts.my, API_ENDPOINTS.exercises.search].some((endpoint) => url.includes(endpoint))) {
      coachApiCalls.push(`${request.method()} ${url}`);
    }
  });

  await navigateSpa(page, '/user/my-programs');
  await navigateSpa(page, '/user/program-statistics');
  await navigateSpa(page, '/user/workouts');
  await expect(page).toHaveURL(/\/user\/workouts$/);

  expect(coachApiCalls, `Unexpected coach-only API calls:\n${coachApiCalls.join('\n')}`).toEqual([]);
});
