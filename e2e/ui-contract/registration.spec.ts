import { test, expect, Page } from '@playwright/test';

// Önregisztráció és admin jóváhagyás – mockolt API-val, valódi backend nélkül.
type Call = { method: string; path: string; body: any };

async function mockApi(page: Page, role: 'ROLE_ADMIN' | null, handler: (c: Call) => { status?: number; json: any } | null) {
  const calls: Call[] = [];
  await page.addInitScript(() => { localStorage.setItem('language', 'hu'); localStorage.setItem('lang', 'hu'); });
  await page.route('**/api/**', async route => {
    const request = route.request(); const url = new URL(request.url());
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: { 'access-control-allow-origin': url.origin, 'access-control-allow-credentials': 'true' } });
    const c: Call = { method: request.method(), path: url.pathname, body: request.postData() ? request.postDataJSON() : null };
    calls.push(c);
    if (c.path === '/api/auth/web/refresh') {
      if (!role) return route.fulfill({ status: 401, json: { success: false, data: null, message: 'Nincs jogosultság' } });
      const payload = Buffer.from(JSON.stringify({ sub: 'contract-admin', roles: role, exp: 4102444800 })).toString('base64url');
      return route.fulfill({ json: { success: true, data: { accessToken: `eyJhbGciOiJIUzI1NiJ9.${payload}.contract` }, message: null } });
    }
    const result = handler(c) ?? { json: { success: true, data: [], message: null } };
    return route.fulfill({ status: result.status ?? 200, json: result.json });
  });
  return calls;
}

const writes = (calls: Call[], path: string) => calls.filter(c => c.method === 'POST' && c.path === path);

test('register: login links to registration and client-side validation blocks invalid input', async ({ page }) => {
  const calls = await mockApi(page, null, () => null);
  await page.goto('/login');
  await page.getByRole('link', { name: 'Regisztráció', exact: true }).click();
  await expect(page).toHaveURL(/\/register$/);
  await page.getByRole('button', { name: 'Regisztráció elküldése' }).click();
  await expect(page.getByText('Ezt a mezőt kötelező kitölteni.')).toHaveCount(4);
  await page.locator('#register-username').fill('a@');
  await page.locator('#register-email').fill('valaki@localhost');
  await page.locator('#register-password').fill('rovid');
  await page.locator('#register-password-confirmation').fill('masik');
  await page.getByRole('button', { name: 'Regisztráció elküldése' }).click();
  await expect(page.getByText('Legalább 8 karaktert adj meg.')).toBeVisible();
  await expect(page.getByText('Legalább 3 karaktert adj meg.')).toBeVisible();
  await page.locator('#register-username').fill('a@b');
  await page.locator('#register-password').fill('Jelszo123!');
  await page.getByRole('button', { name: 'Regisztráció elküldése' }).click();
  await expect(page.getByText('Érvénytelen email cím.')).toBeVisible();
  await expect(page.getByText('Betűvel vagy számmal kezdődjön', { exact: false })).toBeVisible();
  await page.locator('#register-password').fill('Jelszo123!');
  await page.locator('#register-password-confirmation').fill('Jelszo124!');
  await expect(page.getByText('A két jelszó nem egyezik.')).toBeVisible();
  expect(writes(calls, '/api/auth/register')).toEqual([]);
});

test('register: client sends only client fields, trimmed, and shows the pending state', async ({ page }) => {
  const calls = await mockApi(page, null, c => c.path === '/api/auth/register'
    ? { status: 202, json: { success: true, data: { status: 'PENDING' }, message: 'A regisztrációt rögzítettük. A fiók az adminisztrátor jóváhagyása után használható.' } }
    : null);
  await page.goto('/register');
  await page.locator('#register-username').fill('  kiss.anna ');
  await page.locator('#register-email').fill('anna@example.com');
  await page.locator('#register-password').fill('Jelszo123!');
  await page.locator('#register-password-confirmation').fill('Jelszo123!');
  await page.getByText('További adatok (nem kötelező)').click();
  await page.locator('#register-age').fill('31');
  await page.locator('#register-weight').fill('70.5');
  await page.locator('#register-goals').fill(' Erő ');
  await page.getByRole('button', { name: 'Regisztráció elküldése' }).click();
  await expect(page.getByRole('heading', { name: 'Regisztráció elküldve' })).toBeVisible();
  await expect(page.getByText('A regisztrációt rögzítettük.', { exact: false })).toBeVisible();
  expect(writes(calls, '/api/auth/register').map(c => c.body)).toEqual([{
    accountType: 'USER', username: 'kiss.anna', email: 'anna@example.com', password: 'Jelszo123!',
    passwordConfirmation: 'Jelszo123!', age: 31, weight: 70.5, height: null, gender: null, goals: 'Erő',
  }]);
});

test('register: coach sends coach fields only and a backend conflict is shown', async ({ page }) => {
  const calls = await mockApi(page, null, c => c.path === '/api/auth/register'
    ? { status: 409, json: { success: false, data: null, message: 'A felhasználónév már foglalt.' } }
    : null);
  await page.goto('/register');
  await page.getByText('Programokat készítek').click();
  await expect(page.getByText('Név (bejelentkezési név)')).toBeVisible();
  await page.locator('#register-username').fill('Kiss Anna');
  await page.locator('#register-email').fill('anna@example.com');
  await page.locator('#register-password').fill('Jelszo123!');
  await page.locator('#register-password-confirmation').fill('Jelszo123!');
  await page.getByText('További adatok (nem kötelező)').click();
  await page.locator('#register-phone').fill('12');
  await page.getByRole('button', { name: 'Regisztráció elküldése' }).click();
  await expect(page.getByText('A telefonszám +36 előtagból és 9 számjegyből álljon.')).toBeVisible();
  await page.locator('#register-phone').fill('+36301234567');
  await page.getByRole('button', { name: 'Regisztráció elküldése' }).click();
  await expect(page.getByText('A felhasználónév már foglalt.')).toBeVisible();
  expect(writes(calls, '/api/auth/register').map(c => c.body)).toEqual([{
    accountType: 'COACH', username: 'Kiss Anna', email: 'anna@example.com', password: 'Jelszo123!',
    passwordConfirmation: 'Jelszo123!', phone: '+36301234567', specialization: null,
  }]);
});

test('admin: approves a client with a coach and rejects a coach with a reason', async ({ page }) => {
  const pending = [
    { id: 1, accountType: 'USER', username: 'kiss.anna', email: 'anna@example.com', age: 31, weight: 70.5, height: null, gender: 'FEMALE', goals: 'Erő', phone: null, specialization: null, status: 'PENDING', rejectionReason: null, createdAt: '2026-10-23T10:00:00', decidedAt: null, decidedBy: null, createdUserId: null, createdCoachId: null, assignedCoachId: null, assignedCoachName: null },
    { id: 2, accountType: 'COACH', username: 'Nagy Béla', email: 'bela@example.com', age: null, weight: null, height: null, gender: null, goals: null, phone: '+36 30 1', specialization: 'Erő', status: 'PENDING', rejectionReason: null, createdAt: '2026-10-23T11:00:00', decidedAt: null, decidedBy: null, createdUserId: null, createdCoachId: null, assignedCoachId: null, assignedCoachName: null },
  ];
  const calls = await mockApi(page, 'ROLE_ADMIN', c => {
    if (c.path === '/api/members/coaches') return { json: { success: true, data: [{ id: 205, usernameOrName: 'Coach Carl' }], message: null } };
    if (c.path === '/api/admin/registrations/pending-count') return { json: { success: true, data: { count: pending.length }, message: null } };
    if (c.method === 'GET' && c.path === '/api/admin/registrations') return { json: { success: true, data: { content: pending, page: 0, size: 10, totalElements: pending.length, totalPages: 1 }, message: null } };
    const decision = c.path.match(/^\/api\/admin\/registrations\/(\d+)\/(approve|reject)$/);
    if (decision) {
      pending.splice(pending.findIndex(p => p.id === Number(decision[1])), 1);
      return { json: { success: true, data: null, message: decision[2] === 'approve' ? 'A regisztrációt jóváhagytad, a fiók létrejött.' : 'A regisztrációt elutasítottad.' } };
    }
    return null;
  });
  await page.goto('/admin/dashboard');
  await page.getByText('Regisztrációs kérelmek (2 függőben)').click();
  await expect(page).toHaveURL(/\/admin\/registrations$/);
  const anna = page.getByRole('listitem', { name: 'kiss.anna' });
  await anna.locator('select').selectOption({ label: 'Coach Carl' });
  await anna.getByRole('button', { name: 'Jóváhagyás' }).click();
  await expect(page.getByText('A regisztrációt jóváhagytad, a fiók létrejött.')).toBeVisible();
  await expect(anna).toHaveCount(0);

  const bela = page.getByRole('listitem', { name: 'Nagy Béla' });
  await expect(bela.locator('select')).toHaveCount(0);
  await bela.getByRole('button', { name: 'Elutasítás' }).click();
  await bela.locator('textarea').fill('  Ismeretlen jelentkező ');
  await bela.getByRole('button', { name: 'Elutasítás megerősítése' }).click();
  await expect(page.getByText('Nincs jóváhagyásra váró regisztráció.')).toBeVisible();

  expect(writes(calls, '/api/admin/registrations/1/approve').map(c => c.body)).toEqual([{ coachId: 205 }]);
  expect(writes(calls, '/api/admin/registrations/2/reject').map(c => c.body)).toEqual([{ reason: 'Ismeretlen jelentkező' }]);
});
