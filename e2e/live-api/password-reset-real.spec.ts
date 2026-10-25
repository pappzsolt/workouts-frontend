import { test, expect, apiFor, ok, API } from './live-fixture';
import { randomUUID } from 'node:crypto';

function decodedMail(raw: string) {
  const split = raw.indexOf('\r\n\r\n'); const headers = raw.slice(0, split); const body = raw.slice(split + 4);
  if (/Content-Transfer-Encoding:\s*base64/i.test(headers)) return Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8');
  if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(headers)) return body.replace(/=\r\n/g, '').replace(/=([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return body;
}

test('Valódi API és SMTP: emailes jelszócsere után az új jelszó működik, a régi és az ismételt token nem', async ({ page }) => {
  const username = `reset_${randomUUID().replace(/-/g, '').slice(0, 12)}`;
  const email = `${username}@example.test`; const password = 'Old-live-password-123!'; const newPassword = 'New-live-password-456!';
  const admin = await apiFor('admin');
  try {
    const roles = (await ok(await admin.get('/api/roles'))).data;
    const role = roles.find((item: any) => item.name === 'USER'); expect(role).toBeTruthy();
    await ok(await admin.post('/api/members', { data: { type: 'user', username, email, password, roleIds: [role.id] } }));
    await page.goto('/forgot-password'); await page.locator('#forgot-password-email').fill(email);
    const sent = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/forgot-password' && r.request().method() === 'POST');
    await page.locator('app-forgot-password button[type=submit]').click(); expect((await sent).status()).toBe(200);
    await expect(page.locator('app-forgot-password app-message[type=success]')).toBeVisible();
    let link = '';
    await expect.poll(async () => {
      const response = await page.request.get('http://127.0.0.1:8026/messages', { params: { to: email } }); expect(response.status()).toBe(200);
      const messages = await response.json();
      for (const message of messages) {
        const match = decodedMail(message.raw).match(/http:\/\/127\.0\.0\.1:4323\/reset-password\?token=[a-f0-9]+/i);
        if (match) link = match[0];
      }
      return Boolean(link);
    }, { timeout: 30000 }).toBe(true);
    await page.goto(link); await page.locator('#reset-password-newPassword').fill(newPassword); await page.locator('#reset-password-confirmPassword').fill(newPassword);
    const changed = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/reset-password' && r.request().method() === 'POST');
    await page.locator('app-reset-password button[type=submit]').click(); expect((await changed).status()).toBe(200);
    await expect(page.locator('app-reset-password app-message[type=success]')).toBeVisible();
    expect((await page.request.post(`${API}/api/auth/login`, { data: { username, password } })).status()).toBe(401);
    const reuse = await page.request.post(`${API}/api/auth/reset-password`, { data: { token: new URL(link).searchParams.get('token'), newPassword: 'Unwanted-password-789!' } });
    expect(reuse.status()).toBe(400);
    await page.goto('/login'); await page.locator('#login-username').fill(username); await page.locator('#login-password').fill(newPassword);
    const logged = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/web/login' && r.request().method() === 'POST');
    await page.locator('app-login button[type=submit]').click(); expect((await logged).status()).toBe(200);
    await expect(page).toHaveURL(/\/user\/dashboard$/);
  } finally { await admin.dispose(); }
});
