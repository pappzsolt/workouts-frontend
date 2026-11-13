import { test, expect, openWorkspace } from '../../helpers/coach-workspace-fixture';

test('coach program editor opens the shared training days with the day editor visible', async ({ page, workspace }) => {
  await openWorkspace(page, workspace);
  const root = page.locator('app-coach-program-editor');
  await expect(root.getByRole('navigation', { name: 'Program összeállításának lépései' })).toBeVisible();
  await expect(root.getByRole('button', { name: 'Program edzésnapjai', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(root.getByRole('region', { name: 'Kiválasztott nap' })).toBeVisible();
  await expect(root.getByRole('region', { name: 'Edzésnapok szerkesztése' })).toBeVisible();
  await root.getByRole('button', { name: 'Sportolók ütemezése', exact: true }).click();
  await expect(root.getByRole('button', { name: 'Sportolók ütemezése', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await root.getByRole('button', { name: 'Program edzésnapjai', exact: true }).click();
  await expect(root.getByRole('region', { name: 'Kiválasztott nap' })).toBeVisible();
});

test('coach program editor warns before leaving with unsaved metadata changes', async ({ page, workspace }) => {
  await openWorkspace(page, workspace);
  const root = page.locator('app-coach-program-editor');
  const name = root.locator('[name=programName]');
  await name.fill('Temporarily unsaved name');
  await root.getByRole('link', { name: 'Vissza a programokhoz' }).click();
  const dialog = page.getByRole('dialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Maradok' }).click();
  await expect(name).toHaveValue('Temporarily unsaved name');
  await root.getByRole('link', { name: 'Vissza a programokhoz' }).click();
  await dialog.getByRole('button', { name: 'Módosítások elvetése' }).click();
  await expect(page).toHaveURL(/\/coach\/programs$/);
});
