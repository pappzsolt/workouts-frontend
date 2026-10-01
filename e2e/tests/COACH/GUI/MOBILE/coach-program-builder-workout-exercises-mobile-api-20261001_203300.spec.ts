import { expect, test } from '@playwright/test';
import {
  assertSelectedOnlyModal,
  cleanupProgramBuilderFixture,
  loginAndCreateFixture,
  openFixtureWorkout,
  openProgramBuilderStep2,
} from '../../../helpers/program-builder-workout-exercises';

test.use({
  viewport: { width: 390, height: 844 },
  isMobile: true,
  hasTouch: true,
});

test.describe('COACH MOBILE GUI: Program Builder workout → selected exercises', () => {
  test('MOBILE: UI → authenticated API GET → exactly 5 selected exercises, no 83-page catalogue', async ({
    page,
  }) => {
    const { api, fixture } = await loginAndCreateFixture(page);

    try {
      await openProgramBuilderStep2(page, fixture);

      const workoutBody = await openFixtureWorkout(page, fixture);

      await assertSelectedOnlyModal(page, fixture, workoutBody);

      const modal = page.locator('[role="dialog"]').first();

      await expect(modal).toBeVisible();

      expect(
        await page.locator('body').evaluate((el) => el.scrollWidth),
      ).toBeLessThanOrEqual(391);

      const modalBox = await modal.boundingBox();
      expect(modalBox).not.toBeNull();

      if (modalBox) {
        expect(modalBox.width).toBeLessThanOrEqual(390);
        expect(modalBox.x).toBeGreaterThanOrEqual(0);
      }

      // The mobile selected-only view contains only the five exercises
      // returned by the authenticated workout API request.
      await expect(
        modal.getByText(/oldal\s+1\s*\/|page\s+1\s*\//i),
      ).toHaveCount(0);
    } finally {
      await cleanupProgramBuilderFixture(api, fixture);
      await api.dispose();
    }
  });
});
