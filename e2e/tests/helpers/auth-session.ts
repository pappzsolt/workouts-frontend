import { expect, type Page, type Response } from '@playwright/test';

export type E2ERole = 'admin' | 'coach' | 'user';

function credentialsFor(role: E2ERole): { username: string; password: string } {
  const prefix = role.toUpperCase();
  const username = process.env[`E2E_${prefix}_USERNAME`];
  const password = process.env[`E2E_${prefix}_PASSWORD`];

  if (!username || !password || password === 'CHANGE_ME') {
    throw new Error(`Hiányzó E2E ${role} credentials.`);
  }

  return { username, password };
}

function expectedAuthority(role: E2ERole): string {
  return `ROLE_${role.toUpperCase()}`;
}

function expectedDashboard(role: E2ERole): string {
  return `/${role}/dashboard`;
}

function decodeJwtPayload(token: string): Record<string, unknown> {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('E2E auth: a frontend által eltárolt access token nem szabványos JWT.');
  }

  try {
    return JSON.parse(Buffer.from(parts[1], 'base64url').toString('utf8')) as Record<string, unknown>;
  } catch (error) {
    throw new Error(`E2E auth: az access token payload nem dekódolható: ${String(error)}`);
  }
}

async function readJsonResponse(response: Response): Promise<any> {
  const text = await response.text();
  try {
    return text ? JSON.parse(text) : null;
  } catch {
    throw new Error(
      `E2E login: /api/auth/web/login nem JSON választ adott. HTTP ${response.status()} body=${text}`,
    );
  }
}

// Fixture API clients use the token returned by the real browser login.
// This test-side state is never injected into the application or browser storage.
const browserAccessTokens = new WeakMap<Page, string>();
const observedPages = new WeakSet<Page>();

export function getAuthenticatedAccessToken(page: Page): string {
  const token = browserAccessTokens.get(page);
  if (!token) throw new Error('E2E: complete the actual browser login before creating an API fixture client.');
  return token;
}

function observeBrowserAuthorization(page: Page): void {
  if (observedPages.has(page)) return;
  observedPages.add(page);
  page.on('request', request => {
    const authorization = request.headers()['authorization'];
    if (authorization?.startsWith('Bearer ')) browserAccessTokens.set(page, authorization.slice(7));
  });
}

/** Validate the real web login, HttpOnly session, storage isolation and role redirect. */
export async function authenticate(page: Page, role: E2ERole): Promise<void> {
  const { username, password } = credentialsFor(role);
  const dashboard = expectedDashboard(role);
  observeBrowserAuthorization(page);
  browserAccessTokens.delete(page);
  await page.context().clearCookies({ name: 'workouts_refresh' });
  await page.goto('/login');
  await expect(page).toHaveURL(/\/login$/);
  const usernameInput = page.getByLabel(/^\s*(felhasználónév|username|benutzername)\s*$/i);
  const passwordInput = page.getByLabel(/^\s*(jelszó|password|passwort)\s*$/i);
  const submitButton = page.getByRole('button', { name: /^(bejelentkezés|login|anmelden)$/i });
  await usernameInput.fill(username);
  await passwordInput.fill(password);
  const loginResponsePromise = page.waitForResponse(response =>
    response.request().method() === 'POST' && new URL(response.url()).pathname === '/api/auth/web/login',
  );
  await submitButton.click();
  const loginResponse = await loginResponsePromise;
  const body = await readJsonResponse(loginResponse);
  expect(loginResponse.ok(), `Web login HTTP status: ${loginResponse.status()}`).toBe(true);
  expect(body?.success).toBe(true);
  expect(typeof body?.data?.accessToken).toBe('string');
  expect(body.data.accessToken.length).toBeGreaterThan(0);
  expect(body.data.refreshToken, 'Web refresh tokens must never be exposed in JSON.').toBeUndefined();
  browserAccessTokens.set(page, body.data.accessToken);
  const payload = decodeJwtPayload(body.data.accessToken);
  const roles = String(payload.roles ?? '').split(',').map(item => item.trim()).filter(Boolean);
  expect(roles).toContain(expectedAuthority(role));
  expect(Number(payload.exp)).toBeGreaterThan(Math.floor(Date.now() / 1000));
  const cookies = await page.context().cookies();
  const refresh = cookies.find(cookie => cookie.name === 'workouts_refresh');
  expect(refresh, 'The real web login must establish its refresh cookie.').toBeDefined();
  expect(refresh!.httpOnly).toBe(true);
  expect(refresh!.path).toBe('/api/auth/web');
  await expect(page).toHaveURL(new RegExp(`${dashboard}$`));
  expect(await page.evaluate(() => ({
    localAccess: localStorage.getItem('accessToken'),
    localRefresh: localStorage.getItem('refreshToken'),
    sessionAccess: sessionStorage.getItem('accessToken'),
    sessionRefresh: sessionStorage.getItem('refreshToken'),
  }))).toEqual({ localAccess: null, localRefresh: null, sessionAccess: null, sessionRefresh: null });
}

export async function authenticateAndOpen(
  page: Page,
  role: E2ERole,
  path?: string,
): Promise<void> {
  await authenticate(page, role);

  const target = path ?? expectedDashboard(role);
  if (new URL(page.url()).pathname !== target) {
    await page.goto(target);
  }

  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await expect(page).toHaveURL(new RegExp(`${escaped}$`), { timeout: 15_000 });
}
