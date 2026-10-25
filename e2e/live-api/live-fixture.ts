import { test as base, expect, request, type APIRequestContext, type Page } from '@playwright/test';
import { readFileSync, existsSync } from 'node:fs';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, join } from 'node:path';

export const API = 'http://127.0.0.1:8099';
export const BACKEND = resolve(process.env.E2E_BACKEND_DIR ?? join(__dirname, '../../../workouts-project'));
type Account = { id?: number; username: string; password: string };
type Environment = { apiURL: string; accounts: Record<string, Account> };
export async function environment(): Promise<Environment> {
  const path = join(BACKEND, 'target/live-api-environment.json');
  await expect.poll(() => existsSync(path), { timeout: 30000 }).toBe(true);
  const env = JSON.parse(readFileSync(path, 'utf8'));
  expect(env.apiURL).toBe(API);
  return env;
}
export async function login(page: Page, role: string) {
  const account = (await environment()).accounts[role]; expect(account).toBeTruthy();
  await page.goto('/login');
  await page.locator('#login-username').fill(account.username); await page.locator('#login-password').fill(account.password);
  const response = page.waitForResponse(r => new URL(r.url()).pathname === '/api/auth/web/login' && r.request().method() === 'POST');
  await page.locator('app-login button[type=submit]').click();
  const result = await response; expect(result.status()).toBe(200);
  const body = await result.json(); expect(body.success).toBe(true); expect(body.data.refreshToken).toBeUndefined();
  await expect(page).toHaveURL(new RegExp(`/${role === 'otherCoach' ? 'coach' : role}/dashboard$`));
  expect((await page.context().cookies()).find(cookie => cookie.name === 'workouts_refresh')?.httpOnly).toBe(true);
  expect(await page.evaluate(() => [localStorage.getItem('accessToken'), localStorage.getItem('refreshToken')])).toEqual([null, null]);
  return body.data.accessToken as string;
}
export async function apiFor(role: string) {
  const account = (await environment()).accounts[role];
  const anonymous = await request.newContext({ baseURL: API });
  try {
    const response = await anonymous.post('/api/auth/login', { data: { username: account.username, password: account.password } });
    expect(response.status()).toBe(200); const body = await response.json(); expect(body.success).toBe(true);
    return request.newContext({ baseURL: API, extraHTTPHeaders: { Authorization: `Bearer ${body.data.accessToken}` } });
  } finally { await anonymous.dispose(); }
}
export async function ok(response: Awaited<ReturnType<APIRequestContext['get']>>) {
  expect(response.ok(), `${response.status()}: ${await response.text()}`).toBe(true);
  const body = await response.json() as { success?: boolean; data: any; [key: string]: any }; if ('success' in body) expect(body.success).toBe(true); return body;
}
export const workoutBody = (name: string) => ({ name, description: 'Valódi API-teszt', workoutDate: '2026-10-25', durationMinutes: 45, intensityLevel: 'MEDIUM' });

export const test = base.extend<{ coach: APIRequestContext; collectCoverage: void }>({
  coach: async ({}, use) => { const api = await apiFor('coach'); try { await use(api); } finally { await api.dispose(); } },
  collectCoverage: [async ({ page }, use, info) => {
    await page.addInitScript(() => { localStorage.setItem('language', 'hu'); });
    await page.coverage.startJSCoverage({ resetOnNavigation: false });
    try { await use(); } finally {
      const entries = await page.coverage.stopJSCoverage();
      const output = [];
      for (const entry of entries) {
        if (!entry.url.startsWith('http://127.0.0.1:4323/') || !entry.source) continue;
        const match = [...entry.source.matchAll(/\/\/[#@] sourceMappingURL=(.+)/g)].at(-1);
        let sourceMap: unknown;
        if (match) {
          const location = match[1].trim();
          if (location.startsWith('data:')) sourceMap = JSON.parse(Buffer.from(location.split(',')[1], 'base64').toString());
          else {
            const response = await page.request.get(new URL(location, entry.url).href);
            if (!response.ok()) throw new Error(`Source map unavailable: ${response.status()} ${location}`);
            sourceMap = await response.json();
          }
        }
        // Third-party bundles do not belong to application coverage. Keep every application source map.
        if (sourceMap && !(sourceMap as { sources: string[] }).sources.some(source => source.startsWith('src/') || source.includes('/src/') && !source.includes('/node_modules/'))) continue;
        output.push({ ...entry, sourceMap });
      }
      await mkdir(info.outputDir, { recursive: true });
      await writeFile(join(info.outputDir, 'coverage.json'), JSON.stringify(output));
    }
  }, { auto: true }],
});
export { expect };
