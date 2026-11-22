import { test, expect, type Page } from '@playwright/test';
import { returningAccount } from './onboarding-fixture';

type Role = 'ROLE_USER' | 'ROLE_ADMIN';

/** Contract auth: browser uses the actual Angular router, not a simulated breadcrumb. */
async function authenticate(page: Page, role: Role) {
  if (role === 'ROLE_USER') await returningAccount(page, 'user', 42);
  await page.addInitScript(() => localStorage.setItem('language', 'hu'));
  const writes: string[] = [];
  const payload = Buffer.from(JSON.stringify({
    sub: 'test-user', id: 42, roles: role, exp: Math.floor(Date.now() / 1000) + 3600,
  })).toString('base64url');
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (request.method() !== 'GET' && path !== '/api/auth/web/refresh') {
      writes.push(`${request.method()} ${path}`);
    }
    if (path === '/api/auth/web/refresh') {
      return route.fulfill({ json: {
        success: true, data: { accessToken: `eyJhbGciOiJub25lIn0.${payload}.contract` }, message: null,
      } });
    }
    // Read-only fixtures satisfy each page's response shape. No backend writes.
    if (path === '/api/admin/account-deletion-requests') {
      return route.fulfill({ json: {
        success: true, data: { content: [], page: 0, size: 20, totalElements: 0, totalPages: 0 }, message: null,
      } });
    }
    if (path.endsWith('/pending-count')) {
      return route.fulfill({ json: { success: true, data: { count: 0 }, message: null } });
    }
    return route.fulfill({ json: { success: true, data: [], message: null } });
  });
  return writes;
}

for (const [path, title] of [
  ['/user/exercise-library', 'Gyakorlattár'],
  ['/user/completed-programs', 'Elvégzett programok'],
] as const) {
  test(`user: ${title} breadcrumb links back to dashboard`, { tag: '@ci-workouts' }, async ({ page }) => {
    const writes = await authenticate(page, 'ROLE_USER');
    await page.goto(path);
    const breadcrumb = page.locator('app-dashboard-navigation nav');
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText(title);
    const dashboard = breadcrumb.getByRole('link', { name: 'Felhasználói Dashboard' });
    await expect(dashboard).toHaveAttribute('href', '/user/dashboard');
    await dashboard.click();
    await expect(page).toHaveURL(/\/user\/dashboard$/);
    await expect(page.locator('app-user-dashboard')).toBeVisible();
    expect(writes).toEqual([]);
  });
}

test('admin: account deletion requests breadcrumb links back to dashboard',
  { tag: '@ci-workouts' }, async ({ page }) => {
    const writes = await authenticate(page, 'ROLE_ADMIN');
    await page.goto('/admin/account-deletion-requests');
    const breadcrumb = page.locator('app-dashboard-navigation nav');
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText('Fióktörlési kérelmek');
    const dashboard = breadcrumb.getByRole('link', { name: 'Admin Dashboard' });
    await expect(dashboard).toHaveAttribute('href', '/admin/dashboard');
    await dashboard.click();
    await expect(page).toHaveURL(/\/admin\/dashboard$/);
    await expect(page.locator('app-admin-dashboard')).toBeVisible();
    expect(writes).toEqual([]);
  });

test('dashboard: active breadcrumb is text, not a self-link',
  { tag: '@ci-workouts' }, async ({ page }) => {
    await authenticate(page, 'ROLE_USER');
    await page.goto('/user/dashboard');
    const breadcrumb = page.locator('app-dashboard-navigation nav');
    await expect(breadcrumb.locator('[aria-current="page"]')).toHaveText('Felhasználói Dashboard');
    await expect(breadcrumb.getByRole('link', { name: 'Felhasználói Dashboard' })).toHaveCount(0);
  });
