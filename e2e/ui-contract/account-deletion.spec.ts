import { test, expect, Page } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// Optional local production-build fixture: no development server or API is needed.
test.beforeEach(async ({ page, baseURL }) => {
  const directory = process.env.E2E_STATIC_DIST;
  if (!directory) return;
  await page.route('**/*', async route => {
    const url = new URL(route.request().url());
    if (url.origin !== new URL(baseURL!).origin) return route.fallback();
    const relative = url.pathname === '/delete-account' ? 'index.html' : url.pathname.replace(/^\//, '');
    const file = path.resolve(directory, relative);
    if (!file.startsWith(path.resolve(directory) + path.sep)) return route.abort();
    try {
      const body = await readFile(file);
      const extension = path.extname(file);
      const contentType = ({ '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.json': 'application/json', '.woff2': 'font/woff2' } as Record<string, string>)[extension] || 'application/octet-stream';
      return route.fulfill({ body, contentType });
    } catch { return route.fulfill({ status: 404, body: '' }); }
  });
});

async function prepare(page: Page, status = 202) {
  const writes: { body: any; authorization?: string }[] = [];
  const authCalls: string[] = [];
  await page.addInitScript(() => localStorage.setItem('language', 'hu'));
  await page.route('**/assets/account-deletion.json', route => route.fulfill({ json: {
    appName: 'Workouts', captchaSiteKey: 'test-site-key', supportEmail: '',
    processingTime: 'Teszt feldolgozási tájékoztató.', retentionPolicy: 'Teszt adatmegőrzési tájékoztató.',
  } }));
  // This fixture replaces Google's script, never contacts Google and is not shipped in the app.
  await page.route('https://www.google.com/recaptcha/api.js?render=explicit', route => route.fulfill({
    contentType: 'application/javascript', body: `window.grecaptcha = {
      ready: cb => cb(), render: (host, options) => {
        window.testCaptchaOptions = options;
        const button = document.createElement('button'); button.type = 'button';
        button.textContent = 'Solve test CAPTCHA'; button.onclick = () => options.callback('test-token');
        host.appendChild(button); return 0;
      }, reset: () => { window.testCaptchaReset = true; }
    };`,
  }));
  await page.route('**/api/**', async route => {
    const req = route.request();
    if (req.url().includes('/public/account-deletion-requests')) {
      writes.push({ body: req.postDataJSON(), authorization: req.headers()['authorization'] });
      return route.fulfill({ status, headers: status === 429 ? { 'Retry-After': '60', 'Access-Control-Expose-Headers': 'Retry-After' } : {}, json: { success: status === 202, data: null } });
    }
    authCalls.push(req.url());
    return route.fulfill({ status: 401, json: { success: false, data: null } });
  });
  return { writes, authCalls };
}

test('public deletion works without login and confirms receipt rather than deletion', async ({ page }) => {
  const calls = await prepare(page);
  await page.goto('/delete-account');
  await expect(page.getByRole('heading', { name: 'Fiók és személyes adatok törlése' })).toBeVisible();
  const send = page.getByRole('button', { name: 'Törlési kérelem elküldése' });
  await expect(send).toBeDisabled();
  await page.getByLabel('A fiók e-mail-címe', { exact: true }).fill('user@example.com');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Solve test CAPTCHA' }).click();
  await send.click();
  await expect(page.getByRole('heading', { name: 'A kérelmedet rögzítettük' })).toBeVisible();
  expect(calls.writes).toHaveLength(1);
  expect(calls.writes[0].authorization).toBeUndefined();
  expect(calls.writes[0].body).toEqual({ email: 'user@example.com', message: '', captchaToken: 'test-token' });
  expect(calls.authCalls).toEqual([]);
  await expect(page).toHaveURL(/\/delete-account$/);
});

test('rate limit preserves entries and requires a new CAPTCHA', async ({ page }) => {
  await prepare(page, 429);
  await page.goto('/delete-account');
  await page.getByLabel('A fiók e-mail-címe', { exact: true }).fill('user@example.com');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Solve test CAPTCHA' }).click();
  const send = page.getByRole('button', { name: 'Törlési kérelem elküldése' });
  await send.click();
  await expect(page.getByRole('alert')).toContainText('Túl sok kérés');
  await expect(page.getByLabel('A fiók e-mail-címe', { exact: true })).toHaveValue('user@example.com');
  await expect(send).toBeDisabled();
  await expect(page.getByText('Újrapróbálás legkorábban 60 másodperc múlva.')).toBeVisible();
});
