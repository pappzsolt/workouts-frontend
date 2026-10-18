import { test, expect } from '@playwright/test';

const baseUrl = (process.env.NGINX_BASE_URL || 'https://workouts.hevexora.com').replace(/\/$/, '');
const hasAdmin = !!(process.env.SWAGGER_ADMIN_USER && process.env.SWAGGER_ADMIN_PASSWORD);
const hasAuth = require('node:fs').existsSync(require('node:path').resolve(__dirname, '../../.auth/cloudflare-swagger.json'));
const hasFullLogin = hasAdmin && hasAuth;

function cfLoginRedirect(status: number, location: string | null): boolean {
  return [302, 303, 307, 308].includes(status) && !!location &&
    /^https:\/\/[^/]*\.cloudflareaccess\.com\//i.test(new URL(location, baseUrl).href);
}

// Friss anonim kontextus: nem használja sem a Cloudflare storageState-et, sem az ADMIN Basic Authot.
test('Névtelen kérés nem jut át a Cloudflare Accessen', async ({ browser }) => {
  const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
  try {
    for (const uri of ['/swagger-ui/index.html', '/swagger-two-level/index.html', '/v3/api-docs']) {
      const response = await context.request.get(baseUrl + uri, { maxRedirects: 0 });
      const status = response.status();
      const location = response.headers()['location'] || null;
      expect([401, 403].includes(status) || cfLoginRedirect(status, location),
        `${uri}: nem védett státusz ${status}; location=${location}`).toBeTruthy();
      expect(await response.text()).not.toContain('"openapi":');
    }
  } finally { await context.close(); }
});

test('HTTP átirányítás HTTPS-re', async ({ request }) => {
  const response = await request.get(baseUrl.replace(/^https:/, 'http:') + '/', { maxRedirects: 0 });
  expect([301, 302, 307, 308]).toContain(response.status());
  expect(response.headers()['location']).toMatch(/^https:\/\//);
});

test.describe('Cloudflare Access + Swagger ADMIN belépés után', () => {
  test.skip(!hasFullLogin, 'Előbb futtasd a belépési segédscriptet és add meg a SWAGGER_ADMIN_USER/PASSWORD változókat.');

  test('Swagger felület ténylegesen megjelenik, nincs fehér képernyő', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.goto('/swagger-ui/index.html');
    await expect(page.locator('#swagger-ui')).toBeVisible();
    await expect(page.locator('.swagger-ui .info, .swagger-ui .opblock').first()).toBeVisible({ timeout: 20000 });
    expect(page.url()).toContain('/swagger-ui/');
    expect(errors, 'Böngészős JavaScript hibák').toEqual([]);
  });

  test('Swagger JavaScript és CSS nem Angular fallback és helyes MIME', async ({ page }) => {
    for (const [url, type] of [
      ['/swagger-ui/swagger-ui-bundle.js', /javascript|ecmascript/i],
      ['/swagger-ui/swagger-ui.css', /text\/css/i],
    ] as const) {
      const response = await page.request.get(url, { maxRedirects: 0 });
      expect(response.status(), url).toBe(200);
      expect(response.headers()['content-type'], url).toMatch(type);
      expect((await response.body()).length, url).toBeGreaterThan(100);
    }
  });

  test('Swagger kétszintű nézet megnyílik', async ({ page }) => {
    await page.goto('/swagger-two-level/index.html');
    await expect(page.locator('body')).not.toContainText('Log in to workouts');
    await expect(page.locator('body')).not.toContainText('Send login code');
    expect(page.url()).toContain('/swagger-two-level/');
    const response = await page.request.get('/swagger-two-level/hierarchy.js', { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/javascript|ecmascript/i);
  });

  test('OpenAPI JSON nem Angular HTML, végpontokkal', async ({ page }) => {
    const response = await page.request.get('/v3/api-docs', { maxRedirects: 0 });
    expect(response.status()).toBe(200);
    expect(response.headers()['content-type']).toMatch(/json/i);
    const json = await response.json();
    expect(json.openapi || json.swagger).toBeTruthy();
    expect(Object.keys(json.paths || {}).length).toBeGreaterThan(0);
  });

  test('Workouts Angular oldal működik, NGINX biztonsági fejlécekkel', async ({ page }) => {
    const response = await page.goto('/login');
    expect(response?.status()).toBe(200);
    await expect(page.locator('app-root')).toBeAttached();
    const h = response!.headers();
    expect(h['strict-transport-security']).toMatch(/max-age=/i);
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['content-security-policy']).toContain("object-src 'none'");
  });

  test('Nem létező JS 404, nem Angular index.html', async ({ page }) => {
    const response = await page.request.get('/nginx-e2e-does-not-exist-13975.js', { maxRedirects: 0 });
    expect(response.status()).toBe(404);
    expect(await response.text()).not.toMatch(/<app-root|data-beasties-container/);
  });
});
