import { test as base, expect, type Page, type Route } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

export type Call = { method: string; path: string; language: string | null; body: unknown };
type Handler = (route: Route, call: Call) => Promise<void>;
export const LOGIN = '/api/auth/web/login';
export const FORGOT = '/api/auth/forgot-password';
export const RESET = '/api/auth/reset-password';
export const PASSWORD = 'Contract-password-123!';

export class AuthApi {
  calls: Call[] = [];
  unexpected: string[] = [];
  private handlers = new Map<string, Handler>();
  on(path: string, handler: Handler) { this.handlers.set(`POST ${path}`, handler); }
  reply(path: string, status: number, json: unknown) {
    this.on(path, route => route.fulfill({ status, json }));
  }
  writes(path: string) { return this.calls.filter(call => call.method === 'POST' && call.path === path); }
  async install(page: Page) {
    await page.addInitScript(() => { localStorage.setItem('language', 'hu'); localStorage.setItem('lang', 'hu'); });
    await page.route('**/api/**', async route => {
      const request = route.request(); const url = new URL(request.url());
      if (request.method() === 'OPTIONS') {
        return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*' } });
      }
      const call: Call = { method: request.method(), path: url.pathname,
        language: url.searchParams.get('language'), body: request.postData() ? request.postDataJSON() : null };
      this.calls.push(call);
      if (call.method === 'POST' && call.path === '/api/auth/web/refresh') {
        return route.fulfill({ status: 401, json: { success: false, data: null, message: null } });
      }
      const handler = this.handlers.get(`${call.method} ${call.path}`);
      if (handler) return handler(route, call);
      this.unexpected.push(`${call.method} ${call.path}`);
      return route.abort('blockedbyclient');
    });
  }
}

export function translated(language: string, group: string, key: string): string {
  return JSON.parse(readFileSync(resolve(__dirname, `../../public/assets/i18n/${language}.json`), 'utf8'))[group][key];
}

export async function fillReset(page: Page, password = PASSWORD, confirmation = password) {
  await page.getByLabel('Új jelszó', { exact: false }).first().fill(password);
  await page.locator('#reset-password-confirmPassword').fill(confirmation);
}

// A gate lets a test observe the actual pending UI without relying on sleeps.
export function gate() {
  let release!: () => void;
  const pending = new Promise<void>(resolve => { release = resolve; });
  return { pending, release };
}

export const test = base.extend<{ api: AuthApi }>({
  api: async ({ page }, use) => {
    const api = new AuthApi(); await api.install(page);
    await use(api);
    expect(api.unexpected, 'Nem engedélyezett vagy nem mockolt API-hívások').toEqual([]);
  },
});
export { expect };
