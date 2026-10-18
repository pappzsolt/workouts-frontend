import { test, expect, request } from '@playwright/test';
import { authenticate } from '../helpers/auth-session';
import { API_ENDPOINTS as E } from '../helpers/api-endpoints';
import { BASE_API_URL } from '../helpers/e2e-next-3-helpers';

const origin = process.env.E2E_WEB_ORIGIN ?? process.env.E2E_BASE_URL ?? 'http://localhost:4200';
const forbiddenOrigin = 'https://untrusted-e2e-origin.example';
const fakeJwt = (payload: object) => [
  Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'),
  Buffer.from(JSON.stringify(payload)).toString('base64url'),
  'invalid-signature',
].join('.');

// Minden negatív próba izolált API-klienssel fut: nem támaszkodik a böngésző bejelentkezésére.
test.describe('SECURITY – API jogosulatlan hozzáférés', () => {
  for (const route of [E.members.base, E.roles.base, E.programs.coach, E.workouts.my]) {
    test(`Anonim GET tiltott: ${route}`, async () => {
      const api = await request.newContext({ baseURL: BASE_API_URL });
      try {
        const response = await api.get(route, { maxRedirects: 0 });
        expect(response.status(), `${route} nem lehet anonim módon elérhető`).toBe(401);
      } finally { await api.dispose(); }
    });
  }

  test('Érvénytelen vagy lejárt access token nem ad ADMIN hozzáférést', async () => {
    for (const token of [
      'not-a-jwt',
      fakeJwt({ sub: 'e2e-invalid', roles: 'ROLE_ADMIN', exp: 1 }),
      fakeJwt({ sub: 'e2e-forged', roles: 'ROLE_ADMIN', exp: 4102444800 }),
    ]) {
      const api = await request.newContext({ baseURL: BASE_API_URL, extraHTTPHeaders: { Authorization: `Bearer ${token}` } });
      try { expect((await api.get(E.members.base)).status()).toBe(401); }
      finally { await api.dispose(); }
    }
  });

  test('A refresh cookie önmagában nem hitelesít védett Bearer API-végponton', async () => {
    const api = await request.newContext({ baseURL: BASE_API_URL, extraHTTPHeaders: { Cookie: 'workouts_refresh=not-a-valid-token' } });
    try { expect((await api.get(E.members.base)).status()).toBe(401); }
    finally { await api.dispose(); }
  });
});

test.describe('SECURITY – CSRF / web refresh Origin védelem', () => {
  // Each negative case uses a REAL, fresh HttpOnly refresh cookie, so a 401
  // caused by an invalid fixture token cannot masquerade as CSRF protection.
  async function authenticatedRefreshCookie(browser: import('@playwright/test').Browser): Promise<{ cookie: string; close: () => Promise<void> }> {
    const context = await browser.newContext({ baseURL: origin });
    try {
      const page = await context.newPage();
      await authenticate(page, 'user');
      const refresh = (await context.cookies()).find(c => c.name === 'workouts_refresh');
      expect(refresh, 'Real login must provide a refresh cookie').toBeDefined();
      return { cookie: `${refresh!.name}=${refresh!.value}`, close: () => context.close() };
    } catch (error) {
      await context.close();
      throw error;
    }
  }

  for (const route of ['/api/auth/web/refresh', '/api/auth/web/logout']) {
    test(`${route}: idegen Origin HTTP 403`, async () => {
      const api = await request.newContext({ baseURL: BASE_API_URL });
      try {
        const r = await api.post(route, { headers: { Origin: forbiddenOrigin, Cookie: 'workouts_refresh=invalid-e2e-token' } });
        expect(r.status()).toBe(403);
      } finally { await api.dispose(); }
    });
    test(`${route}: Origin/Referer nélküli POST HTTP 403`, async ({ browser }) => {
      const session = await authenticatedRefreshCookie(browser);
      const api = await request.newContext({ baseURL: BASE_API_URL });
      try {
        const r = await api.post(route, { headers: { Cookie: session.cookie } });
        expect(r.status(), `${route}: real refresh cookie without Origin/Referer must be CSRF-rejected`).toBe(403);
      } finally {
        await api.dispose();
        await session.close();
      }
    });
    test(`${route}: hamisított Referer HTTP 403`, async ({ browser }) => {
      const session = await authenticatedRefreshCookie(browser);
      const api = await request.newContext({ baseURL: BASE_API_URL });
      try {
        const r = await api.post(route, {
          headers: { Referer: `${forbiddenOrigin}/attack`, Cookie: session.cookie },
        });
        expect(r.status(), `${route}: real refresh cookie with forged Referer must be CSRF-rejected`).toBe(403);
      } finally {
        await api.dispose();
        await session.close();
      }
    });
  }
  test('Engedélyezett Origin + hamis refresh cookie nem tesz sikeressé egy refresh-t', async () => {
    const api = await request.newContext({ baseURL: BASE_API_URL });
    try {
      const r = await api.post('/api/auth/web/refresh', { headers: { Origin: origin, Cookie: 'workouts_refresh=invalid-e2e-token' } });
      expect([400, 401, 403], `Hamis refresh token: ${r.status()}`).toContain(r.status());
    } finally { await api.dispose(); }
  });
});

test.describe('SECURITY – cookie attribútumok és session', () => {
  test('Valódi web login után a refresh cookie HttpOnly, a path szűkített és a SameSite Strict', async ({ browser }) => {
    const context = await browser.newContext({ baseURL: origin });
    try {
      const page = await context.newPage();
      await authenticate(page, 'user');
      const cookie = (await context.cookies()).find(c => c.name === 'workouts_refresh');
      expect(cookie).toBeDefined();
      expect(cookie!.httpOnly).toBe(true);
      expect(cookie!.sameSite).toBe('Strict');
      expect(cookie!.path).toBe('/api/auth/web');
      if (new URL(origin).protocol === 'https:') expect(cookie!.secure).toBe(true);
    } finally { await context.close(); }
  });

  test('Hiányzó cookie esetén nem lehet access tokent frissíteni', async () => {
    const api = await request.newContext({ baseURL: BASE_API_URL });
    try {
      const r = await api.post('/api/auth/web/refresh', { headers: { Origin: origin } });
      expect([400, 401, 403]).toContain(r.status());
    } finally { await api.dispose(); }
  });

  test('Lejárt és hamis JWT-vel új munkamenet nem hozható létre', async () => {
    const api = await request.newContext({ baseURL: BASE_API_URL, extraHTTPHeaders: {
      Authorization: `Bearer ${fakeJwt({ sub: 'expired-e2e', exp: 1, roles: 'ROLE_USER' })}`,
    } });
    try { expect((await api.get(E.workouts.my)).status()).toBe(401); }
    finally { await api.dispose(); }
  });
});

// Tényleges rate-limit küszöb átlépése zárolhat teszt IP-t vagy fiókot.
// Emiatt csak explicit kapcsolóval és a teszt-backendnek jelölt localhoston engedélyezett.
test.describe('SECURITY – rate limiting (izolált tesztkörnyezet)', () => {
  test('Jelszó-visszaállítási kéréseknek van érvényesíthető korlátja', async () => {
    test.skip(process.env.E2E_RATE_LIMIT_TEST !== '1', 'Opt-in szükséges: E2E_RATE_LIMIT_TEST=1');
    const apiUrl = new URL(BASE_API_URL);
    test.skip(!['localhost', '127.0.0.1', '::1'].includes(apiUrl.hostname), 'Rate limit próbát csak helyi tesztkörnyezeten engedünk');
    const max = Number(process.env.E2E_RATE_LIMIT_MAX_REQUESTS ?? '4');
    expect(Number.isInteger(max) && max >= 2 && max <= 5, '2–5 kérés a felső korlát').toBe(true);
    const email = `e2e-ratelimit-${Date.now()}@example.invalid`;
    const api = await request.newContext({ baseURL: BASE_API_URL });
    try {
      const statuses: number[] = [];
      for (let i = 0; i < max; i++) {
        const r = await api.post('/api/auth/forgot-password', { data: { email } });
        statuses.push(r.status());
        if (r.status() === 429) break;
      }
      expect(statuses, 'A teszt adatbázis rate-limit küszöbét 2–5 kérésen belül kell elérni').toContain(429);
    } finally { await api.dispose(); }
  });
});
