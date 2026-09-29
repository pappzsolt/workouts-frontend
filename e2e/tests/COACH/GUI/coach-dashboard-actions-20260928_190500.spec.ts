import { expect, test } from '@playwright/test';
import { loginAs, setTestLanguage } from '../../helpers/read-only';

test.describe('COACH GUI: dashboard actions', () => {
  test('all five dashboard actions open their corresponding real coach surfaces', async ({ page }) => {
    await setTestLanguage(page);
    await loginAs(
      page,
      process.env.E2E_COACH_USERNAME,
      process.env.E2E_COACH_PASSWORD,
      '/coach/dashboard',
    );

    const actions = page.locator('app-dashboard-action');
    await expect(actions).toHaveCount(5);

    const expectedSurfaces = [
      'app-coach-program',
      'app-coach-workouts',
      'app-exercise-controller',
      'app-assign-workouts-exercises',
      'app-user-workout-exercise-manager',
    ];

    for (let index = 0; index < expectedSurfaces.length; index++) {
      await actions.nth(index).locator('button').click();
      await expect(page.locator(expectedSurfaces[index])).toBeVisible({ timeout: 15_000 });

      const visibleSurfaces = await page.locator(
        'app-coach-program, app-coach-workouts, app-exercise-controller, app-assign-workouts-exercises, app-user-workout-exercise-manager',
      ).evaluateAll((elements) =>
        elements.filter((element) => {
          const style = window.getComputedStyle(element);
          return style.display !== 'none' && style.visibility !== 'hidden';
        }).length,
      );
      expect(visibleSurfaces).toBe(1);
    }
  });
});
