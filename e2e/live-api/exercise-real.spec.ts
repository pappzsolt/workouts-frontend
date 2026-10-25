import { test, expect, login, ok } from './live-fixture';
import { randomUUID } from 'node:crypto';

test('Valódi API: böngészős gyakorlatlétrehozás után a kereső a tárolt értékeket adja vissza', async ({ page, coach }) => {
  await login(page, 'coach'); await page.goto('/coach/exercises/new');
  const name = `Live exercise ${randomUUID().slice(0, 8)}`; let id: number | undefined;
  try {
    await page.locator('#name').fill(name); await page.locator('#description').fill('Valódi gyakorlatleírás');
    await page.locator('#caloriesBurnedPerMinute').fill('7.5'); await page.locator('#durationSeconds').fill('45');
    const created = page.waitForResponse(r => new URL(r.url()).pathname === '/api/exercises' && r.request().method() === 'POST');
    await page.locator('app-new-exercise button[type=submit]').click(); const response = await created;
    expect(response.status()).toBe(201); const body = await response.json(); id = body.data.id; expect(id).toBeGreaterThan(0);
    await expect(page.locator('app-new-exercise > app-message')).toHaveText(body.message);
    await expect(page.locator('#name')).toHaveValue('');
    const result = (await ok(await coach.get('/api/exercises/search', { params: { search: name, language: 'hu', size: 10 } }))).data;
    const persisted = result.content.find((item: any) => item.id === id); expect(persisted).toBeTruthy();
    expect(persisted.name).toBe(name); expect(persisted.description).toBe('Valódi gyakorlatleírás');
    expect(persisted.durationSeconds).toBe(45); expect(Number(persisted.caloriesBurnedPerMinute)).toBe(7.5);
  } finally { if (id) await ok(await coach.delete(`/api/exercises/${id}`)); }
});
