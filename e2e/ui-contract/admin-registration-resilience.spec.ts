import { test, expect, REGISTRATIONS, application, gate } from './admin-registration-fixture';
import type { Page } from '@playwright/test';
const card = (page: Page, id = 1) => page.getByRole('listitem', { name: `Applicant ${String(id).padStart(3, '0')}`, exact: true });
const tab = (page: Page, name: string) => page.getByRole('group', { name: 'Kérelmek állapot szerint' }).getByRole('button', { name: new RegExp(`^${name}`) });
async function open(page: Page) { await page.goto('/admin/registrations'); await expect(card(page)).toBeVisible(); }

test('Admin kérelmek: a kezdőlap megfelelő státusszal és nulla alapú lapozással kérdez', async ({ page, api }) => {
  await open(page);
  expect(api.reads().map(c => Object.fromEntries(c.query))).toEqual([{ status: 'PENDING', page: '0', size: '10', language: 'hu' }]);
  await expect(page.locator('app-registration-requests li')).toHaveCount(10);
  await expect(tab(page, 'Függőben')).toHaveAttribute('aria-pressed', 'true');
  await expect(page.locator('app-pagination').getByRole('button', { name: 'Előző', exact: true })).toBeDisabled();
});

test('Admin kérelmek: lapozás után státuszváltás az első oldalról indul és elrejti a döntési gombokat', async ({ page, api }) => {
  await open(page); await page.locator('app-pagination').getByRole('button', { name: 'Következő', exact: true }).click();
  await expect(card(page, 11)).toBeVisible();
  await tab(page, 'Jóváhagyva').click(); await expect(card(page, 101)).toBeVisible();
  expect(api.reads().at(-1)!.query.get('page')).toBe('0'); expect(api.reads().at(-1)!.query.get('status')).toBe('APPROVED');
  await expect(card(page, 101).getByRole('button', { name: 'Jóváhagyás', exact: true })).toHaveCount(0);
  await expect(card(page, 101)).toContainText('Admin Anna'); await expect(card(page, 101)).toContainText('Coach Carl');
});

test('Admin kérelmek: oldalméret-váltás visszaállítja az első oldalt és a kért darabszámot', async ({ page, api }) => {
  await open(page); await page.locator('app-pagination').getByRole('button', { name: 'Következő', exact: true }).click();
  await expect(card(page, 11)).toBeVisible();
  await page.locator('app-pagination select').selectOption({ label: '20' });
  await expect(card(page)).toBeVisible(); await expect(page.locator('app-registration-requests li')).toHaveCount(20);
  expect(api.reads().at(-1)!.query.get('page')).toBe('0'); expect(api.reads().at(-1)!.query.get('size')).toBe('20');
});

for (const [status, name, message] of [
  ['PENDING', 'Függőben', 'Nincs jóváhagyásra váró regisztráció.'],
  ['APPROVED', 'Jóváhagyva', 'Még nincs jóváhagyott regisztráció.'],
  ['REJECTED', 'Elutasítva', 'Még nincs elutasított regisztráció.'],
]) {
  test(`Admin kérelmek: üres ${status} lista a megfelelő üzenetet mutatja`, async ({ page, api }) => {
    api.rows = [];
    await page.goto('/admin/registrations');
    await expect(page.getByText('Nincs jóváhagyásra váró regisztráció.', { exact: true })).toBeVisible();
    if (status !== 'PENDING') await tab(page, name).click();
    await expect(page.getByText(message, { exact: true })).toBeVisible();
    await expect(page.locator('app-pagination')).toHaveCount(0); expect(api.writes()).toHaveLength(0);
  });
}

test('Admin kérelmek: ugyanarra a státuszfülre kattintás nem indít új listaolvasást', async ({ page, api }) => {
  await open(page); const before = api.reads().length;
  await tab(page, 'Függőben').click(); await expect(card(page)).toBeVisible();
  expect(api.reads()).toHaveLength(before);
});

test('Admin kérelmek: elutasítás megszakítása törli az indoklást, döntési kérés nélkül', async ({ page, api }) => {
  await open(page); const row = card(page);
  await row.getByRole('button', { name: 'Elutasítás', exact: true }).click(); await row.locator('textarea').fill('Ideiglenes indok');
  await row.getByRole('button', { name: 'Mégse', exact: true }).click(); await expect(row.locator('textarea')).toHaveCount(0);
  await row.getByRole('button', { name: 'Elutasítás', exact: true }).click(); await expect(row.locator('textarea')).toHaveValue('');
  expect(api.writes()).toHaveLength(0);
});

test('Admin kérelmek: státuszváltás törli a folyamatban lévő elutasítást', async ({ page, api }) => {
  await open(page); await card(page).getByRole('button', { name: 'Elutasítás', exact: true }).click();
  await card(page).locator('textarea').fill('Nem maradhat meg'); await tab(page, 'Elutasítva').click();
  await expect(card(page, 102)).toBeVisible(); await expect(card(page, 102)).toContainText('Nem ismert jelentkező.');
  await tab(page, 'Függőben').click(); await expect(card(page)).toBeVisible();
  await expect(card(page).locator('textarea')).toHaveCount(0); expect(api.writes()).toHaveLength(0);
});

for (const [reason, expected] of [['   ', null], ['  Ismeretlen jelentkező  ', 'Ismeretlen jelentkező']]) {
  test(`Admin kérelmek: elutasítás indoklása normalizált (${expected === null ? 'üres→null' : 'trim'})`, async ({ page, api }) => {
    await open(page); await card(page).getByRole('button', { name: 'Elutasítás', exact: true }).click();
    await card(page).locator('textarea').fill(reason); await card(page).getByRole('button', { name: 'Elutasítás megerősítése', exact: true }).click();
    await expect(page.locator('app-registration-requests app-message')).toHaveText('Elutasítás rögzítve.');
    await expect(card(page)).toHaveCount(0);
    expect(api.writes().map(c => ({ path: c.path, body: c.body }))).toEqual([{ path: `${REGISTRATIONS}/1/reject`, body: { reason: expected } }]);
  });
}

for (const assign of [false, true]) {
  test(`Admin kérelmek: ügyfél jóváhagyása ${assign ? 'kiválasztott coachcsal' : 'coach nélkül'}`, async ({ page, api }) => {
    await open(page);
    if (assign) await card(page).locator('select').selectOption({ label: 'Coach Carl' });
    await card(page).getByRole('button', { name: 'Jóváhagyás', exact: true }).click();
    await expect(page.locator('app-registration-requests app-message')).toHaveText('Jóváhagyás rögzítve.');
    await expect(card(page)).toHaveCount(0);
    expect(api.writes().map(c => c.body)).toEqual([{ coachId: assign ? 205 : null }]);
  });
}

test('Admin kérelmek: coach jóváhagyásánál nincs coachválasztó és null coachId kerül elküldésre', async ({ page, api }) => {
  await open(page); await expect(card(page, 2).locator('select')).toHaveCount(0);
  await card(page, 2).getByRole('button', { name: 'Jóváhagyás', exact: true }).click();
  await expect(card(page, 2)).toHaveCount(0);
  expect(api.writes().map(c => ({ path: c.path, body: c.body }))).toEqual([{ path: `${REGISTRATIONS}/2/approve`, body: { coachId: null } }]);
});

for (const decision of ['approve', 'reject']) {
  test(`Admin kérelmek: sikertelen ${decision} után a hiba látszik és a döntés újrapróbálható`, async ({ page, api }) => {
    const path = `${REGISTRATIONS}/1/${decision}`;
    api.on('POST', path, route => route.fulfill({ status: 409, json: { success: false, data: null, message: 'A döntés nem sikerült.' } }));
    await open(page);
    const click = async () => {
      if (decision === 'approve') await card(page).getByRole('button', { name: 'Jóváhagyás', exact: true }).click();
      else {
        await card(page).getByRole('button', { name: 'Elutasítás', exact: true }).click();
        await card(page).getByRole('button', { name: 'Elutasítás megerősítése', exact: true }).click();
      }
    };
    await click(); await expect(page.locator('app-registration-requests app-message')).toHaveText('A döntés nem sikerült.');
    await expect(card(page)).toBeVisible();
    await expect(card(page).getByRole('button', { name: decision === 'approve' ? 'Jóváhagyás' : 'Elutasítás megerősítése', exact: true })).toBeEnabled();
    api.custom.delete(`POST ${path}`);
    if (decision === 'approve') await click();
    else await card(page).getByRole('button', { name: 'Elutasítás megerősítése', exact: true }).click();
    await expect(card(page)).toHaveCount(0); expect(api.writes()).toHaveLength(2);
  });
}

test('Admin kérelmek: függő döntés alatt minden sor döntési gombja letiltott', async ({ page, api }) => {
  const response = gate();
  api.on('POST', `${REGISTRATIONS}/1/approve`, async route => {
    await response.pending; api.rows[0].status = 'APPROVED';
    await route.fulfill({ json: { success: true, data: null, message: 'Mentve.' } });
  });
  await open(page);
  try {
    await card(page).getByRole('button', { name: 'Jóváhagyás', exact: true }).click();
    await expect(card(page).getByRole('button', { name: 'Jóváhagyás', exact: true })).toBeDisabled();
    await expect(card(page, 2).getByRole('button', { name: 'Jóváhagyás', exact: true })).toBeDisabled();
    await expect(card(page, 2).getByRole('button', { name: 'Elutasítás', exact: true })).toBeDisabled();
    await expect.poll(() => api.writes().length).toBe(1);
  } finally { response.release(); }
  await expect(card(page)).toHaveCount(0); await expect(card(page, 2).getByRole('button', { name: 'Jóváhagyás', exact: true })).toBeEnabled();
});

test('Admin kérelmek: utolsó oldalon meghozott döntés visszalapoz az utolsó létező oldalra', async ({ page, api }) => {
  await open(page);
  await page.locator('app-pagination').getByRole('button', { name: 'Következő', exact: true }).click();
  await expect(card(page, 11)).toBeVisible();
  await page.locator('app-pagination').getByRole('button', { name: 'Következő', exact: true }).click();
  await expect(card(page, 21)).toBeVisible(); await card(page, 21).getByRole('button', { name: 'Jóváhagyás', exact: true }).click();
  await expect(card(page, 11)).toBeVisible(); expect(api.reads().at(-1)!.query.get('page')).toBe('1');
  await expect(page.locator('app-pagination').getByRole('button', { name: 'Következő', exact: true })).toBeDisabled();
});

for (const result of ['http', 'business', 'null-data']) {
  test(`Admin kérelmek: hibás lista-válasz nem látszik sikeres üres listának (${result})`, async ({ page, api }) => {
    api.on('GET', REGISTRATIONS, route => route.fulfill({ status: result === 'http' ? 500 : 200,
      json: { success: result !== 'business', data: null, message: 'Lista betöltési hiba.' } }));
    await page.goto('/admin/registrations');
    await expect(page.locator('app-registration-requests app-message')).toHaveText('Lista betöltési hiba.');
    await expect(page.locator('app-registration-requests li')).toHaveCount(0); expect(api.writes()).toHaveLength(0);
    api.custom.delete(`GET ${REGISTRATIONS}`); await tab(page, 'Jóváhagyva').click();
    await expect(card(page, 101)).toBeVisible();
  });
}

test('Admin kérelmek: coachlista hibájánál coach nélkül is jóváhagyható az ügyfél', async ({ page, api }) => {
  api.on('GET', '/api/members/coaches', route => route.fulfill({ status: 500, json: { success: false, data: null, message: null } }));
  await open(page); await expect(card(page).locator('select option')).toHaveCount(1);
  await card(page).getByRole('button', { name: 'Jóváhagyás', exact: true }).click();
  await expect(card(page)).toHaveCount(0); expect(api.writes().map(c => c.body)).toEqual([{ coachId: null }]);
});

test('Admin kérelmek: anonim megnyitás loginra irányít lista és döntési API-hívás nélkül', async ({ page, api }) => {
  api.authenticated = false; await page.goto('/admin/registrations');
  await expect(page).toHaveURL(/\/login$/); await expect(page.locator('#login-username')).toBeVisible();
  expect(api.reads()).toHaveLength(0); expect(api.writes()).toHaveLength(0);
});

test('Admin kérelmek: lassú lista betöltése alatt állapotjelzés látható', async ({ page, api }) => {
  const response = gate();
  api.on('GET', REGISTRATIONS, async route => {
    await response.pending; await route.fulfill({ json: { success: true, data: { content: [application(1)], page: 0, size: 10, totalElements: 1, totalPages: 1 }, message: null } });
  });
  try {
    await page.goto('/admin/registrations');
    await expect(page.locator('app-registration-requests').getByText('Betöltés...', { exact: true })).toBeVisible();
    await expect(card(page)).toHaveCount(0);
  } finally { response.release(); }
  await expect(card(page)).toBeVisible();
});

for (const [label, roles, expiry] of [
  ['hasonló nevű idegen szerepkör', 'ROLE_ADMINISTRATOR', 4102444800],
  ['hiányzó szerepkör', '', 4102444800],
  ['lejárt token', 'ROLE_ADMIN', 1],
]) {
  test(`Admin kérelmek: nem érvényes adminmunkamenet nem kérhet listát (${label})`, async ({ page, api }) => {
    const payload = Buffer.from(JSON.stringify({ sub: 'contract-account', roles, exp: expiry })).toString('base64url');
    api.on('POST', '/api/auth/web/refresh', route => route.fulfill({ json: { success: true, data: { accessToken: `eyJhbGciOiJIUzI1NiJ9.${payload}.contract` }, message: null } }));
    await page.goto('/admin/registrations'); await expect(page).toHaveURL(/\/login$/);
    await expect(page.locator('#login-username')).toBeVisible(); expect(api.reads()).toHaveLength(0); expect(api.writes()).toHaveLength(0);
  });
}

test('Admin kérelmek: több szerepkör közül a pontos ADMIN szerepkör engedélyezi az olvasást', async ({ page, api }) => {
  const payload = Buffer.from(JSON.stringify({ sub: 'contract-admin', roles: 'ROLE_AUDITOR, ROLE_ADMIN', exp: 4102444800 })).toString('base64url');
  api.on('POST', '/api/auth/web/refresh', route => route.fulfill({ json: { success: true, data: { accessToken: `eyJhbGciOiJIUzI1NiJ9.${payload}.contract` }, message: null } }));
  await open(page); expect(api.reads()).toHaveLength(1);
});

test('Admin kérelmek: a jelentkező neve és profiladatai nem hajthatnak végre HTML-kódot', async ({ page, api }) => {
  const name = '<img src=x onerror="window.registrationXss=true">';
  api.rows = [{ ...application(1), username: name, goals: '<script>window.registrationXss=true</script>' }];
  await page.goto('/admin/registrations');
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.locator('app-registration-requests')).toContainText('<script>window.registrationXss=true</script>');
  await expect(page.locator('app-registration-requests img, app-registration-requests script')).toHaveCount(0);
  expect(await page.evaluate(() => (window as any).registrationXss)).toBeUndefined();
});

test('Admin kérelmek: státuszváltás megszakítja a régi lista kérését, a késői válasz nem írja felül az újat', async ({ page, api }) => {
  const response = gate(); const finished = gate();
  api.on('GET', REGISTRATIONS, async (route, call) => {
    if (call.query.get('status') === 'PENDING') {
      await response.pending;
      try { await route.fulfill({ json: { success: true, data: { content: [application(1)], page: 0, size: 10, totalElements: 1, totalPages: 1 }, message: null } }); }
      finally { finished.release(); }
    } else {
      await route.fulfill({ json: { success: true, data: { content: [application(101, 'APPROVED')], page: 0, size: 10, totalElements: 1, totalPages: 1 }, message: null } });
    }
  });
  try {
    await page.goto('/admin/registrations');
    await expect(page.locator('app-registration-requests').getByText('Betöltés...', { exact: true })).toBeVisible();
    const aborted = page.waitForEvent('requestfailed', request => new URL(request.url()).pathname === REGISTRATIONS && new URL(request.url()).searchParams.get('status') === 'PENDING');
    await tab(page, 'Jóváhagyva').click(); await aborted;
    await expect(card(page, 101)).toBeVisible();
  } finally { response.release(); }
  await finished.pending;
  await expect(card(page, 101)).toBeVisible(); await expect(card(page)).toHaveCount(0);
  await expect(tab(page, 'Jóváhagyva')).toHaveAttribute('aria-pressed', 'true');
});
