import { test, expect, FORGOT, RESET, PASSWORD, fillReset, gate, translated } from './auth-contract-fixture';

for (const email of ['', 'not-an-email']) {
  test(`Elfelejtett jelszó: hibás email nem indít API-kérést (${email || 'üres'})`, async ({ page, api }) => {
    await page.goto('/forgot-password');
    await page.locator('#forgot-password-email').fill(email);
    await page.locator('app-forgot-password button[type=submit]').click();
    await expect(page.locator('app-forgot-password').getByRole('alert').first()).toBeVisible();
    expect(api.writes(FORGOT)).toHaveLength(0);
  });
}

test('Elfelejtett jelszó: sikeres kérés csak az emailt küldi, és a szerver üzenetét mutatja', async ({ page, api }) => {
  api.reply(FORGOT, 200, { success: true, data: { message: 'Ha létezik a fiók, elküldtük a levelet.' }, message: null });
  await page.goto('/forgot-password');
  await page.locator('#forgot-password-email').fill('anna@example.test');
  await page.locator('app-forgot-password button[type=submit]').click();
  await expect(page.locator('app-forgot-password app-message[type=success]')).toHaveText('Ha létezik a fiók, elküldtük a levelet.');
  expect(api.writes(FORGOT).map(call => call.body)).toEqual([{ email: 'anna@example.test' }]);
  expect(api.writes(FORGOT)[0].language).toBe('hu');
  await expect(page).toHaveURL(/\/forgot-password$/);
});

test('Elfelejtett jelszó: folyamatban lévő kérés alatt a küldés letiltott', async ({ page, api }) => {
  const response = gate();
  api.on(FORGOT, async route => { await response.pending; await route.fulfill({ json: { success: true, data: { message: 'Email elküldve.' }, message: null } }); });
  await page.goto('/forgot-password');
  await page.locator('#forgot-password-email').fill('anna@example.test');
  const submit = page.locator('app-forgot-password button[type=submit]');
  try {
    await submit.click();
    await expect(submit).toBeDisabled(); await expect(submit).toHaveText('Küldés...');
    await expect.poll(() => api.writes(FORGOT).length).toBe(1);
  } finally { response.release(); }
  await expect(page.locator('app-message[type=success]')).toBeVisible();
  await expect(submit).toBeEnabled();
});

for (const status of [429, 503]) {
  test(`Elfelejtett jelszó: HTTP ${status} után látható a szerverhiba és újra lehet próbálni`, async ({ page, api }) => {
    api.reply(FORGOT, status, { success: false, data: null, message: 'Próbáld újra később.' });
    await page.goto('/forgot-password');
    await page.locator('#forgot-password-email').fill('anna@example.test');
    const submit = page.locator('app-forgot-password button[type=submit]');
    await submit.click();
    await expect(page.locator('app-forgot-password app-message[type=error]')).toHaveText('Próbáld újra később.');
    await expect(submit).toBeEnabled();
    api.reply(FORGOT, 200, { success: true, data: { message: 'Újrapróbálás sikeres.' }, message: null });
    await submit.click();
    await expect(page.locator('app-message[type=success]')).toHaveText('Újrapróbálás sikeres.');
    await expect(page.locator('app-forgot-password app-message[type=error]')).toHaveCount(0);
    expect(api.writes(FORGOT)).toHaveLength(2);
  });
}

test('Elfelejtett jelszó: üres HTTP 503 üzenetnél a lokalizált tartaléküzenet jelenik meg', async ({ page, api }) => {
  api.reply(FORGOT, 503, { success: false, data: null, message: '' });
  await page.goto('/forgot-password'); await page.locator('#forgot-password-email').fill('anna@example.test');
  await page.locator('app-forgot-password button[type=submit]').click();
  await expect(page.locator('app-forgot-password app-message[type=error]')).toHaveText(translated('hu', 'forgotPassword', 'serviceUnavailable'));
});

test('Elfelejtett jelszó: hálózati hiba után az űrlap megőrzi az emailt és újra használható', async ({ page, api }) => {
  api.on(FORGOT, route => route.abort('failed'));
  await page.goto('/forgot-password'); await page.locator('#forgot-password-email').fill('anna@example.test');
  await page.locator('app-forgot-password button[type=submit]').click();
  await expect(page.locator('app-forgot-password app-message[type=error]')).toHaveText(translated('hu', 'forgotPassword', 'requestFailed'));
  await expect(page.locator('#forgot-password-email')).toHaveValue('anna@example.test');
  await expect(page.locator('app-forgot-password button[type=submit]')).toBeEnabled();
});

for (const token of [null, '   ']) {
  test(`Jelszócsere: hiányzó token letiltja a mentést (${token === null ? 'nincs paraméter' : 'whitespace'})`, async ({ page, api }) => {
    await page.goto(token === null ? '/reset-password' : `/reset-password?token=${encodeURIComponent(token)}`);
    await expect(page.locator('app-reset-password app-message[type=error]')).toHaveText(translated('hu', 'resetPassword', 'invalidLink'));
    await expect(page.locator('app-reset-password button[type=submit]')).toBeDisabled();
    expect(api.writes(RESET)).toHaveLength(0);
  });
}

for (const password of ['', 'short12', 'x'.repeat(73)]) {
  test(`Jelszócsere: érvénytelen jelszóhossz nem indít kérést (${password.length} karakter)`, async ({ page, api }) => {
    await page.goto('/reset-password?token=contract-token'); await fillReset(page, password);
    await page.locator('app-reset-password button[type=submit]').click();
    await expect(page.locator('app-reset-password').getByRole('alert').first()).toBeVisible();
    expect(api.writes(RESET)).toHaveLength(0);
  });
}

test('Jelszócsere: eltérő megerősítés javításig blokkolja a kérést', async ({ page, api }) => {
  api.reply(RESET, 200, { success: true, data: null, message: 'Mentve.' });
  await page.goto('/reset-password?token=contract-token'); await fillReset(page, PASSWORD, 'Different-password-123!');
  await page.locator('app-reset-password button[type=submit]').click();
  await expect(page.getByText('A két jelszó nem egyezik.', { exact: true })).toBeVisible();
  expect(api.writes(RESET)).toHaveLength(0);
  await page.locator('#reset-password-confirmPassword').fill(PASSWORD);
  await page.locator('app-reset-password button[type=submit]').click();
  await expect(page.locator('app-message[type=success]')).toHaveText('Mentve.');
  await expect.poll(() => api.writes(RESET).length).toBe(1);
});

for (const length of [8, 72]) {
  test(`Jelszócsere: a ${length} karakteres határérték elfogadott, a token trimmelve kerül elküldésre`, async ({ page, api }) => {
    api.reply(RESET, 200, { success: true, data: null, message: 'A jelszó elmentve.' });
    await page.goto('/reset-password?token=%20contract-token%20'); await fillReset(page, 'x'.repeat(length));
    await page.locator('app-reset-password button[type=submit]').click();
    await expect(page.locator('app-message[type=success]')).toHaveText('A jelszó elmentve.');
    expect(api.writes(RESET).map(call => call.body)).toEqual([{ token: 'contract-token', newPassword: 'x'.repeat(length) }]);
    await expect(page.locator('app-reset-password form')).toHaveCount(0);
    await page.getByRole('button', { name: 'Bejelentkezés', exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
  });
}

test('Jelszócsere: folyamatban lévő mentés alatt a gomb letiltott, siker után nincs újraküldhető űrlap', async ({ page, api }) => {
  const response = gate();
  api.on(RESET, async route => { await response.pending; await route.fulfill({ json: { success: true, data: null, message: null } }); });
  await page.goto('/reset-password?token=contract-token'); await fillReset(page);
  const submit = page.locator('app-reset-password button[type=submit]');
  try {
    await submit.click(); await expect(submit).toBeDisabled(); await expect(submit).toHaveText('Mentés...');
    await expect.poll(() => api.writes(RESET).length).toBe(1);
  } finally { response.release(); }
  await expect(page.locator('app-message[type=success]')).toHaveText(translated('hu', 'resetPassword', 'success'));
  await expect(page.locator('app-reset-password form')).toHaveCount(0);
});

for (const [status, key] of [[400, 'invalidToken'], [503, 'serviceUnavailable'], [500, 'resetFailed']] as const) {
  test(`Jelszócsere: HTTP ${status} lokalizált hibát ad, a token és a kitöltés megmarad`, async ({ page, api }) => {
    api.reply(RESET, status, { success: false, data: null, message: null });
    await page.goto('/reset-password?token=contract-token'); await fillReset(page);
    const submit = page.locator('app-reset-password button[type=submit]'); await submit.click();
    await expect(page.locator('app-reset-password app-message[type=error]')).toHaveText(translated('hu', 'resetPassword', key));
    await expect(submit).toBeEnabled(); await expect(page.locator('#reset-password-newPassword')).toHaveValue(PASSWORD);
    await expect(page).toHaveURL(/token=contract-token/);
    await expect(page.locator('app-reset-password form')).toBeVisible();
  });
}

test('Jelszócsere: HTTP 200 success=false is hibaként jelenik meg', async ({ page, api }) => {
  api.reply(RESET, 200, { success: false, data: null, message: 'A token már felhasznált.' });
  await page.goto('/reset-password?token=contract-token'); await fillReset(page);
  await page.locator('app-reset-password button[type=submit]').click();
  await expect(page.locator('app-reset-password app-message[type=error]')).toHaveText('A token már felhasznált.');
  await expect(page.locator('app-reset-password form')).toBeVisible();
  await expect(page.locator('app-message[type=success]')).toHaveCount(0);
});
