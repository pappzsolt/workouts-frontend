import { expect, test, type Page, type Response } from '@playwright/test';
import { authenticateAndOpen } from '../../helpers/auth-session';
import { assertNoDataMutation, installReadOnlyGuard, setTestLanguage } from '../../helpers/read-only';

const auditPath = '/api/admin/login-audit-logs';

async function expectAuditPage(response: Response, page: Page) {
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(Array.isArray(body.data.content)).toBe(true);
  await expect(page.locator('app-login-audit-logs tbody tr')).toHaveCount(body.data.content.length);
  return body.data;
}

for (const operation of ['new', 'edit'] as const) {
  test(`ADMIN GUI: shared ${operation} dashboard actions open the exact coach and user forms`, async ({ page }) => {
    await setTestLanguage(page);
    await authenticateAndOpen(page, 'admin');
    const mutations = installReadOnlyGuard(page);
    const choices = operation === 'new'
      ? [
          { name: /^(új coach|new coach|neuer coach)$/i, path: '/admin/coach/new' },
          { name: /^(új felhasználó|new user|neuer benutzer)$/i, path: '/admin/users/new' },
        ]
      : [
          { name: /^(coach módosítása|edit coach|coach bearbeiten)$/i, path: '/admin/coach/edit' },
          { name: /^(felhasználó módosítása|edit user|benutzer bearbeiten)$/i, path: '/admin/users/edit' },
        ];
    for (const choice of choices) {
      await page.goto(`/admin/choice-users/${operation}`);
      const actions = page.locator(operation === 'new' ? 'app-chioice-user-new app-dashboard-action' : 'app-choice-edit app-dashboard-action');
      await expect(actions).toHaveCount(2);
      await actions.getByRole('button', { name: choice.name }).click();
      await expect(page).toHaveURL(new RegExp(`${choice.path}$`));
      await expect(page.locator('form')).toBeVisible();
    }
    await assertNoDataMutation(mutations);
  });
}

test('ADMIN GUI: member cards, shared pagination and search preserve the API list', async ({ page }) => {
  await setTestLanguage(page);
  await authenticateAndOpen(page, 'admin');
  const mutations = installReadOnlyGuard(page);
  const membersPromise = page.waitForResponse(response =>
    response.request().method() === 'GET' && new URL(response.url()).pathname === '/api/members',
  );
  await page.goto('/admin/users');
  const response = await membersPromise;
  expect(response.ok()).toBeTruthy();
  const body = await response.json();
  expect(body.success).toBe(true);
  expect(Array.isArray(body.data)).toBe(true);
  const members = body.data.filter((member: any) => member.id != null && member.usernameOrName != null && member.email != null);
  expect(members.length).toBeGreaterThan(0);
  const surface = page.locator('app-admin-list-users');
  const cards = surface.locator('app-card');
  const pager = surface.locator('app-pagination');
  const previous = pager.getByRole('button', { name: /^(◀\s*)?(előző|previous|zurück)$/i });
  const next = pager.getByRole('button', { name: /^(következő|next|weiter)(\s*▶)?$/i });
  const assertCards = async (start: number) => {
    const expected = members.slice(start, start + 6);
    await expect(cards).toHaveCount(expected.length);
    for (let index = 0; index < expected.length; index++) {
      await expect(cards.nth(index)).toContainText(expected[index].usernameOrName);
      await expect(cards.nth(index)).toContainText(expected[index].email);
    }
  };
  await assertCards(0);
  await expect(previous).toBeDisabled();
  await expect(pager.getByRole('combobox')).toHaveCount(0);
  if (members.length > 6) {
    await next.click();
    await assertCards(6);
  } else {
    await expect(next).toBeDisabled();
  }
  const search = surface.locator('app-search').getByRole('textbox');
  await search.fill(`no-match-${Date.now()}`);
  await expect(cards).toHaveCount(0);
  await surface.locator('app-search').getByRole('button', { name: /^(keresés törlése|clear search|suche löschen)$/i }).click();
  await assertCards(0);
  await expect(previous).toBeDisabled();
  await assertNoDataMutation(mutations);
});

test('ADMIN GUI: shared audit selects send their string and numeric values and clear filters', async ({ page }) => {
  await setTestLanguage(page);
  await authenticateAndOpen(page, 'admin');
  const mutations = installReadOnlyGuard(page);
  const initial = page.waitForResponse(response => response.request().method() === 'GET' && new URL(response.url()).pathname === auditPath);
  await page.goto('/admin/login-audit-logs');
  await expectAuditPage(await initial, page);
  const surface = page.locator('app-login-audit-logs');
  const accountType = surface.getByRole('combobox', { name: /^(fióktípus|account type|kontotyp)$/i });
  const username = surface.getByRole('textbox', { name: /^(felhasználónév|username|benutzername)$/i });
  await accountType.selectOption('USER');
  await expect(accountType).toHaveValue('USER');
  await username.fill(process.env.E2E_ADMIN_USERNAME!);
  const filtered = page.waitForResponse(response => {
    const url = new URL(response.url());
    return response.request().method() === 'GET' && url.pathname === auditPath &&
      url.searchParams.get('accountType') === 'USER' && url.searchParams.get('username') === process.env.E2E_ADMIN_USERNAME &&
      url.searchParams.get('page') === '0';
  });
  await surface.getByRole('button', { name: /^(szűrés|filter|filtern)$/i }).click();
  const filteredPage = await expectAuditPage(await filtered, page);
  expect(filteredPage.content.length, 'The actual admin login must appear in the login audit.').toBeGreaterThan(0);
  expect(filteredPage.content.every((log: any) => log.accountType === 'USER')).toBe(true);
  const size = surface.getByRole('combobox', { name: /^(sorok oldalanként|rows per page|zeilen pro seite)$/i });
  const resized = page.waitForResponse(response => {
    const url = new URL(response.url());
    return response.request().method() === 'GET' && url.pathname === auditPath &&
      url.searchParams.get('size') === '25' && url.searchParams.get('page') === '0' && url.searchParams.get('accountType') === 'USER';
  });
  await size.selectOption({ label: '25' });
  const resizedPage = await expectAuditPage(await resized, page);
  expect(resizedPage.size).toBe(25);
  await expect(size.locator('option:checked')).toHaveText('25');
  await expect(surface.locator('app-pagination').getByRole('combobox')).toHaveCount(0);
  const cleared = page.waitForResponse(response => {
    const url = new URL(response.url());
    return response.request().method() === 'GET' && url.pathname === auditPath &&
      !url.searchParams.has('accountType') && !url.searchParams.has('username') && url.searchParams.get('size') === '25';
  });
  await surface.getByRole('button', { name: /^(szűrők törlése|clear filters|filter zurücksetzen)$/i }).click();
  await expectAuditPage(await cleared, page);
  await expect(accountType).toHaveValue('');
  await expect(username).toHaveValue('');
  await assertNoDataMutation(mutations);
});
