import { expect, test } from '@playwright/test';
import { authenticateAndOpen } from '../../helpers/auth-session';
import { db, dbOne, closeDb } from '../../helpers/e2e-next-3-helpers';
import { reportSelect } from '../../helpers/select-report';

const sql = `SELECT u.id, u.username, u.email, u.age, u.weight::text AS weight,
  u.height::text AS height, u.goals, r.name AS role_name
  FROM users u JOIN user_roles ur ON ur.user_id=u.id
  JOIN roles r ON r.id=ur.role_id WHERE u.username=$1 ORDER BY r.name`;

test.afterAll(closeDb);
test('ADMIN: felhasználó létrehozás űrlapon → PostgreSQL SELECT → takarítás', async ({ page }) => {
  await authenticateAndOpen(page, 'admin');
  await page.goto('/admin/users/new');
  const form = page.locator('app-user-new form');
  await expect(form.locator('#username')).toBeVisible();
  const unique = `${Date.now()}${Math.floor(Math.random()*100000)}`;
  const expected = {
    username: `e2e_user_${unique}`,
    email: `e2e_${unique}@example.invalid`,
    age: 29, weight: 76.5, height: 180.5,
    goals: `E2E database verification ${unique}`,
    role_name: 'USER',
  };
  let createdId: number | null = null;
  await form.locator('#username').fill(expected.username);
  await form.locator('#email').fill(expected.email);
  // Not emitted in console or Playwright attachments.
  await form.locator('#password').fill(`E2e!Strong_${unique}Ab9`);
  await form.locator('#age').fill(String(expected.age));
  await form.locator('#weight').fill(String(expected.weight));
  await form.locator('#height').fill(String(expected.height));
  await form.locator('#goals').fill(expected.goals);
  const roleSelect = form.locator('app-role-select select');
  await expect(roleSelect.locator('option').filter({ hasText: 'USER' })).toHaveCount(1, { timeout: 15000 });
  await roleSelect.selectOption({ label: 'USER' });
  try {
    const pending = page.waitForResponse(r => r.request().method()==='POST' && new URL(r.url()).pathname==='/api/members');
    await form.locator('button[type=submit]').click();
    const response = await pending;
    expect(response.ok(), `Create member HTTP ${response.status()}`).toBe(true);
    expect((await response.json()).success).toBe(true);
    const stored = await db().query(sql, [expected.username]);
    await reportSelect('new-user', sql, expected, stored.rows);
    expect(stored.rows).toHaveLength(1);
    const row = stored.rows[0];
    createdId = Number(row.id);
    expect(row).toMatchObject({ username: expected.username, email: expected.email,
      age: expected.age, goals: expected.goals, role_name: expected.role_name });
    expect(Number(row.weight)).toBe(expected.weight);
    expect(Number(row.height)).toBe(expected.height);
  } finally {
    // There is no DELETE /api/members endpoint. Remove ONLY this unique test account,
    // and only with an explicit opt-in to DB cleanup. Never touch a pre-existing user.
    const row = await dbOne<{id:number}>('SELECT id FROM users WHERE username=$1 AND email=$2', [expected.username, expected.email]);
    if (row) {
      createdId = Number(row.id);
      if (process.env.E2E_ALLOW_USER_DB_CLEANUP !== 'true') {
        console.warn(`[CLEANUP REQUIRED] E2E user ${expected.username} (id=${createdId}); set E2E_ALLOW_USER_DB_CLEANUP=true for automated cleanup`);
      } else {
        const client = await db().connect();
        try {
          await client.query('BEGIN');
          const delRoles = await client.query('DELETE FROM user_roles WHERE user_id=$1', [createdId]);
          const delUser = await client.query('DELETE FROM users WHERE id=$1 AND username=$2 AND email=$3 RETURNING id', [createdId, expected.username, expected.email]);
          expect(delUser.rowCount).toBe(1);
          await client.query('COMMIT');
          console.log(`[CLEANUP] test user id=${createdId}, roles=${delRoles.rowCount}`);
        } catch (e) { await client.query('ROLLBACK'); throw e; }
        finally { client.release(); }
        expect(await dbOne('SELECT id FROM users WHERE id=$1', [createdId])).toBeNull();
      }
    }
  }
});
