import { expect, type Page } from '@playwright/test';

export async function setTestLanguage(page: Page): Promise<void> {
  const lang = process.env.E2E_LANGUAGE ?? 'hu';
  await page.addInitScript((language) => {
    localStorage.setItem('language', language);
    localStorage.setItem('lang', language);
  }, lang);
}

export function installReadOnlyGuard(page: Page): string[] {
  const violations: string[] = [];
  page.on('request', (request) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) {
      return;
    }

    // Authentication requests are test setup, not page data mutations.
    // Business/API writes must still fail the read-only GUI tests.
    if (request.url().includes('/auth/login') || request.url().includes('/auth/refresh')) {
      return;
    }

    violations.push(`${request.method()} ${request.url()}`);
  });
  return violations;
}

export async function assertNoDataMutation(violations: string[]): Promise<void> {
  expect(violations, `Read-only page performed data mutation: ${violations.join(', ')}`).toEqual([]);
}

export async function loginAs(
  page: Page,
  username?: string,
  password?: string,
  path = '/user/dashboard',
): Promise<void> {
  if (!username || !password) {
    throw new Error('Hiányzó E2E credentials.');
  }

  await page.goto('/login');
  await page.evaluate(() => {
    localStorage.clear();
    sessionStorage.clear();
  });
  await page.reload();

  await page.locator('input[formcontrolname="username"]').fill(username);
  await page.locator('input[formcontrolname="password"]').fill(password);

  const loginResponsePromise = page.waitForResponse((response) =>
    response.request().method() === 'POST' &&
    response.url().endsWith('/auth/login'),
  );

  await page.locator('form button[type="submit"]').click();

  const loginResponse = await loginResponsePromise;
  expect(loginResponse.ok(), `Login failed: HTTP ${loginResponse.status()}`).toBeTruthy();

  // Wait for the application itself to finish its role-based redirect.
  // Navigating to the target route before this completes can race the
  // Angular auth/role guards and send the browser back to /login.
  await page.waitForURL(/\/(?:admin|coach|user)\/dashboard$/, { timeout: 15000 });

  const targetUrl = new URL(path, page.url());
  const currentUrl = new URL(page.url());

  if (currentUrl.pathname !== targetUrl.pathname || currentUrl.search !== targetUrl.search) {
    await page.goto(path);
  }

  await expect(page).toHaveURL(
    new RegExp(path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '$'),
    { timeout: 15000 },
  );
}

export async function navigateSpa(page: Page, path: string): Promise<void> {
  await page.goto(path);
  await page.waitForLoadState('networkidle').catch(() => {});
}
