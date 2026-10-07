import { expect, test } from '@playwright/test';
import { API_ENDPOINTS } from '../../helpers/api-endpoints';
import { apiFor, closeDb, db, dbOne, login, success, suffix } from '../../helpers/e2e-next-3-helpers';
import { setTestLanguage } from '../../helpers/read-only';

test.afterAll(closeDb);
test('ADMIN GUI: filtered user edit updates the exact fixture ID and preserves the other user and roles', async ({ page }) => {
  await setTestLanguage(page); await login(page, 'admin'); const api = await apiFor(page);
  const prefix = `e2e_edit_${suffix().replaceAll('-', '_')}`;
  const ids: number[] = [];
  try {
    const role = await dbOne<{ id: number }>("SELECT id FROM roles WHERE name IN ('USER','ROLE_USER') ORDER BY id LIMIT 1");
    expect(role).not.toBeNull();
    for (const letter of ['a', 'b']) {
      const username = `${prefix}_${letter}`;
      await success(await api.post(API_ENDPOINTS.members.base, { data: {
        type: 'user', username, email: `${username}@example.invalid`, passwordHash: 'E2E-fixture-password-42!',
        age: 28, goals: `Original ${letter}`, roleIds: [role!.id],
      } }), 'Create isolated admin edit fixture');
      const user = await dbOne<{ id: number }>('SELECT id FROM users WHERE username=$1', [username]);
      expect(user).not.toBeNull(); ids.push(user!.id);
    }
    const beforeTarget = await dbOne('SELECT * FROM users WHERE id=$1', [ids[0]]);
    const beforeOther = await dbOne('SELECT * FROM users WHERE id=$1', [ids[1]]);
    const beforeRoles = (await db().query('SELECT * FROM user_roles WHERE user_id=ANY($1::int[]) ORDER BY user_id,role_id', [ids])).rows;
    await page.goto('/admin/users/edit');
    const surface = page.locator('app-user-edit');
    const userPicker = surface.locator('app-user-select').getByRole('combobox');
    await userPicker.fill(`${prefix}_a`);
    await expect(page.getByRole('option', { name: `${prefix}_b`, exact: true })).toHaveCount(0);
    await page.getByRole('option', { name: `${prefix}_a`, exact: true }).click();
    await expect(surface.locator('#username')).toHaveValue(`${prefix}_a`);
    await surface.locator('#age').fill('37');
    await surface.locator('#goals').fill('Changed only through admin GUI');
    const saved = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === API_ENDPOINTS.members.base);
    await surface.getByRole('button', { name: /^(mentés|save|speichern)$/i }).click();
    const response = await saved; expect(response.ok()).toBe(true);
    expect(response.request().postDataJSON()).toMatchObject({ id: ids[0], type: 'user', age: 37, goals: 'Changed only through admin GUI' });
    expect((await response.json()).success).toBe(true);
    const target = await dbOne('SELECT * FROM users WHERE id=$1', [ids[0]]);
    expect(target).toMatchObject({ age: 37, goals: 'Changed only through admin GUI' });
    for (const field of ['id','username','email','coach_id','password_hash']) expect(target[field]).toEqual(beforeTarget[field]);
    expect(await dbOne('SELECT * FROM users WHERE id=$1', [ids[1]])).toEqual(beforeOther);
    expect((await db().query('SELECT * FROM user_roles WHERE user_id=ANY($1::int[]) ORDER BY user_id,role_id', [ids])).rows).toEqual(beforeRoles);
    await page.reload();
    await userPicker.fill(`${prefix}_a`);
    await page.getByRole('option', { name: `${prefix}_a`, exact: true }).click();
    await expect(surface.locator('#age')).toHaveValue('37');
    await expect(surface.locator('#goals')).toHaveValue('Changed only through admin GUI');
    const read = await success(await api.get(`/api/members/users/${ids[0]}`), 'Read exact edited user');
    expect(Number(read.data.id)).toBe(ids[0]); expect(read.data.extraFields.goals).toBe('Changed only through admin GUI');
  } finally {
    try {
      // There is no member DELETE API. Only this test's newly created users are removed,
      // following the existing AUTH/DB fixture lifecycle; the edit under test is GUI/API-only.
      await db().query('DELETE FROM users WHERE id=ANY($1::int[]) AND username LIKE $2', [ids, `${prefix}%`]);
      expect((await db().query('SELECT id FROM users WHERE id=ANY($1::int[])', [ids])).rows).toEqual([]);
    } finally { await api.dispose(); }
  }
});
