import { test, expect, openWorkspace } from '../../helpers/coach-workspace-fixture';

test('coach program editor opens the shared training days with the day editor visible', async ({ page, workspace }) => {
  await openWorkspace(page, workspace);
  const root = page.locator('app-coach-program-editor');
  await expect(root.getByRole('tablist', { name: 'Program nézetei' })).toBeVisible();
  await expect(root.getByRole('tab', { name: 'Edzések', exact: true })).toHaveAttribute('aria-selected', 'true');
  await expect(root.getByRole('region', { name: 'Kiválasztott nap' })).toBeVisible();
  await expect(root.getByRole('region', { name: 'Programtervező' })).toBeVisible();
  await root.getByRole('tab', { name: 'Naptár', exact: true }).click();
  await expect(root.getByRole('tab', { name: 'Naptár', exact: true })).toHaveAttribute('aria-selected', 'true');
  await root.getByRole('tab', { name: 'Edzések', exact: true }).click();
  await expect(root.getByRole('region', { name: 'Kiválasztott nap' })).toBeVisible();
});

test('coach program editor warns before leaving with unsaved metadata changes', async ({ page, workspace }) => {
  await openWorkspace(page, workspace);
  const root = page.locator('app-coach-program-editor');
  const name = root.locator('[name=programName]');
  await root.getByRole('button', { name: 'Programadatok szerkesztése', exact: true }).click();
  await name.fill('Temporarily unsaved name');
  await root.getByRole('link', { name: 'Vissza a programokhoz' }).click();
  const dialog = page.getByRole('alertdialog');
  await expect(dialog).toBeVisible();
  await dialog.getByRole('button', { name: 'Maradok' }).click();
  await expect(name).toHaveValue('Temporarily unsaved name');
  await root.getByRole('link', { name: 'Vissza a programokhoz' }).click();
  await dialog.getByRole('button', { name: 'Módosítások elvetése' }).click();
  await expect(page).toHaveURL(/\/coach\/programs$/);
});
