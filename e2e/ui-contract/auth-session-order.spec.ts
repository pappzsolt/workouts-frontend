import { test, expect } from '@playwright/test';

test('session order: a new login waits until the previous logout response completes', async ({ page }) => {
  let requested!: () => void, release!: () => void;
  const logoutRequested = new Promise<void>(resolve => requested = resolve);
  const pending = new Promise<void>(resolve => release = resolve);
  let loginCount = 0;
  const payload = Buffer.from(JSON.stringify({ id: 1, sub: 'test-admin', roles: 'ROLE_ADMIN', exp: 4102444800 })).toString('base64url');
  const unexpected: string[] = [];
  await page.addInitScript(() => localStorage.setItem('language', 'hu'));
  await page.route('**/api/**', async route => {
    const path = new URL(route.request().url()).pathname;
    if (path === '/api/auth/web/login') {
      loginCount++;
      return route.fulfill({ json: { success: true, data: { accessToken: `eyJhbGciOiJIUzI1NiJ9.${payload}.test` } } });
    }
    if (path === '/api/auth/web/logout') {
      requested(); await pending;
      return route.fulfill({ json: { success: true, data: null } });
    }
    if (path === '/api/auth/web/refresh') return route.fulfill({ status: 401, json: { success: false, data: null } });
    if (path === '/api/admin/registrations/pending-count') return route.fulfill({ json: { success: true, data: { count: 0 } } });
    unexpected.push(path); return route.abort('blockedbyclient');
  });
  async function submit() {
    await page.locator('#login-username').fill('test-admin');
    await page.locator('#login-password').fill('Test-password-123!');
    await page.locator('app-login button[type=submit]').click();
  }
  try {
    await page.goto('/login'); await submit();
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await page.locator('header').getByRole('button', { name: 'Kijelentkezés', exact: true }).click();
    await logoutRequested;
    await expect(page).toHaveURL(/\/login$/);
    await submit();
    await expect(page.locator('app-login button[type=submit]')).toBeDisabled();
    expect(loginCount).toBe(1);
    release();
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    expect(loginCount).toBe(2);
    expect(unexpected).toEqual([]);
  } finally { release(); }
});
