import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const baseUrl = (process.env.NGINX_BASE_URL || 'https://workouts.hevexora.com').replace(/\/$/, '');
const confPath = resolve(__dirname, '../../../nginx.runtime.conf');
const configExists = (() => { try { readFileSync(confPath); return true; } catch { return false; } })();

function config(): string { return readFileSync(confPath, 'utf8'); }
function block(pattern: RegExp): string {
  const match = config().match(pattern);
  expect(match, `NGINX location nem található: ${pattern}`).toBeTruthy();
  return match![0];
}
function assertProtected(status: number, redirect?: string): void {
  const cf = redirect && /^(?:https:\/\/[^/]+\.cloudflareaccess\.com|https:\/\/[^/]+\/cdn-cgi\/access\/)/i.test(redirect);
  expect(status === 401 || status === 403 || Boolean([302, 303, 307, 308].includes(status) && cf), `Védelem hiányzik: HTTP ${status}, Location=${redirect}`).toBeTruthy();
}

// Ezek a statikus ellenőrzések az éles NGINX konfigurációhoz tartoznak.
// A ZIP csak az e2e könyvtárat tartalmazza, ezért a konfigurációs tesztek
// kizárólag a tényleges nginx.runtime.conf meglétekor futnak.
test.describe('NGINX konfiguráció – útvonalak', () => {
  test.skip(!configExists, 'Az nginx.runtime.conf nem szerepel a feltöltött e2e ZIP-ben; a frontend repository gyökerében szükséges.');

  test('Swagger statikus erőforrások prioritásos backend proxyja', () => {
    expect(block(/location\s+\^~\s+\/swagger-ui\/\s*\{[^}]*\}/s)).toMatch(/proxy_pass\s+http:\/\/workouts-api:8080\s*;/);
  });
  test('Kétszintű Swagger prioritásos backend proxyja', () => {
    expect(block(/location\s+\^~\s+\/swagger-two-level\/\s*\{[^}]*\}/s)).toMatch(/proxy_pass\s+http:\/\/workouts-api:8080\s*;/);
  });
  test('API és OpenAPI backendhez irányít', () => {
    expect(block(/location\s+\/api\/\s*\{[^}]*\}/s)).toContain('proxy_pass http://workouts-api:8080/api/;');
    expect(block(/location\s+\/v3\/api-docs\s*\{[^}]*\}/s)).toContain('proxy_pass http://workouts-api:8080;');
  });
  test('HTTP HTTPS-re irányít és Angular SPA útvonal fennmarad', () => {
    expect(config()).toMatch(/return\s+301\s+https:\/\/\$host\$request_uri\s*;/);
    expect(block(/location\s+\/\s*\{[^}]*\}/s)).toMatch(/try_files\s+\$uri\s+\$uri\/\s+\/index\.html\s*;/);
    expect(block(/location\s+~\*\s+\\?\.\(js\|css[^}]*\}/s)).toMatch(/try_files\s+\$uri\s+=404\s*;/);
  });
  test('Szigorú CSP, HSTS és kattintáseltérítés elleni védelmek', () => {
    const c = config();
    for (const header of ['Strict-Transport-Security', 'Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy']) {
      expect(c, header).toMatch(new RegExp(`add_header\\s+${header}\\s+`));
    }
    expect(c).toContain("frame-ancestors 'none'");
    expect(c).toContain("object-src 'none'");
    expect(c).toContain('server_tokens off;');
  });
  test('Forwarded fejléc és Cloudflare kliens IP konfiguráció', () => {
    expect(config()).toContain('real_ip_header CF-Connecting-IP;');
    expect(config()).toMatch(/set_real_ip_from\s+[^;]+;/);
    expect(config()).toContain('X-Forwarded-Proto $scheme');
  });
});

test.describe('Éles NGINX – oldal és statikus fájlok', () => {
  test('Angular kezdőoldal HTML választ ad', async ({ request }) => {
    const r = await request.get(baseUrl + '/', { maxRedirects: 0 });
    expect(r.status()).toBe(200);
    expect(r.headers()['content-type']).toMatch(/text\/html/i);
    expect(await r.text()).toMatch(/<html|<app-root/i);
  });
  test('Angular /login és SPA útvonal azonos belépő HTML-t szolgál ki', async ({ request }) => {
    for (const url of ['/login', '/this-is-a-client-side-route-nginx-verify-4832']) {
      const r = await request.get(baseUrl + url, { maxRedirects: 0 });
      expect(r.status(), url).toBe(200);
      expect(r.headers()['content-type'], url).toMatch(/text\/html/i);
      expect(await r.text(), url).toMatch(/<app-root|<html/i);
    }
  });
  test('Ismeretlen JS fájl 404; nem Angular HTML', async ({ request }) => {
    const r = await request.get(baseUrl + '/missing-nginx-security-check-783694.js', { maxRedirects: 0 });
    expect(r.status()).toBe(404);
    expect(await r.text()).not.toMatch(/<app-root|<html/i);
  });
  test('A kezdőoldal JS/CSS erőforrásai 200 és helyes MIME', async ({ request }) => {
    const home = await request.get(baseUrl + '/', { maxRedirects: 0 });
    expect(home.status()).toBe(200);
    const html = await home.text();
    const candidates = [...html.matchAll(/(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["']/gi)]
      .map(m => m[1]).filter(s => !/^https?:\/\//i.test(s));
    expect(candidates.length, 'Angular build JS/CSS linkek').toBeGreaterThan(0);
    for (const asset of candidates.slice(0, 8)) {
      const r = await request.get(new URL(asset, baseUrl + '/').href, { maxRedirects: 0 });
      expect(r.status(), asset).toBe(200);
      expect(r.headers()['content-type'], asset).toMatch(/\.css(?:\?|$)/.test(asset) ? /text\/css/i : /javascript|ecmascript/i);
    }
  });
});

test.describe('Éles NGINX – HTTPS és HTTP biztonság', () => {
  test('HTTP HTTPS-re irányít, nem szivárogtat más domainre', async ({ request }) => {
    const r = await request.get(baseUrl.replace(/^https:/, 'http:') + '/login', { maxRedirects: 0 });
    expect([301, 302, 307, 308]).toContain(r.status());
    const target = new URL(r.headers()['location'], baseUrl);
    expect(target.protocol).toBe('https:');
    expect(target.hostname).toBe(new URL(baseUrl).hostname);
  });
  test('HTTPS tanúsítványt a böngésző elfogadja', async ({ page }) => {
    const r = await page.goto(baseUrl + '/');
    expect(r?.status()).toBe(200);
  });
  test('HSTS HTTPS-en aktív és includeSubDomains beállított', async ({ request }) => {
    const r = await request.get(baseUrl + '/', { maxRedirects: 0 });
    expect(r.status()).toBe(200);
    expect(r.headers()['strict-transport-security']).toMatch(/max-age=\d+/i);
    expect(r.headers()['strict-transport-security']).toMatch(/includeSubDomains/i);
  });
  test('CSP script, object, frame és base védelmek', async ({ request }) => {
    const r = await request.get(baseUrl + '/', { maxRedirects: 0 });
    const csp = r.headers()['content-security-policy'] || '';
    expect(csp).toContain("script-src 'self'");
    expect(csp).toContain("object-src 'none'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("base-uri 'self'");
    expect(csp).not.toContain("'unsafe-eval'");
  });
  test('Clickjacking, MIME sniffing, referrer és feature tiltások', async ({ request }) => {
    const r = await request.get(baseUrl + '/', { maxRedirects: 0 });
    const h = r.headers();
    expect(h['x-frame-options']).toBe('DENY');
    expect(h['x-content-type-options']).toBe('nosniff');
    expect(h['referrer-policy']).toBe('strict-origin-when-cross-origin');
    expect(h['permissions-policy']).toContain('camera=()');
    expect(h['permissions-policy']).toContain('microphone=()');
  });
  test('NGINX verzió nem jelenik meg a Server fejlécben', async ({ request }) => {
    const r = await request.get(baseUrl + '/', { maxRedirects: 0 });
    const server = r.headers()['server'] || '';
    expect(server).not.toMatch(/nginx\/\d+(?:\.\d+)+/i);
  });
  test('TRACE metódus nem támogatott', async ({ request }) => {
    const r = await request.fetch(baseUrl + '/', { method: 'TRACE', maxRedirects: 0 });
    expect([400, 403, 405, 501]).toContain(r.status());
  });
  test('Frontend nem hirdet globális wildcard CORS-t', async ({ request }) => {
    const r = await request.get(baseUrl + '/', { headers: { Origin: 'https://untrusted-origin.example' }, maxRedirects: 0 });
    expect(r.headers()['access-control-allow-origin']).not.toBe('*');
  });
  test('Érzékeny fájlokat nem lehet letölteni a frontendről', async ({ request }) => {
    // Pontosan ismert / valós fájlneveket NEM találgatunk és nem kutatunk: ártalmatlan standard próbák.
    for (const uri of ['/.env', '/.git/config', '/nginx.runtime.conf']) {
      const r = await request.get(baseUrl + uri, { maxRedirects: 0 });
      if (r.status() === 200) {
        expect(r.headers()['content-type'], uri).toMatch(/text\/html/i);
        expect(await r.text(), uri).toMatch(/<app-root|<html/i);
      } else {
        expect([403, 404]).toContain(r.status());
      }
    }
  });
});

test.describe('Éles Cloudflare Access – anonim Swagger-védelem', () => {
  test('Swagger és OpenAPI névtelenül nem hozzáférhető', async ({ browser }) => {
    const context = await browser.newContext({ storageState: { cookies: [], origins: [] } });
    try {
      for (const uri of ['/swagger-ui/index.html', '/swagger-two-level/index.html', '/v3/api-docs', '/swagger-ui/swagger-ui-bundle.js']) {
        const r = await context.request.get(baseUrl + uri, { maxRedirects: 0 });
        assertProtected(r.status(), r.headers()['location']);
        expect(await r.text(), uri).not.toContain('"openapi":');
      }
    } finally { await context.close(); }
  });
});
