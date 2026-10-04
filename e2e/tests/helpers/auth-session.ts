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
      `E2E login: /api/auth/login nem JSON választ adott. HTTP ${response.status()} body=${text}`,
    );
  }
}

/**
 * Valódi E2E bejelentkezés a frontend login űrlapon keresztül.
 *
 * Nincs API-loginból tokenbefecskendezés és nincs guard-megkerülés:
 *  1. a böngésző megnyitja a /login oldalt,
 *  2. kitölti és elküldi az Angular formot,
 *  3. ellenőrzi a böngésző által indított valódi POST /api/auth/login választ,
 *  4. ellenőrzi, hogy az AuthService maga mentette el a tokeneket,
 *  5. ellenőrzi a JWT szerepkört és lejáratot,
 *  6. megvárja a LoginComponent saját role-alapú redirectjét.
 */
export async function authenticate(page: Page, role: E2ERole): Promise<void> {
  const { username, password } = credentialsFor(role);
  const dashboard = expectedDashboard(role);

  await page.goto('/login');
  await expect(page).toHaveURL(/\/login$/, { timeout: 15_000 });

  // Egy teszt mindig tiszta AUTH sessionből induljon.
  // Csak az auth tokeneket töröljük: a nyelvi és egyéb frontend állapotot nem,
  // mert azt a teszt külön, a valódi UI működés részeként állíthatta be.
  await page.evaluate(() => {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
  });

  const usernameInput = page.locator('input[formcontrolname="username"]');
  const passwordInput = page.locator('input[formcontrolname="password"]');
  const submitButton = page.locator('form button[type="submit"]');

  await expect(usernameInput).toBeVisible();
  await expect(passwordInput).toBeVisible();
  await expect(submitButton).toBeVisible();
  await expect(submitButton).toBeEnabled();

  await usernameInput.fill(username);
  await passwordInput.fill(password);

  const loginResponsePromise = page.waitForResponse(
    (response) => {
      if (response.request().method() !== 'POST') return false;
      try {
        return new URL(response.url()).pathname === '/api/auth/login';
      } catch {
        return false;
      }
    },
    { timeout: 15_000 },
  );

  await submitButton.click();

  const loginResponse = await loginResponsePromise;
  const body = await readJsonResponse(loginResponse);

  expect(
    loginResponse.ok(),
    `Frontend login request failed: HTTP ${loginResponse.status()} body=${JSON.stringify(body)}`,
  ).toBeTruthy();
  expect(
    body?.success,
    `Frontend login backend response success=false: ${JSON.stringify(body)}`,
  ).toBeTruthy();
  expect(body?.data?.accessToken, 'Frontend login response-ból hiányzik az accessToken.').toBeTruthy();
  expect(body?.data?.refreshToken, 'Frontend login response-ból hiányzik a refreshToken.').toBeTruthy();

  // Nem a response tokenjét írjuk be a storage-ba: azt ellenőrizzük, hogy
  // a valódi AuthService tap() már elmentette-e saját maga.
  await expect
    .poll(
      async () =>
        page.evaluate(() => ({
          accessToken: localStorage.getItem('accessToken'),
          refreshToken: localStorage.getItem('refreshToken'),
        })),
      {
        timeout: 10_000,
        message: 'A frontend AuthService nem mentette el a login után a tokeneket.',
      },
    )
    .toEqual({
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken,
    });

  const storedAccessToken = await page.evaluate(() => localStorage.getItem('accessToken'));
  expect(storedAccessToken, 'A frontend localStorage accessToken üres login után.').toBeTruthy();

  const payload = decodeJwtPayload(storedAccessToken!);
  const roles = String(payload.roles ?? '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const authority = expectedAuthority(role);

  expect(
    roles,
    `A valódi login JWT-ben nincs ${authority}. sub=${String(payload.sub ?? '')}, roles=${roles.join(',') || '<empty>'}`,
  ).toContain(authority);
  expect(Number(payload.exp), 'A valódi login JWT exp claim hiányzik/lejárt.').toBeGreaterThan(
    Math.floor(Date.now() / 1000),
  );

  await expect(page).toHaveURL(new RegExp(`${dashboard.replaceAll('/', '\\/')}$`), {
    timeout: 15_000,
  });
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
