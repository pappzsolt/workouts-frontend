import { test, expect, signIn, result, response, unique, API } from './scenario-fixture';
import { login } from './live-fixture';

for (const role of ['coach', 'user'] as const) {
  test(`${role} profil: minden szerkeszthető adat mentése és visszaolvasása`, async ({ page, actors: a }) => {
    const who = a[role]; await signIn(page, who); await page.goto(`/${role}/profile`);
    const root = page.locator(role === 'coach' ? 'app-coach-profile' : 'app-user-profile');
    await expect(root.locator(role === 'coach' ? '#name' : '#username')).toHaveValue(who.username);
    const fields = role === 'coach' ? { email: `${unique('mail')}@example.test`, phone: '+36301234567', specialization: 'Erőnlét és rehabilitáció', avatar_url: 'https://example.test/coach.png' }
      : { email: `${unique('mail')}@example.test`, age: '31', weight: '72.5', height: '181', goals: 'Erő és állóképesség', avatar_url: 'https://example.test/user.png' };
    for (const [field, value] of Object.entries(fields)) await root.locator(`#${field}`).fill(value);
    const saved = response(page, role === 'coach' ? 'PUT' : 'POST', role === 'coach' ? '/api/members/me/coach' : '/api/members/me');
    await root.getByRole('button', { name: 'Mentés', exact: true }).click(); expect((await saved).status()).toBe(200);
    await page.reload(); for (const [field, value] of Object.entries(fields)) await expect(root.locator(`#${field}`)).toHaveValue(value);
    const stored = await result(a.admin, `/api/members/${role === 'coach' ? 'coaches' : 'users'}/${who.id}`);
    expect(stored.email).toBe(fields.email); expect(stored.avatarUrl).toBe(fields.avatar_url);
    if (role === 'coach') { expect(stored.extraFields.phone).toBe(fields.phone); expect(stored.extraFields.specialization).toBe(fields.specialization); }
    else { expect(Number(stored.extraFields.age)).toBe(31); expect(Number(stored.extraFields.weight)).toBe(72.5); expect(Number(stored.extraFields.height)).toBe(181); expect(stored.extraFields.goals).toBe(fields.goals); }
  });

  test(`${role} profil: hibás jelenlegi jelszó elutasítása, sikeres csere és régi munkamenet tiltása`, async ({ page, actors: a }) => {
    const who = a[role]; await signIn(page, who); await page.goto(`/${role}/profile`);
    const root = page.locator(role === 'coach' ? 'app-coach-profile' : 'app-user-profile');
    const endpoint = role === 'coach' ? '/api/members/me/coach' : '/api/members/me';
    await expect(root.locator('#email')).toHaveValue(who.email);
    await root.locator('#current_password').fill('Incorrect-password-123!'); await root.locator('#password_hash').fill('Changed-password-456!');
    let saved = response(page, role === 'coach' ? 'PUT' : 'POST', endpoint); await root.getByRole('button', { name: 'Mentés', exact: true }).click(); expect((await saved).status()).toBe(400);
    await root.locator('#current_password').fill(who.password); saved = response(page, role === 'coach' ? 'PUT' : 'POST', endpoint);
    await root.getByRole('button', { name: 'Mentés', exact: true }).click(); expect((await saved).status()).toBe(200);
    expect((await page.request.post(`${API}/api/auth/login`, { data: { username: who.username, password: who.password } })).status()).toBe(401);
    await signIn(page, { ...who, password: 'Changed-password-456!' });
    await page.goto(`/${role}/profile`); await expect(root.locator('#email')).toHaveValue(who.email);
  });

  test(`${role} hibabejelentés: böngészős beküldés képpel, admin visszaolvasás és képmegnyitás`, async ({ page, actors: a }) => {
    const who = a[role], title = unique('Hibajelentés'), description = 'Valódi API-n beküldött részletes hibaleírás, reprodukciós lépésekkel.';
    await signIn(page, who); await page.goto(`/${role}/bug-report`);
    await page.locator('#bug-title').fill(title); await page.locator('#bug-description').fill(description); await page.locator('#bug-page').fill(`/${role}/profile`);
    await page.locator('#bug-screenshots').setInputFiles({ name: 'capture.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64') });
    const submitted = response(page, 'POST', '/api/bug-reports'); await page.locator('app-bug-report button[type=submit]').click();
    expect((await submitted).status()).toBe(201); await expect(page.locator('app-bug-report [role=status]')).toBeVisible();
    await page.context().clearCookies(); await login(page, 'admin'); await page.goto('/admin/bug-reports');
    const row = page.getByRole('listitem', { name: title, exact: true }); await expect(row).toContainText(description); await expect(row).toContainText(who.username);
    const image = row.locator('img'); await expect(image).toBeVisible(); await expect.poll(() => image.evaluate((img: HTMLImageElement) => img.complete && img.naturalWidth > 0)).toBe(true);
    expect((await who.api.get('/api/admin/bug-reports')).status()).toBe(403);
  });
}
