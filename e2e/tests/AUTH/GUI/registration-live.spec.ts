import { test, expect } from '@playwright/test';
import { accountIdentity, cleanupAccount, loginAccount } from '../../helpers/p1-fixture';
import { apiFor, closeDb, db, dbOne, login, success } from '../../helpers/e2e-next-3-helpers';
import { loginControls } from '../../helpers/auth-session';
import { setTestLanguage } from '../../helpers/read-only';

test.describe.configure({ timeout: 120_000 });
test.afterAll(closeDb);
test('REGISTRATION LIVE: UI registration → pending login denied → admin UI approval + coach → real user login', async ({ page }) => {
  const identity = accountIdentity();
  await setTestLanguage(page);
  try {
    await page.goto('/login');
    await page.getByRole('link', { name: 'Regisztráció', exact: true }).click();
    await page.locator('#register-username').fill(identity.username);
    await page.locator('#register-email').fill(identity.email);
    await page.locator('#register-password').fill(identity.password);
    await page.locator('#register-password-confirmation').fill(identity.password);
    await page.getByText('További adatok (nem kötelező)', { exact: true }).click();
    await page.locator('#register-age').fill('31');
    await page.locator('#register-weight').fill('70.5');
    await page.locator('#register-goals').fill('P1 regisztráció');
    const submitted = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/auth/register');
    await page.getByRole('button', { name: 'Regisztráció elküldése', exact: true }).click();
    const response = await submitted;
    expect(response.status()).toBe(202);
    expect(await response.json()).toMatchObject({ success: true, data: { status: 'PENDING' } });
    await expect(page.getByRole('heading', { name: 'Regisztráció elküldve', exact: true })).toBeVisible();
    const registration = await dbOne('SELECT * FROM registration_requests WHERE login_name=$1 AND email=$2', [identity.username, identity.email]);
    expect(registration).toMatchObject({ account_type: 'USER', status: 'PENDING', created_user_id: null, decided_at: null, age: 31 });
    expect(registration.password_hash).not.toBe(identity.password);
    expect(await dbOne('SELECT id FROM users WHERE username=$1 OR email=$2', [identity.username, identity.email])).toBeNull();
    await page.goto('/login');
    const controls = loginControls(page);
    await controls.usernameInput.fill(identity.username); await controls.passwordInput.fill(identity.password);
    const pendingLogin = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/auth/web/login');
    await controls.submitButton.click();
    expect((await pendingLogin).status()).toBe(401);
    await expect(page).toHaveURL(/\/login$/);

    await login(page, 'admin');
    const coach = await dbOne('SELECT id,name FROM coaches WHERE name=$1', [process.env.E2E_COACH_USERNAME]);
    expect(coach).not.toBeNull();
    const listResponse = () => page.waitForResponse(r => r.request().method() === 'GET' && new URL(r.url()).pathname === '/api/admin/registrations');
    const first = listResponse();
    await page.goto('/admin/registrations');
    let list = await (await first).json();
    expect(list.success).toBe(true);
    // Navigate actual pagination when other pending requests precede ours. Never approve another identity.
    for (let current = 1; !list.data.content.some((r: any) => Number(r.id) === Number(registration.id)) && current < list.data.totalPages; current++) {
      const next = listResponse();
      await page.locator('app-registration-requests app-pagination').getByRole('button', { name: 'Következő', exact: true }).click();
      list = await (await next).json(); expect(list.success).toBe(true);
    }
    expect(list.data.content.some((r: any) => Number(r.id) === Number(registration.id))).toBe(true);
    const item = page.getByRole('listitem', { name: identity.username, exact: true });
    await expect(item).toContainText(identity.email);
    await item.locator('select').selectOption({ label: coach.name });
    const approved = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === `/api/admin/registrations/${registration.id}/approve`);
    await item.getByRole('button', { name: 'Jóváhagyás', exact: true }).click();
    const approval = await approved;
    expect(approval.request().postDataJSON()).toEqual({ coachId: coach.id });
    expect(approval.status()).toBe(200); expect((await approval.json()).success).toBe(true);
    await expect(item).toHaveCount(0);
    const user = await dbOne('SELECT * FROM users WHERE username=$1 AND email=$2', [identity.username, identity.email]);
    expect(user).toMatchObject({ coach_id: coach.id, age: 31, goals: 'P1 regisztráció' });
    expect(Number(user.weight)).toBe(70.5);
    expect(await dbOne('SELECT status,created_user_id FROM registration_requests WHERE id=$1', [registration.id])).toEqual({ status: 'APPROVED', created_user_id: user.id });
    const roles = (await db().query('SELECT r.name FROM roles r JOIN user_roles ur ON ur.role_id=r.id WHERE ur.user_id=$1', [user.id])).rows;
    expect(roles.map(r => r.name.replace(/^ROLE_/, ''))).toEqual(['USER']);
    const owner = await loginAccount(page, { ...identity, id: user.id });
    try {
      const me = await success(await owner.get(`/api/members/users/${user.id}`), 'Read approved account profile');
      expect(Number(me.data.id)).toBe(Number(user.id));
      await page.reload();
      await expect(page).toHaveURL(/\/user\/dashboard$/);
      await expect(page.locator('app-user-dashboard')).toBeVisible();
    } finally { await owner.dispose(); }
  } finally { await cleanupAccount(identity); }
});
