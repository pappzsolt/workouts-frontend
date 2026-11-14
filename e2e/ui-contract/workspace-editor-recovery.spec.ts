import type { Page } from '@playwright/test';
import { test, expect } from './workspace-fixture';
const editor = (page: Page) => page.locator('app-coach-program-editor');
async function draft(page: Page) {
  await page.goto('/coach/programs/1');
  await editor(page).getByRole('button', { name: /Program 2\. napja$/ }).click();
  await editor(page).locator('[name=workoutName]').fill('Recoverable workout');
  for (const name of ['Exercise 01', 'Exercise 02']) {
    await editor(page).getByRole('button', { name: `Hozzáadás: ${name}`, exact: true }).click();
  }
  await editor(page).getByRole('button', { name: 'Edzés létrehozása erre a napra', exact: true }).click();
}
async function completed(page: Page) {
  await expect(editor(page).getByRole('button', { name: /Program 2\. napja · Recoverable workout$/ })).toBeVisible();
}

test('workout recovery: rejected creation preserves the full editable draft', async ({ page, api }) => {
  api.fail('POST', '/api/workouts', 400);
  await draft(page);
  await expect(editor(page).locator('app-message[role=status]')).toContainText('Contract failure');
  await expect(editor(page).locator('[name=workoutName]')).toHaveValue('Recoverable workout');
  await expect(editor(page)).toContainText('Kiválasztott gyakorlatok (2)');
  expect(api.state.workouts.filter(w => w.name === 'Recoverable workout')).toHaveLength(0);
  api.failures.delete('POST /api/workouts');
  await editor(page).getByRole('button', { name: 'Edzés létrehozása erre a napra', exact: true }).click();
  await completed(page);
  expect(api.state.workouts.filter(w => w.name === 'Recoverable workout')).toHaveLength(1);
});

test('workout recovery: failed membership resumes the existing workout without another create', async ({ page, api }) => {
  api.fail('PUT', '/api/workout-exercises/membership');
  await draft(page);
  const resume = editor(page).getByRole('button', { name: 'Létrehozás folytatása', exact: true });
  await expect(resume).toBeVisible();
  await expect(editor(page).locator('[name=workoutName]')).toHaveCount(0);
  expect(api.state.workouts.filter(w => w.name === 'Recoverable workout')).toHaveLength(1);
  api.failures.delete('PUT /api/workout-exercises/membership');
  await resume.click(); await completed(page);
  expect(api.writes('/api/workouts')).toHaveLength(1);
  expect(api.state.workouts.find(w => w.name === 'Recoverable workout')!.exercises.map(e => e.id)).toEqual([1, 2]);
});

for (const step of ['membership', 'link'] as const) {
  test(`workout recovery: lost ${step} response does not duplicate confirmed writes`, async ({ page, api }) => {
    const path = step === 'membership' ? '/api/workout-exercises/membership' : '/api/program-workouts';
    let rejected = false;
    await page.route(`**${path}*`, async route => {
      const request = route.request();
      if (request.method() === 'GET' || rejected) return route.fallback();
      rejected = true;
      const url = new URL(request.url()), body = request.postDataJSON();
      api.calls.push({ method: request.method(), path: url.pathname, query: url.searchParams, body });
      if (step === 'membership') {
        api.state.workouts.find(w => w.id === Number(url.searchParams.get('workoutId')))!.exercises =
          body.map((id: number) => ({ ...api.state.exercises.find(e => e.id === id)! }));
      } else api.state.links.push({ ...body, id: api.nextId++ });
      await route.fulfill({ status: 503, json: { success: false, message: 'Response unavailable' } });
    });
    await draft(page);
    const resume = editor(page).getByRole('button', { name: 'Létrehozás folytatása', exact: true });
    await expect(resume).toBeVisible();
    await resume.click(); await completed(page);
    expect(api.writes('/api/workouts')).toHaveLength(1);
    const workout = api.state.workouts.find(w => w.name === 'Recoverable workout')!;
    expect(workout.exercises.map(e => e.id)).toEqual([1, 2]);
    expect(api.state.links.filter(link => link.workoutId === workout.id)).toHaveLength(1);
    if (step === 'link') expect(api.writes('/api/program-workouts')).toHaveLength(1);
  });
}
