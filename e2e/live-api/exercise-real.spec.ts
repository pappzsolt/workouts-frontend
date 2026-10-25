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

for (const language of ['hu', 'en', 'de']) {
  test(`Valódi API: gyakorlat szerkesztése és újratöltése (${language})`, async ({ page, coach }) => {
    const name = `Edit ${randomUUID().slice(0, 8)}`;
    const id = (await ok(await coach.post('/api/exercises', {
      params: { language }, data: { name, description: 'Before', durationSeconds: 30, caloriesBurnedPerMinute: 1 },
    }))).data.id;
    try {
      await login(page, 'coach');
      await page.locator('app-language-selector select').first().selectOption(language);
      await expect.poll(() => page.evaluate(() => localStorage.getItem('language'))).toBe(language);
      await page.goto(`/coach/exercises/${id}/edit`);
      await expect(page.locator('app-language-selector select').first()).toHaveValue(language);
      await expect(page.locator('#name')).toHaveValue(name);
      await page.locator('#name').fill(`${name} saved`);
      await page.locator('#description').fill('Persisted browser edit');
      await page.locator('#durationSeconds').fill('90');
      await page.locator('#caloriesBurnedPerMinute').fill('12.25');
      const saved = page.waitForResponse(r => new URL(r.url()).pathname === `/api/exercises/${id}` && r.request().method() === 'PUT');
      await page.locator('app-coach-exercise-edit button[type=submit]').click();
      const response = await saved; expect(response.status()).toBe(200);
      expect(new URL(response.url()).searchParams.get('language')).toBe(language);
      await expect(page.locator('app-coach-exercise-edit app-message')).toHaveText((await response.json()).message);
      const all = (await ok(await coach.get('/api/exercises', { params: { language } }))).data;
      const persisted = all.find((row: any) => row.id === id);
      expect(persisted.name).toBe(`${name} saved`); expect(persisted.description).toBe('Persisted browser edit');
      expect(persisted.durationSeconds).toBe(90); expect(Number(persisted.caloriesBurnedPerMinute)).toBe(12.25);
      await page.reload();
      await expect(page.locator('app-language-selector select').first()).toHaveValue(language);
      await expect(page.locator('#name')).toHaveValue(`${name} saved`);
      await expect(page.locator('#durationSeconds')).toHaveValue('90');
    } finally { await ok(await coach.delete(`/api/exercises/${id}`)); }
  });
}

test('Valódi API: nem létező gyakorlat szerkesztése visszavisz a listára', async ({ page }) => {
  await login(page, 'coach'); await page.goto('/coach/exercises/2147483647/edit');
  await expect(page).toHaveURL(/\/coach\/exercises\?exerciseNotFound=true$/);
  await expect(page.locator('app-coach-exercise-edit form')).toHaveCount(0);
});
