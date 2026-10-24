import { test, expect, Page } from '@playwright/test';

// Hibabejelentés (felhasználó, edző) és megtekintése (admin) – mockolt API-val.
type Call = { method: string; path: string; body: string | null; contentType: string };
type Role = 'ROLE_USER' | 'ROLE_COACH' | 'ROLE_ADMIN';

const PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAIAAAD91JpzAAAAFklEQVR4nGNk+M/AwMDAxMDAwMDAAAANBAEB8f2SdwAAAABJRU5ErkJggg==',
  'base64',
);

async function mockApi(page: Page, role: Role, handler: (c: Call) => { status?: number; json?: unknown; body?: Buffer; type?: string } | null) {
  const calls: Call[] = [];
  await page.addInitScript(() => { localStorage.setItem('language', 'hu'); localStorage.setItem('lang', 'hu'); });
  await page.route('**/api/**', async (route) => {
    const request = route.request(); const url = new URL(request.url());
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': url.origin, 'access-control-allow-credentials': 'true' } });
    const c: Call = { method: request.method(), path: url.pathname, body: request.postData(), contentType: request.headers()['content-type'] ?? '' };
    calls.push(c);
    if (c.path === '/api/auth/web/refresh') {
      const payload = Buffer.from(JSON.stringify({ sub: 'kiss.anna', roles: role, exp: 4102444800 })).toString('base64url');
      return route.fulfill({ json: { success: true, data: { accessToken: `eyJhbGciOiJIUzI1NiJ9.${payload}.contract` }, message: null } });
    }
    const result = handler(c);
    if (result?.body) return route.fulfill({ status: result.status ?? 200, body: result.body, contentType: result.type });
    return route.fulfill({ status: result?.status ?? 200, json: result?.json ?? { success: true, data: [], message: null } });
  });
  return calls;
}

/** Mobilon a menü a hamburger gomb mögött van. */
async function openMenuItem(page: Page, name: string) {
  if ((page.viewportSize()?.width ?? 1280) < 640) await page.getByRole('button', { name: 'Menü megnyitása' }).click();
  await page.getByRole('link', { name, exact: true }).first().click();
}

test('user: menu item opens the form, client validation blocks bad input and files', async ({ page }) => {
  const calls = await mockApi(page, 'ROLE_USER', () => null);
  await page.goto('/user/profile');
  await openMenuItem(page, 'Hibabejelentés');
  await expect(page).toHaveURL(/\/user\/bug-report$/);
  await expect(page.locator('#bug-page')).toHaveValue('/user/profile');
  await expect(page.locator('form').getByText('kiss.anna')).toBeVisible();

  await page.locator('#bug-title').fill('   ');
  await page.locator('#bug-description').fill('rövid');
  await page.locator('#bug-page').fill('javascript:alert(1)');
  await page.getByRole('button', { name: 'Bejelentés elküldése' }).click();
  await expect(page.getByText('A leírás 10–5000 karakter legyen.')).toBeVisible();
  await expect(page.getByText('Csak az alkalmazáson belüli oldal adható meg', { exact: false })).toBeVisible();

  await page.locator('#bug-screenshots').setInputFiles({ name: 'evil.png', mimeType: 'image/png', buffer: Buffer.from('<svg onload=alert(1)>') });
  await expect(page.getByText('evil.png: csak PNG vagy JPEG kép csatolható.')).toBeVisible();
  await expect(page.locator('img[alt="evil.png"]')).toHaveCount(0);
  expect(calls.filter((c) => c.path === '/api/bug-reports')).toEqual([]);
});

test('user: sends text and screenshot as multipart and shows the recorded report; XSS stays text', async ({ page }) => {
  const calls = await mockApi(page, 'ROLE_USER', (c) => c.path === '/api/bug-reports'
    ? { status: 201, json: { success: true, data: { id: 42, createdAt: '2026-10-24T14:05:00+02:00', screenshots: 1 }, message: 'Köszönjük, a hibabejelentést rögzítettük.' } }
    : null);
  await page.goto('/user/bug-report');
  await page.locator('#bug-title').fill("<img src=x onerror=alert(1)> '; DROP TABLE x; --");
  await page.locator('#bug-description').fill('A mentés gomb nem csinál semmit.\nMásodik sor.');
  await page.locator('#bug-page').fill('/user/profile');
  await page.locator('#bug-screenshots').setInputFiles({ name: 'kep.png', mimeType: 'image/png', buffer: PNG });
  await expect(page.locator('img[alt="kep.png"]')).toBeVisible();
  let dialog = false;
  page.on('dialog', async (d) => { dialog = true; await d.dismiss(); });
  await page.getByRole('button', { name: 'Bejelentés elküldése' }).click();
  await expect(page.getByText('Köszönjük, a hibabejelentést rögzítettük.')).toBeVisible();
  await expect(page.getByText('#42')).toBeVisible();
  await expect(page.getByText('2026.10.24 14:05')).toBeVisible();

  const sent = calls.filter((c) => c.method === 'POST' && c.path === '/api/bug-reports');
  expect(sent.length).toBe(1);
  expect(sent[0].contentType).toContain('multipart/form-data');
  const body = sent[0].body ?? '';
  expect(body).toContain('name="title"');
  expect(body).toContain("<img src=x onerror=alert(1)> '; DROP TABLE x; --");
  expect(body).toContain('name="screenshots"; filename="kep.png"');
  expect(body).not.toContain('reporter');
  expect(dialog).toBe(false);
});

test('coach: has the menu item; backend rate limit message is shown', async ({ page }) => {
  await mockApi(page, 'ROLE_COACH', (c) => c.path === '/api/bug-reports'
    ? { status: 429, json: { success: false, data: null, message: 'Túl sok hibabejelentés rövid időn belül. Próbáld újra később.' } }
    : null);
  await page.goto('/coach/profile');
  await openMenuItem(page, 'Hibabejelentés');
  await expect(page).toHaveURL(/\/coach\/bug-report$/);
  await page.locator('#bug-title').fill('Edzői hiba');
  await page.locator('#bug-description').fill('A programszerkesztő nem ment.');
  await page.getByRole('button', { name: 'Bejelentés elküldése' }).click();
  await expect(page.getByText('Túl sok hibabejelentés rövid időn belül. Próbáld újra később.')).toBeVisible();
});

test('admin: lists reports with reporter, date and screenshot; content is rendered as text', async ({ page }) => {
  const report = {
    id: 7, reporterType: 'USER', reporterId: 316, reporterName: 'kiss.anna', reporterEmail: 'anna@example.com',
    title: '<img src=x onerror=alert(1)>', description: 'Első sor\n<script>alert(2)</script>', pageUrl: '/user/profile',
    userAgent: 'Mozilla/5.0', createdAt: '2026-10-24T13:30:00+02:00',
    screenshots: [{ id: 3, position: 1, contentType: 'image/png', width: 2, height: 2, sizeBytes: PNG.length }],
  };
  const calls = await mockApi(page, 'ROLE_ADMIN', (c) => {
    if (c.path === '/api/admin/bug-reports') return { json: { success: true, data: { content: [report], page: 0, size: 10, totalElements: 1, totalPages: 1 }, message: null } };
    if (c.path === '/api/admin/bug-reports/7/screenshots/3') return { body: PNG, type: 'image/png' };
    if (c.path === '/api/admin/registrations/pending-count') return { json: { success: true, data: { count: 0 }, message: null } };
    return null;
  });
  let dialog = false;
  page.on('dialog', async (d) => { dialog = true; await d.dismiss(); });
  await page.goto('/admin/dashboard');
  await openMenuItem(page, 'Hibabejelentések');
  await expect(page).toHaveURL(/\/admin\/bug-reports$/);
  const item = page.getByRole('listitem', { name: '<img src=x onerror=alert(1)>' });
  await expect(item.getByRole('heading', { name: '<img src=x onerror=alert(1)>' })).toBeVisible();
  await expect(item.getByText('kiss.anna')).toBeVisible();
  await expect(item.getByText('anna@example.com', { exact: false })).toBeVisible();
  await expect(item.getByText('2026.10.24 13:30', { exact: false })).toBeVisible();
  await expect(item.getByText('<script>alert(2)</script>', { exact: false })).toBeVisible();
  await expect(item.getByText('/user/profile')).toBeVisible();
  const thumb = item.getByRole('img', { name: '1. képernyőkép' });
  await expect(thumb).toBeVisible();
  expect(await thumb.getAttribute('src')).toMatch(/^blob:/);
  await item.getByRole('button', { name: '1. képernyőkép megnyitása' }).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByRole('dialog')).toHaveCount(0);
  expect(calls.some((c) => c.path === '/api/admin/bug-reports/7/screenshots/3')).toBe(true);
  expect(await page.locator('img[src="x"]').count()).toBe(0);
  expect(dialog).toBe(false);
});
