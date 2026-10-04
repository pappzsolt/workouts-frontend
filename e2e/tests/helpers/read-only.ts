import { API_ENDPOINTS } from './api-endpoints';
import { expect, type Page } from '@playwright/test';
import { authenticateAndOpen, type E2ERole } from './auth-session';

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
    if (request.url().includes(API_ENDPOINTS.auth.login) || request.url().includes(API_ENDPOINTS.auth.refresh)) {
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
  const role = (path.match(/^\/(admin|coach|user)\//)?.[1] ?? 'user') as E2ERole;

  // The historical signature is kept because many specs still pass the env
  // values explicitly. Reject conflicting explicit values instead of silently
  // authenticating a different account.
  const prefix = role.toUpperCase();
  const configuredUsername = process.env[`E2E_${prefix}_USERNAME`];
  const configuredPassword = process.env[`E2E_${prefix}_PASSWORD`];

  if (username && configuredUsername && username !== configuredUsername) {
    throw new Error(`loginAs(${role}): explicit username differs from E2E_${prefix}_USERNAME.`);
  }
  if (password && configuredPassword && password !== configuredPassword) {
    throw new Error(`loginAs(${role}): explicit password differs from E2E_${prefix}_PASSWORD.`);
  }

  await authenticateAndOpen(page, role, path);
}

export async function navigateSpa(page: Page, path: string): Promise<void> {
  await page.goto(path, { waitUntil: 'domcontentloaded' });
  const escaped = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  await expect(page).toHaveURL(new RegExp(`${escaped}$`), { timeout: 15_000 });
}
