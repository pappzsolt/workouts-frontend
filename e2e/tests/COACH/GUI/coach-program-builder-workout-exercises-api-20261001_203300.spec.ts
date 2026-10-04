import { expect, test } from '@playwright/test';
import {
  assertSelectedOnlyModal,
  cleanupProgramBuilderFixture,
  loginAndCreateFixture,
  openFixtureWorkout,
  openProgramBuilderStep2,
} from '../../helpers/program-builder-workout-exercises';

test.describe('COACH GUI: Program Builder workout → selected exercises', () => {
  test('DESKTOP: UI → authenticated API GET → exactly 5 selected exercises, no exercise catalogue pagination', async ({
    page,
  }) => {
    const { api, fixture } = await loginAndCreateFixture(page);

    try {
      await openProgramBuilderStep2(page, fixture);

      const workoutBody = await openFixtureWorkout(page, fixture);

      await assertSelectedOnlyModal(page, fixture, workoutBody);

      const selectedWorkoutRow = page.getByTestId('selected-workout').filter({
        has: page.getByRole('heading', {
          name: fixture.workoutName,
          exact: true,
        }),
      });

      await expect(selectedWorkoutRow).toHaveCount(1);
      await expect(
        selectedWorkoutRow.getByRole('heading', {
          name: fixture.workoutName,
          exact: true,
        }),
      ).toHaveCount(1);

      const modal = page.locator('[role="dialog"]').first();
      await expect(
        modal.getByRole('heading', {
          name: fixture.workoutName,
          exact: true,
        }),
      ).toHaveCount(1);

      // The complete exercise catalogue is intentionally not rendered
      // in the existing-workout view.
      await expect(
        page.locator('[role="dialog"]').first().getByText(/Ab Wheel Rollout/i),
      ).toHaveCount(0);
    } finally {
      await cleanupProgramBuilderFixture(api, fixture);
      await api.dispose();
    }
  });
});
