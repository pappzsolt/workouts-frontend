'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');
const CONFIG_PATH = process.env.NGINX_CONFIG || path.join(ROOT, 'nginx.runtime.conf');
const BASE_URL = (process.env.NGINX_BASE_URL || 'https://workouts.hevexora.com').replace(/\/$/, '');
const BASE = new URL(BASE_URL);
const AUTH_USER = process.env.SWAGGER_ADMIN_USER;
const AUTH_PASSWORD = process.env.SWAGGER_ADMIN_PASSWORD;
const HAS_ADMIN = !!(AUTH_USER && AUTH_PASSWORD);
const SKIP_LIVE = process.env.NGINX_SKIP_LIVE === '1';

function getConfig() { return fs.readFileSync(CONFIG_PATH, 'utf8'); }
function blockFor(content, prefix) {
  const escaped = prefix.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const match = content.match(new RegExp(`location\\s+${escaped}\\s*\\{([^}]*)\\}`, 'm'));
  assert.ok(match, `Hiányzó NGINX location: ${prefix}`);
  return match[1];
}
function assertBackendProxy(block) {
  assert.match(block, /proxy_pass\s+http:\/\/workouts-api:8080(?:\/api\/)?\s*;/);
  assert.match(block, /proxy_set_header\s+X-Forwarded-Proto\s+\$scheme\s*;/);
}
function authorize() {
  if (!HAS_ADMIN) return {};
  return { Authorization: `Basic ${Buffer.from(`${AUTH_USER}:${AUTH_PASSWORD}`).toString('base64')}` };
}
async function request(urlPath, { authenticated = false, method = 'GET' } = {}) {
  const url = new URL(urlPath, BASE);
  assert.equal(url.origin, BASE.origin, 'Csak a megadott célhostra küldünk kérést');
  const response = await fetch(url, {
    method,
    redirect: 'manual',
    headers: { ...(authenticated ? authorize() : {}), 'Cache-Control': 'no-cache' },
    signal: AbortSignal.timeout(12000)
  });
  const text = method === 'HEAD' ? '' : await response.text();
  return { status: response.status, headers: response.headers, text };
}
function requireSecurityHeaders(r) {
  const h = r.headers;
  assert.match(h.get('strict-transport-security') || '', /max-age=\d+/i);
  assert.match(h.get('x-content-type-options') || '', /^nosniff$/i);
  assert.match(h.get('x-frame-options') || '', /^DENY$/i);
  assert.match(h.get('content-security-policy') || '', /default-src\s+'self'/i);
  assert.match(h.get('content-security-policy') || '', /object-src\s+'none'/i);
  assert.match(h.get('content-security-policy') || '', /frame-ancestors\s+'none'/i);
}
function noFrontendFallback(r, kind) {
  assert.doesNotMatch(r.text.slice(0, 300), /<!doctype html>[\s\S]*<html[^>]*data-beasties-container/i, `${kind}: Angular index.html jött válaszul`);
}

test('Konfiguráció: Swagger statikus fájlok ^~ útvonala és backend proxy', () => {
  assertBackendProxy(blockFor(getConfig(), '^~ /swagger-ui/'));
});
test('Konfiguráció: kétszintű Swagger ^~ útvonala és backend proxy', () => {
  assertBackendProxy(blockFor(getConfig(), '^~ /swagger-two-level/'));
});
test('Konfiguráció: API és OpenAPI proxy útvonalak', () => {
  assertBackendProxy(blockFor(getConfig(), '/api/'));
  assertBackendProxy(blockFor(getConfig(), '/v3/api-docs'));
});
test('Konfiguráció: Angular fallback, statikus 404 és HTTPS átirányítás', () => {
  const config = getConfig();
  assert.match(config, /try_files\s+\$uri\s+\$uri\/\s+\/index\.html\s*;/);
  assert.match(config, /try_files\s+\$uri\s+=404\s*;/);
  assert.match(config, /return\s+301\s+https:\/\/\$host\$request_uri\s*;/);
});
test('Konfiguráció: biztonsági fejlécek és Cloudflare IP kezelés', () => {
  const config = getConfig();
  for (const name of ['Strict-Transport-Security', 'Content-Security-Policy', 'X-Frame-Options', 'X-Content-Type-Options', 'Referrer-Policy']) {
    assert.match(config, new RegExp(`add_header\\s+${name}\\s+`, 'i'));
  }
  assert.match(config, /real_ip_header\s+CF-Connecting-IP\s*;/);
});

const live = (name, fn) => test(name, { skip: SKIP_LIVE ? 'NGINX_SKIP_LIVE=1' : false }, fn);

live('Éles: HTTPS frontend tartalmat ad, nem hibakódot', async () => {
  const r = await request('/');
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type') || '', /text\/html/i);
  assert.match(r.text, /<html\b/i);
  requireSecurityHeaders(r);
});
live('Éles: Angular kliensoldali útvonal visszaesik index.html-re', async () => {
  const r = await request('/login');
  assert.equal(r.status, 200);
  assert.match(r.text, /<html\b/i);
  requireSecurityHeaders(r);
});
live('Éles: nem létező JS nem Angular HTML-t kap', async () => {
  const r = await request('/nginx-test-not-present-xyz987.js');
  assert.equal(r.status, 404);
  noFrontendFallback(r, 'hiányzó JS');
});
live('Éles: Swagger/OpenAPI névtelen hozzáférés nem lehetséges', async () => {
  for (const p of ['/swagger-ui/index.html', '/swagger-two-level/index.html', '/swagger-ui/swagger-ui-bundle.js', '/swagger-ui/swagger-ui.css', '/swagger-two-level/hierarchy.js', '/v3/api-docs']) {
    const r = await request(p);
    const redirect = r.headers.get('location');
    const cloudflareAccess = [302, 303, 307, 308].includes(r.status) && redirect &&
      /^https:\/\/[^/]*\.cloudflareaccess\.com\//i.test(new URL(redirect, BASE).href);
    assert.ok(r.status === 401 || r.status === 403 || cloudflareAccess,
      `${p}: várt 401/403 vagy Cloudflare Access átirányítás, kapott ${r.status} (${redirect})`);
    requireSecurityHeaders(r);
  }
});
live('Éles: véletlen jelszóval nem lehet bejutni a Swaggerbe', async () => {
  const res = await fetch(new URL('/v3/api-docs', BASE), {
    redirect: 'manual',
    headers: { Authorization: 'Basic ' + Buffer.from('invalid-nginx-check-user:invalid-nginx-check-pass').toString('base64') },
    signal: AbortSignal.timeout(12000)
  });
  assert.ok([401,403].includes(res.status), `A hibás hitelesítést el kell utasítani: ${res.status}`);
});
live('Éles: frontend HTTPS fejlécek biztonsági beállításai', async () => {
  const r = await request('/');
  requireSecurityHeaders(r);
  assert.equal(r.headers.get('access-control-allow-origin'), null, 'Ne legyen globális CORS engedély minden originre');
});
live('Éles: HTTP átirányítás HTTPS-re', async () => {
  if (BASE.protocol !== 'https:') return;
  const url = new URL(BASE);
  url.protocol = 'http:';
  const res = await fetch(url, { redirect: 'manual', signal: AbortSignal.timeout(12000) });
  assert.ok([301,302,307,308].includes(res.status), `HTTP -> HTTPS átirányítás hiányzik: ${res.status}`);
  assert.match(res.headers.get('location') || '', /^https:\/\//i);
});

const authLive = (name, fn) => test(name, { skip: SKIP_LIVE ? 'NGINX_SKIP_LIVE=1' : (!HAS_ADMIN ? 'SWAGGER_ADMIN_USER és SWAGGER_ADMIN_PASSWORD szükséges' : false) }, fn);

authLive('ADMIN: standard Swagger HTML betöltődik', async () => {
  const r = await request('/swagger-ui/index.html', { authenticated: true });
  assert.equal(r.status, 200);
  assert.match(r.headers.get('content-type') || '', /text\/html/i);
  assert.match(r.text, /swagger/i);
  noFrontendFallback(r, 'Swagger standard');
  requireSecurityHeaders(r);
});
authLive('ADMIN: Swagger JavaScript és CSS megfelelő tartalomtípussal érkezik', async () => {
  for (const [p, type] of [
    ['/swagger-ui/swagger-ui-bundle.js', /javascript|ecmascript/i],
    ['/swagger-ui/swagger-ui.css', /text\/css/i],
    ['/swagger-two-level/hierarchy.js', /javascript|ecmascript/i]
  ]) {
    const r = await request(p, { authenticated: true });
    assert.equal(r.status, 200, `${p}: státusz ${r.status}`);
    assert.match(r.headers.get('content-type') || '', type, `${p}: hibás MIME`);
    assert.ok(r.text.length > 100, `${p}: üres/hibás fájl`);
    noFrontendFallback(r, p);
    requireSecurityHeaders(r);
  }
});
authLive('ADMIN: kétszintű Swagger és OpenAPI JSON betöltődik', async () => {
  const page = await request('/swagger-two-level/index.html', { authenticated: true });
  assert.equal(page.status, 200);
  assert.match(page.text, /hierarchy\.js/);
  noFrontendFallback(page, 'Swagger kétszintű');
  const docs = await request('/v3/api-docs', { authenticated: true });
  assert.equal(docs.status, 200);
  assert.match(docs.headers.get('content-type') || '', /json/i);
  const spec = JSON.parse(docs.text);
  assert.ok(spec.openapi || spec.swagger, 'Hiányzik az OpenAPI verzió');
  assert.ok(spec.paths && Object.keys(spec.paths).length > 0, 'Üres a végpontok listája');
});
