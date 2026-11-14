import { test, expect, type Page } from '@playwright/test';
import { WorkspaceApi } from './workspace-fixture';
import { returningAccount } from './onboarding-fixture';

const destinations = {
  user: [
    ['/user/dashboard', '[data-guide="user-dashboard"]'],
    ['/user/my-programs', '[data-guide="user-programs"]'],
    ['/user/personal-programs', 'app-personal-programs h1'],
    ['/user/personal-workouts/new', 'app-personal-program-editor form'],
    ['/user/workout-templates', 'app-workout-templates h1'],
    ['/user/personal-programs/import', 'app-program-import h1'],
    ['/user/workouts', '[data-guide="user-calendar"]'],
    ['/user/workouts', '[data-guide="user-calendar"]'],
    ['/user/program-statistics', '[data-guide="user-statistics"]'],
    ['/user/profile', '[data-guide="user-profile"]'],
    ['/user/bug-report', 'app-bug-report h2'],
    ['/user/profile', '[data-guide="user-profile"]'],
    ['/user/dashboard', 'app-layout header'],
  ],
  coach: [
    ['/coach/dashboard', '[data-guide="coach-dashboard"]'],
    ['/coach/calendar', 'app-coach-calendar h1'],
    ['/coach/clients', '[data-guide="coach-clients"]'],
    ['/coach/programs', '[data-guide="coach-programs"]'],
    ['/coach/programs/new', 'app-program-details-form section'],
    ['/coach/programs/import', 'app-program-import h1'],
    ['/coach/workouts', '[data-guide="coach-workouts"]'],
    ['/coach/exercises', '[data-guide="coach-exercises"]'],
    ['/coach/profile', 'app-coach-profile h2'],
    ['/coach/bug-report', 'app-bug-report h2'],
    ['/coach/profile', 'app-coach-profile h2'],
    ['/coach/dashboard', 'app-layout header'],
  ],
};
const labels = {
  hu: { next: 'Következő', previous: 'Vissza', finish: 'Befejezés' },
  en: { next: 'Next', previous: 'Back', finish: 'Finish' },
  de: { next: 'Weiter', previous: 'Zurück', finish: 'Fertig' },
};

async function install(page: Page, role: 'user' | 'coach') {
  const workspace = new WorkspaceApi();
  if (role === 'coach') await workspace.install(page);
  const unexpected: string[] = [];
  const writes: string[] = [];
  const errors: Error[] = [];
  page.on('pageerror', (error) => errors.push(error));
  const id = role === 'coach' ? 6 : 42;
  const profile = {
    id,
    type: role,
    usernameOrName: 'Guide account',
    email: 'guide@example.test',
    roles: [],
    extraFields: {},
  };
  const reads = new Map<string, unknown>([
    [`/api/members/${role === 'coach' ? 'coaches' : 'users'}/${id}`, profile],
    ['/api/members/coaches', []],
    ['/api/programs/my/assigned', []],
    [
      '/api/me/personal-programs/page',
      { content: [], page: 0, size: 12, totalElements: 0, totalPages: 0 },
    ],
    ['/api/me/workout-templates', []],
    ['/api/exercises', []],
    ['/api/user-workout-exercises/scheduled', []],
    ['/api/user/program-statistics', { totalPrograms: 0, completedPrograms: 0, programs: [] }],
  ]);
  await returningAccount(page, role, id);
  if (role === 'user') await page.addInitScript(() => localStorage.setItem('language', 'hu'));
  await page.route('**/api/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname;
    if (path === '/api/auth/web/refresh') {
      const payload = Buffer.from(
        JSON.stringify({
          id,
          sub: 'guide-account',
          roles: `ROLE_${role.toUpperCase()}`,
          exp: 4102444800,
        }),
      ).toString('base64url');
      return route.fulfill({
        json: { success: true, data: { accessToken: `eyJhbGciOiJIUzI1NiJ9.${payload}.guide` } },
      });
    }
    if (request.method() !== 'GET') {
      writes.push(`${request.method()} ${path}`);
      return route.abort('blockedbyclient');
    }
    if (reads.has(path)) return route.fulfill({ json: { success: true, data: reads.get(path) } });
    if (role === 'coach') return route.fallback();
    unexpected.push(`${request.method()} ${path}`);
    return route.abort('blockedbyclient');
  });
  return { workspace, unexpected, writes, errors };
}

for (const role of ['user', 'coach'] as const) {
  for (const language of ['hu', 'en', 'de'] as const) {
    test(`guide: ${role} ${language} covers every area without changing data`, async ({ page }) => {
      const api = await install(page, role);
      await page.goto(`/${role}/dashboard`);
      await page.locator('app-language-selector select').selectOption(language);
      if ((page.viewportSize()?.width ?? 1280) < 640) {
        await page
          .getByRole('button', { name: /^(Menü megnyitása|Open menu|Menü öffnen)$/ })
          .click();
      }
      await page.locator('[data-tour-reopen]').click();
      const dialog = page.locator('app-guided-tour').getByRole('dialog');
      const steps = destinations[role];
      for (let i = 0; i < steps.length; i++) {
        await expect(dialog).toBeVisible();
        await expect(page).toHaveURL(new RegExp(`${steps[i][0]}$`));
        await expect(page.locator(steps[i][1])).toBeVisible();
        await expect(page.locator('app-guided-tour .pointer-events-none')).toBeVisible();
        await expect(dialog.locator('#guided-tour-description')).not.toBeEmpty();
        await expect(
          dialog.getByText(`${i + 1} / ${steps.length}.`, { exact: false }),
        ).toBeVisible();
        await expect(dialog.locator('span.h-1\\.5')).toHaveCount(steps.length);
        await expect(dialog.locator('span.h-1\\.5.bg-primary-600')).toHaveCount(i + 1);
        const box = await dialog.boundingBox();
        expect(box).not.toBeNull();
        expect(box!.x).toBeGreaterThanOrEqual(0);
        expect(box!.x + box!.width).toBeLessThanOrEqual(page.viewportSize()!.width);
        if (i === 1) {
          await dialog
            .getByRole('button', { name: labels[language].previous, exact: true })
            .click();
          await expect(page).toHaveURL(new RegExp(`${steps[0][0]}$`));
          await dialog.getByRole('button', { name: labels[language].next, exact: true }).click();
          await expect(page).toHaveURL(new RegExp(`${steps[1][0]}$`));
        }
        await dialog
          .getByRole('button', {
            name: i === steps.length - 1 ? labels[language].finish : labels[language].next,
            exact: true,
          })
          .click();
      }
      await expect(dialog).toHaveCount(0);
      await page.reload();
      await expect(page.locator('app-language-selector select')).toBeVisible();
      await expect(dialog).toHaveCount(0);
      expect(api.writes).toEqual([]);
      expect(api.unexpected).toEqual([]);
      expect(api.workspace.unknown).toEqual([]);
      expect(api.workspace.writes()).toEqual([]);
      expect(api.errors).toEqual([]);
    });
  }
}
