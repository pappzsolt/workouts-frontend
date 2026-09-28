import { expect, Page } from '@playwright/test';

const MUTATING_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);
const ALLOWED_MUTATIONS = ['/auth/login', '/auth/refresh'];

/**
 * Protects the read-only E2E suites from accidental data changes.
 * Login/refresh are the only allowed POST requests.
 */
export function installReadOnlyGuard(page: Page): string[] {
  const violations: string[] = [];

  page.on('request', (request) => {
    const method = request.method().toUpperCase();
    if (!MUTATING_METHODS.has(method)) {
      return;
    }

    const url = request.url();
    if (ALLOWED_MUTATIONS.some((path) => url.includes(path))) {
      return;
    }

    violations.push(`${method} ${url}`);
  });

  return violations;
}

export async function assertNoDataMutation(violations: string[]): Promise<void> {
  expect(
    violations,
    `Read-only E2E test attempted to modify data:\n${violations.join('\n')}`,
  ).toEqual([]);
}

/**
 * Logs in through the real UI. The application always redirects a successful
 * login to /coach/dashboard or /user/dashboard, so expectedPath is navigated
 * to afterwards without doing a second full browser reload.
 */
export async function loginAs(
  page: Page,
  username: string | undefined,
  password: string | undefined,
  expectedPath: string,
): Promise<void> {
  expect(username, 'Missing E2E username').toBeTruthy();
  expect(password, 'Missing E2E password').toBeTruthy();

  await page.goto('/login');
  await page.locator('input[formControlName="username"]').fill(username!);
  await page.locator('input[formControlName="password"]').fill(password!);
  await page.locator('button[type="submit"], app-button button').first().click();

  const dashboardPath = expectedPath.startsWith('/coach/')
    ? '/coach/dashboard'
    : '/user/dashboard';

  await expect(page).toHaveURL(new RegExp(`${dashboardPath.replace('/', '\\/')}$`), {
    timeout: 15_000,
  });

  if (expectedPath === dashboardPath) {
    return;
  }

  // Keep the Angular SPA alive. A second page.goto() would perform a full
  // reload and can temporarily leave app-root hidden while the auth/route
  // initialization runs. pushState + popstate lets Angular Router handle the
  // navigation inside the already authenticated application.
  await page.evaluate((path) => {
    window.history.pushState({}, '', path);
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  }, expectedPath);

  await expect(page).toHaveURL(new RegExp(`${expectedPath.replace('/', '\\/')}$`), {
    timeout: 15_000,
  });
}


export async function navigateSpa(page: Page, path: string): Promise<void> {
  await page.evaluate((targetPath) => {
    window.history.pushState({}, '', targetPath);
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  }, path);

  await expect(page).toHaveURL(new RegExp(`${path.replace('/', '\\/')}$`), {
    timeout: 15_000,
  });
}

export async function setTestLanguage(page: Page): Promise<void> {
  const language = process.env.E2E_LANGUAGE ?? 'hu';
  await page.addInitScript((value) => {
    localStorage.setItem('language', value);
  }, language);
}
