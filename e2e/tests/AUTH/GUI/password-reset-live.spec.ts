import { createHash } from 'node:crypto';
import { request, type Page } from '@playwright/test';
import { test, expect, loginAccount } from '../../helpers/p1-fixture';
import { closeDb, db, dbOne } from '../../helpers/e2e-next-3-helpers';
import { loginControls } from '../../helpers/auth-session';

test.describe.configure({ timeout: 120_000 });
test.afterAll(closeDb);

function decodedMail(raw: string): string {
  const split = raw.indexOf('\r\n\r\n');
  const headers = raw.slice(0, split);
  const body = raw.slice(split + 4);
  if (/Content-Transfer-Encoding:\s*base64/i.test(headers)) return Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf8');
  if (/Content-Transfer-Encoding:\s*quoted-printable/i.test(headers)) return body.replace(/=\r\n/g, '').replace(/=([0-9a-f]{2})/gi, (_, hex) => String.fromCharCode(parseInt(hex, 16)));
  return body;
}

async function emailedResetLink(page: Page, email: string): Promise<URL> {
  const inbox = await request.newContext({ baseURL: process.env.E2E_MAILBOX_URL ?? 'http://127.0.0.1:8025' });
  try {
    const ready = await inbox.get('/health');
    expect(ready.status(), 'Start npm run mailbox and point the test backend SMTP at it.').toBe(200);
    expect((await ready.json()).ready).toBe(true);
    expect((await inbox.delete('/messages', { params: { to: email } })).status()).toBe(200);
    await page.goto('/forgot-password');
    await page.locator('#forgot-password-email').fill(email);
    const sent = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/auth/forgot-password');
    await page.locator('app-forgot-password button[type=submit]').click();
    const response = await sent;
    expect(response.status()).toBe(200); expect((await response.json()).success).toBe(true);
    let link: URL | undefined;
    await expect.poll(async () => {
      const delivered = await inbox.get('/messages', { params: { to: email } });
      expect(delivered.status()).toBe(200);
      const mails = await delivered.json() as { to: string[]; raw: string }[];
      for (const mail of mails) {
        expect(mail.to).toContain(email.toLowerCase());
        const match = decodedMail(mail.raw).match(/https?:\/\/[^\s<>]+\/reset-password\?token=[a-f0-9]+/i);
        if (match) link = new URL(match[0]);
      }
      return !!link;
    }, { timeout: 60_000, intervals: [250, 500, 1000], message: 'The real SMTP outbox must deliver a reset link for this account.' }).toBe(true);
    const expectedOrigin = new URL(process.env.E2E_BASE_URL ?? 'http://localhost:4200').origin;
    expect(link!.origin, 'FRONTEND_BASE_URL must point at the tested frontend.').toBe(expectedOrigin);
    return link!;
  } finally { await inbox.dispose(); }
}

async function submitReset(page: Page, link: URL, password: string) {
  await page.goto(link.href);
  await page.locator('#reset-password-newPassword').fill(password);
  await page.locator('#reset-password-confirmPassword').fill(password);
  const pending = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/auth/reset-password');
  await page.locator('app-reset-password button[type=submit]').click();
  return pending;
}

test('PASSWORD RESET: real email → UI reset → new login; old password and reused token are rejected', async ({ page, account }) => {
  const link = await emailedResetLink(page, account.email);
  const token = link.searchParams.get('token')!;
  const hash = createHash('sha256').update(token).digest('hex');
  expect(await dbOne('SELECT id FROM password_reset_tokens WHERE account_type=$1 AND account_id=$2 AND token_hash=$3 AND used_at IS NULL', ['USER', account.id, hash])).not.toBeNull();
  const password = `${account.password}-new`;
  const reset = await submitReset(page, link, password);
  expect(reset.status()).toBe(200); expect((await reset.json()).success).toBe(true);
  await expect(page.locator('app-reset-password form')).toHaveCount(0);
  expect((await dbOne('SELECT used_at FROM password_reset_tokens WHERE token_hash=$1', [hash])).used_at).not.toBeNull();
  await page.goto('/login');
  const controls = loginControls(page);
  await controls.usernameInput.fill(account.username); await controls.passwordInput.fill(account.password);
  const refused = page.waitForResponse(r => r.request().method() === 'POST' && new URL(r.url()).pathname === '/api/auth/web/login');
  await controls.submitButton.click();
  expect((await refused).status()).toBe(401);
  await expect(page).toHaveURL(/\/login$/);
  const owner = await loginAccount(page, { ...account, password });
  try {
    const before = await dbOne('SELECT password_hash FROM users WHERE id=$1', [account.id]);
    const reused = await submitReset(page, link, `${password}-again`);
    expect(reused.status(), 'A consumed email token cannot be reused').toBe(400);
    expect((await reused.json()).success).toBe(false);
    await expect(page.locator('app-reset-password app-message')).toBeVisible();
    expect(await dbOne('SELECT password_hash FROM users WHERE id=$1', [account.id])).toEqual(before);
  } finally { await owner.dispose(); }
});

test('PASSWORD RESET: an expired emailed token is rejected without changing the password', async ({ page, account }) => {
  const link = await emailedResetLink(page, account.email);
  const hash = createHash('sha256').update(link.searchParams.get('token')!).digest('hex');
  const before = await dbOne('SELECT password_hash FROM users WHERE id=$1', [account.id]);
  // Explicit expiry precondition on this test's real token; avoids waiting the production TTL.
  const expired = await db().query("UPDATE password_reset_tokens SET expires_at=LOCALTIMESTAMP - INTERVAL '1 day' WHERE account_type='USER' AND account_id=$1 AND token_hash=$2 AND used_at IS NULL RETURNING id", [account.id, hash]);
  expect(expired.rowCount).toBe(1);
  const response = await submitReset(page, link, `${account.password}-expired`);
  expect(response.status(), 'An expired email token cannot change the password').toBe(400);
  expect((await response.json()).success).toBe(false);
  await expect(page.locator('app-reset-password app-message')).toBeVisible();
  expect(await dbOne('SELECT password_hash FROM users WHERE id=$1', [account.id])).toEqual(before);
  const owner = await loginAccount(page, account); await owner.dispose();
});
