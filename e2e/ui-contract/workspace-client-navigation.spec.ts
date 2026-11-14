import { test, expect } from './workspace-fixture';
const root = (page: any) => page.locator('app-coach-client-detail');
const weight = (page: any) => root(page).locator('article').first().getByLabel(/ 1\. Cél súly \(kg\)$/);
for (const action of ['Maradok', 'Elvetés és tovább', 'Mentés és tovább']) {
  for (const navigation of ['route', 'reschedule']) {
    test(`client protects dirty sets on ${navigation}: ${action}`, async ({ page, api }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('/coach/clients/7?program=1&workout=70');
      await weight(page).fill('42.5');
      if (navigation === 'route') {
        await page.locator('aside').getByRole('link', { name: 'Programok', exact: true }).click();
      } else {
        await page.locator('[name=rescheduleDate]').fill('2030-04-16');
        await root(page).getByRole('button', { name: 'Dátum mentése', exact: true }).click();
      }
      const dialog = root(page).getByRole('alertdialog');
      await expect(dialog).toBeVisible();
      expect(api.writes()).toEqual([]);
      await dialog.getByRole('button', { name: action, exact: true }).click();
      await expect(dialog).toHaveCount(0);
      if (action === 'Maradok') {
        await expect(weight(page)).toHaveValue('42.5');
        expect(api.writes()).toEqual([]);
      } else {
        if (navigation === 'route') {
          await expect(page).toHaveURL(/\/coach\/programs$/);
          await page.goto('/coach/clients/7?program=1&workout=70');
        } else {
          await expect(page.locator('[name=rescheduleDate]')).toHaveValue('2030-04-16');
          await expect.poll(() => api.writes().filter(c => c.method === 'PATCH').length).toBe(1);
        }
        await expect(weight(page)).toHaveValue(action === 'Mentés és tovább' ? '42.5' : '20');
        expect(api.writes().filter(c => c.method === 'PUT')).toHaveLength(action === 'Mentés és tovább' ? 1 : 0);
      }
    });
  }
}
