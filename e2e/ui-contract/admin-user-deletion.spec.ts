import { test, expect, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

async function setup(page: Page, baseURL: string) {
  const writes: any[] = [];
  const directory = process.env.E2E_STATIC_DIST;
  if (directory) await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL).origin) return route.fallback();
    const file = path.resolve(directory, path.extname(url.pathname) ? url.pathname.replace(/^\//, '') : 'index.html');
    if (!file.startsWith(path.resolve(directory) + path.sep)) return route.abort();
    try {
      const body = await readFile(file);
      const contentType = ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' } as Record<string,string>)[path.extname(file)] || 'application/octet-stream';
      return route.fulfill({ body, contentType });
    } catch { return route.fulfill({ status: 404 }); }
  });
  await page.addInitScript(() => localStorage.setItem('language', 'hu'));
  let deleted = false;
  await page.route('**/api/**', async route => {
    const req = route.request(), url = new URL(req.url());
    const success = (data: unknown) => route.fulfill({ json: { success: true, data, message: null } });
    if (url.pathname === '/api/auth/web/refresh') {
      const payload = Buffer.from(JSON.stringify({ sub: 'admin', roles: 'ROLE_ADMIN', exp: 4102444800 })).toString('base64url');
      return success({ accessToken: `eyJhbGciOiJIUzI1NiJ9.${payload}.test` });
    }
    if (url.pathname === '/api/members') return success([
      ...deleted ? [] : [{ id: 7, type: 'user', usernameOrName: 'Delete User', email: 'user@example.test', roles: ['USER'] }],
      { id: 7, type: 'coach', usernameOrName: 'Keep Coach', email: 'coach@example.test', roles: ['COACH'] },
    ]);
    if (url.pathname === '/api/admin/user-deletions/preview') return success({
      userId: 7, accountUuid: '74aab951-cfed-4a90-83c4-d5ad761096a8', username: 'Delete User', email: 'user@example.test', deletable: true,
      affectedData: { workouts: 2, programAssignments: 1, personalPrograms: 1, templates: 0, reports: 1 },
    });
    if (url.pathname === '/api/admin/user-deletions') {
      writes.push(req.postDataJSON()); deleted = true; return success(null);
    }
    if (url.pathname === '/api/admin/account-deletion-requests') return success({
      content: [{ id: 13, email: deleted ? 'deleted+13@account.invalid' : 'user@example.test', message: deleted ? null : 'delete please',
        status: deleted ? 'COMPLETED' : 'PENDING', createdAt: '2026-11-10T10:00:00Z', resolvedAt: deleted ? '2026-11-10T11:00:00Z' : null,
        resolvedBy: deleted ? 'USER:1' : null, resolutionNote: null }], page: 0, size: 20, totalElements: 1, totalPages: 1,
    });
    return route.fulfill({ status: 404, json: { success: false, data: null } });
  });
  return writes;
}

test('admin deletes the selected USER only after typed email and verification; same-ID coach stays', async ({ page, baseURL }) => {
  const writes = await setup(page, baseURL!);
  await page.goto('/admin/users');
  await expect(page.getByRole('button', { name: 'Felhasználó törlése', exact: true })).toHaveCount(1);
  await page.getByRole('button', { name: 'Felhasználó törlése', exact: true }).click();
  const dialog = page.getByRole('dialog'); await expect(dialog).toBeVisible();
  const confirm = dialog.getByRole('button', { name: 'Végleges törlés végrehajtása' });
  await expect(confirm).toBeDisabled();
  await dialog.getByRole('textbox').fill('wrong@example.test'); await dialog.getByRole('checkbox').check();
  await expect(confirm).toBeDisabled(); expect(writes).toEqual([]);
  await dialog.getByRole('textbox').fill('user@example.test'); await confirm.click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText('Keep Coach', { exact: true })).toBeVisible();
  await expect(page.getByText('Delete User', { exact: true })).toHaveCount(0);
  expect(writes).toHaveLength(1); expect(writes[0].userId).toBe(7); expect(writes[0].identityVerified).toBe(true);
});

test('admin request deletion includes request ID and refreshes the closed, redacted request', async ({ page, baseURL }) => {
  const writes = await setup(page, baseURL!);
  await page.goto('/admin/account-deletion-requests');
  await page.getByRole('button', { name: 'Felhasználó törlése', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByRole('textbox').fill('user@example.test'); await dialog.getByRole('checkbox').check();
  await dialog.getByRole('button', { name: 'Végleges törlés végrehajtása' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(page.getByText(/deleted\+13@account.invalid/)).toBeVisible();
  expect(writes).toHaveLength(1); expect(writes[0].deletionRequestId).toBe(13);
});
