import { test, expect, login } from './live-fixture';
import type { Page } from '@playwright/test';

// Real frontend + isolated Live API backend. No API stubbing, no production data.
// Every test starts with the real login form, then clicks the actual menu/card.
// Business-data writes during read-only navigation would be a regression.
type Destination = { name: string; path: string; component: string };

const adminMenu: Destination[] = [
  { name: 'Dashboard', path: '/admin/dashboard', component: 'app-admin-dashboard' },
  { name: 'Felhasználók listája', path: '/admin/users', component: 'app-admin-list-users' },
  { name: 'Fióktörlési kérelmek', path: '/admin/account-deletion-requests', component: 'app-account-deletion-requests' },
  { name: 'Regisztrációs kérelmek', path: '/admin/registrations', component: 'app-registration-requests' },
  { name: 'Bejelentkezési napló', path: '/admin/login-audit-logs', component: 'app-login-audit-logs' },
  { name: 'Hibabejelentések', path: '/admin/bug-reports', component: 'app-bug-reports' },
];

const coachMenu: Destination[] = [
  { name: 'Áttekintés', path: '/coach/dashboard', component: 'app-coach-home' },
  { name: 'Edzői naptár', path: '/coach/calendar', component: 'app-coach-calendar' },
  { name: 'Ügyfelek', path: '/coach/clients', component: 'app-coach-clients' },
  { name: 'Programok', path: '/coach/programs', component: 'app-coach-programs' },
  { name: 'Edzéstár', path: '/coach/workouts', component: 'app-coach-workouts' },
  { name: 'Gyakorlattár', path: '/coach/exercises', component: 'app-exercise-controller' },
  { name: 'Profil', path: '/coach/profile', component: 'app-coach-profile' },
  { name: 'Hibabejelentés', path: '/coach/bug-report', component: 'app-bug-report' },
  { name: 'Fiók törlése', path: '/delete-account', component: 'app-delete-account' },
];

const userMenu: Destination[] = [
  { name: 'Dashboard', path: '/user/dashboard', component: 'app-user-dashboard' },
  { name: 'Profil', path: '/user/profile', component: 'app-user-profile' },
  { name: 'Hibabejelentés', path: '/user/bug-report', component: 'app-bug-report' },
  { name: 'Fiók törlése', path: '/delete-account', component: 'app-delete-account' },
];

const userDashboard: Destination[] = [
  { name: 'Edzéseim', path: '/user/workouts', component: 'app-user-workouts-calendar' },
  { name: 'Programjaim', path: '/user/my-programs', component: 'app-user-my-programs' },
  { name: 'Önálló edzéseim', path: '/user/personal-workouts', component: 'app-personal-programs' },
  { name: 'Gyakorlattár', path: '/user/exercise-library', component: 'app-user-exercise-library' },
  { name: 'Saját készítésű programok', path: '/user/personal-programs', component: 'app-personal-programs' },
  { name: 'Elvégzett programok', path: '/user/completed-programs', component: 'app-completed-program-history' },
  { name: 'Program statisztika', path: '/user/program-statistics', component: 'app-user-program-statistics' },
  { name: 'Edzéssablonjaim', path: '/user/workout-templates', component: 'app-workout-templates' },
];

const adminDashboard: Array<Destination & { button: RegExp }> = [
  { name: 'Felhasználók listája', button: /^Felhasználók listája$/, path: '/admin/users', component: 'app-admin-list-users' },
  { name: 'Felhasználó keresés', button: /^Felhasználó keresés$/, path: '/admin/users/search', component: 'app-member-search' },
  { name: 'Új felhasználó', button: /^Új felhasználó$/, path: '/admin/choice-users/new', component: 'app-chioice-user-new' },
  { name: 'Felhasználó módosítás', button: /^Felhasználó módosítás$/, path: '/admin/choice-users/edit', component: 'app-choice-edit' },
  { name: 'Regisztrációs kérelmek', button: /^Regisztrációs kérelmek/, path: '/admin/registrations', component: 'app-registration-requests' },
  { name: 'Bejelentkezési napló', button: /^Bejelentkezési napló$/, path: '/admin/login-audit-logs', component: 'app-login-audit-logs' },
];

function observeBusinessWrites(page: Page): string[] {
  const writes: string[] = [];
  page.on('request', request => {
    const path = new URL(request.url()).pathname;
    if (path.startsWith('/api/') && !path.startsWith('/api/auth/')
        && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(request.method())) {
      writes.push(`${request.method()} ${path}`);
    }
  });
  return writes;
}

async function assertDestination(page: Page, destination: Destination) {
  await expect(page).toHaveURL(url => url.pathname === destination.path);
  const content = page.locator(destination.component);
  await expect(content).toBeVisible();
  await expect(content.getByRole('heading').first()).toBeVisible();
  await expect(content.locator('app-loading')).toHaveCount(0, { timeout: 15000 });
}

async function clickSidebarLink(page: Page, destination: Destination) {
  const drawer = page.locator('#application-menu');
  const mobile = await page.evaluate(() => matchMedia('(max-width: 639.98px)').matches);
  if (mobile) {
    await page.locator('header app-button').first().getByRole('button').click();
    await expect(drawer).toBeVisible();
  }
  const link = drawer.locator(`a[href="${destination.path}"]`);
  await expect(link).toContainText(destination.name);
  await link.click();
  await assertDestination(page, destination);
  if (mobile && destination.path !== '/delete-account') {
    await expect(drawer).toBeHidden();
  }
}

for (const item of adminMenu) {
  test(`Admin menü / ${item.name} @menu-admin`, async ({ page }) => {
    await login(page, 'admin');
    const writes = observeBusinessWrites(page);
    await clickSidebarLink(page, item);
    expect(writes).toEqual([]);
  });
}

for (const item of coachMenu) {
  test(`Edző menü / ${item.name} @menu-coach`, async ({ page }) => {
    await login(page, 'coach');
    const writes = observeBusinessWrites(page);
    await clickSidebarLink(page, item);
    expect(writes).toEqual([]);
  });
}

for (const item of userMenu) {
  test(`Sportoló menü / ${item.name} @menu-user`, async ({ page }) => {
    await login(page, 'user');
    const writes = observeBusinessWrites(page);
    await clickSidebarLink(page, item);
    expect(writes).toEqual([]);
  });
}

for (const item of userDashboard) {
  test(`Sportoló kezdőlap / ${item.name} @menu-user`, async ({ page }) => {
    await login(page, 'user');
    const writes = observeBusinessWrites(page);
    await page.locator('app-user-dashboard').getByRole('button', { name: item.name, exact: true }).click();
    await assertDestination(page, item);
    expect(writes).toEqual([]);
  });
}

for (const item of adminDashboard) {
  test(`Admin kezdőlap / ${item.name} @menu-admin`, async ({ page }) => {
    await login(page, 'admin');
    const writes = observeBusinessWrites(page);
    await page.locator('app-admin-dashboard').getByRole('button', { name: item.button }).click();
    await assertDestination(page, item);
    expect(writes).toEqual([]);
  });
}

for (const role of ['admin', 'coach', 'user'] as const) {
  test(`${role} / Kijelentkezés az oldalsó menüből @menu-auth`, async ({ page }) => {
    await login(page, role);
    const drawer = page.locator('#application-menu');
    if (await page.evaluate(() => matchMedia('(max-width: 639.98px)').matches)) {
      await page.locator('header app-button').first().getByRole('button').click();
      await expect(drawer).toBeVisible();
    }
    await drawer.getByRole('button', { name: 'Kijelentkezés', exact: true }).click();
    await expect(page).toHaveURL(url => url.pathname === '/login');
    await expect(page.locator('app-login')).toBeVisible();
  });
}
