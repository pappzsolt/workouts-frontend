import { finishFirstVisit } from '../tests/helpers/onboarding';
import { test, expect } from '@playwright/test';
import { WorkspaceApi } from './workspace-fixture';

test('coach onboarding: skip persists for the same account across reloads', async ({ page }) => {
  const api = new WorkspaceApi();
  await api.install(page);
  await page.goto('/coach/dashboard');
  const guide = page.locator('app-guided-tour').getByRole('dialog');
  await expect(guide).toBeVisible();
  await finishFirstVisit(page, 'coach', 6);
  await expect(guide).toHaveCount(0);
  await page.goto('/coach/programs/1');
  await expect(page.locator('app-coach-program-editor')).toBeVisible();
  await page.reload();
  await expect(page.locator('app-coach-program-editor')).toBeVisible();
  await expect(guide).toHaveCount(0);
  if ((page.viewportSize()?.width ?? 1280) < 640) {
    await page.getByRole('button', { name: 'Menü megnyitása', exact: true }).click();
  }
  await page.getByRole('button', { name: 'Edzői útmutató', exact: true }).click();
  await expect(guide).toBeVisible();
  expect(api.unknown).toEqual([]);
  expect(api.writes()).toEqual([]);
});
