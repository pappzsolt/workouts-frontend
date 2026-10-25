import { test, expect, LOGIN, FORGOT, gate, translated } from './auth-contract-fixture';

for (const [username, password] of [['', ''], ['anna', ''], ['', 'Password123!']]) {
  test(`Belépés: hiányzó kötelező mező nem indít kérést (${username ? 'jelszó' : password ? 'felhasználónév' : 'mindkettő'})`, async ({ page, api }) => {
    await page.goto('/login');
    await page.locator('#login-username').fill(username); await page.locator('#login-password').fill(password);
    await page.locator('app-login button[type=submit]').click();
    await expect(page.locator('app-login').getByRole('alert').first()).toBeVisible();
    expect(api.writes(LOGIN)).toHaveLength(0);
    await expect(page).toHaveURL(/\/login$/);
  });
}

test('Belépés: függő kérés alatt a gomb letiltott, elutasítás után a mezők szerkeszthetők', async ({ page, api }) => {
  const response = gate();
  api.on(LOGIN, async route => { await response.pending; await route.fulfill({ status: 401, json: { success: false, data: null, message: 'Hibás belépési adatok.' } }); });
  await page.goto('/login');
  await page.locator('#login-username').fill('anna'); await page.locator('#login-password').fill('Password123!');
  const submit = page.locator('app-login button[type=submit]');
  try {
    await submit.click(); await expect(submit).toBeDisabled(); await expect(submit).toHaveText('Betöltés...');
    await expect.poll(() => api.writes(LOGIN).length).toBe(1);
  } finally { response.release(); }
  await expect(page.locator('app-login app-message[type=error]')).toHaveText('Hibás belépési adatok.');
  await expect(submit).toBeEnabled(); await expect(page.locator('#login-username')).toHaveValue('anna');
  await expect(page.locator('#login-password')).toHaveAttribute('type', 'password');
  expect(api.writes(LOGIN).map(call => call.body)).toEqual([{ username: 'anna', password: 'Password123!' }]);
});

test('Belépés: HTTP 200 success=false nem jelent sikeres bejelentkezést', async ({ page, api }) => {
  api.reply(LOGIN, 200, { success: false, data: null, message: 'A fiók még jóváhagyásra vár.' });
  await page.goto('/login');
  await page.locator('#login-username').fill('anna'); await page.locator('#login-password').fill('Password123!');
  await page.locator('app-login button[type=submit]').click();
  await expect(page.locator('app-login app-message[type=error]')).toHaveText('A fiók még jóváhagyásra vár.');
  await expect(page).toHaveURL(/\/login$/);
  expect(api.calls.filter(call => call.path.includes('/dashboard'))).toEqual([]);
});

test('Belépés: hálózati hiba után az Enter billentyűvel újrapróbálható a kérés', async ({ page, api }) => {
  api.on(LOGIN, route => route.abort('failed'));
  await page.goto('/login');
  await page.locator('#login-username').fill('anna'); await page.locator('#login-password').fill('Password123!');
  await page.locator('#login-password').press('Enter');
  await expect(page.locator('app-login app-message[type=error]')).toBeVisible();
  await expect(page.locator('app-login button[type=submit]')).toBeEnabled();
  api.reply(LOGIN, 401, { success: false, data: null, message: 'Második kérés feldolgozva.' });
  await page.locator('#login-password').press('Enter');
  await expect(page.locator('app-login app-message[type=error]')).toHaveText('Második kérés feldolgozva.');
  expect(api.writes(LOGIN)).toHaveLength(2);
});

test('Belépés: régi access és refresh tokenek eltűnnek a localStorage-ból', async ({ page, api }) => {
  await page.addInitScript(() => {
    localStorage.setItem('accessToken', 'obsolete-access-token');
    localStorage.setItem('refreshToken', 'obsolete-refresh-token');
  });
  await page.goto('/login');
  await expect(page.locator('#login-username')).toBeVisible();
  expect(await page.evaluate(() => [localStorage.getItem('accessToken'), localStorage.getItem('refreshToken')])).toEqual([null, null]);
  expect(api.writes(LOGIN)).toHaveLength(0);
});

test('Belépés: elfelejtett jelszó és visszalépés valódi router-navigációval működik', async ({ page, api }) => {
  await page.goto('/login');
  await page.getByRole('link', { name: 'Elfelejtett jelszó?', exact: true }).click();
  await expect(page).toHaveURL(/\/forgot-password$/);
  await expect(page.getByLabel('Email cím', { exact: false })).toBeVisible();
  await page.getByRole('button', { name: 'Vissza a bejelentkezéshez', exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
  expect(api.calls).toEqual([]);
});

for (const language of ['hu', 'en', 'de']) {
  test(`Nyelvváltás: a jelszóemlékeztető feliratai és a kérés nyelve egyezik (${language})`, async ({ page, api }) => {
    api.reply(FORGOT, 200, { success: true, data: { message: 'Contract response' }, message: null });
    await page.goto('/forgot-password');
    await page.locator('app-language-selector select').selectOption(language);
    await expect(page.getByRole('heading', { name: translated(language, 'forgotPassword', 'title'), exact: true })).toBeVisible();
    await page.locator('#forgot-password-email').fill('anna@example.test');
    await page.getByRole('button', { name: translated(language, 'forgotPassword', 'submit'), exact: true }).click();
    await expect(page.locator('app-forgot-password app-message[type=success]')).toHaveText('Contract response');
    expect(api.writes(FORGOT)[0].language).toBe(language);
  });
}

for (const path of ['/login', '/forgot-password', '/reset-password?token=contract-token']) {
  test(`Publikus hitelesítési űrlap nem lóg túl a képernyőn (${path.split('?')[0]})`, async ({ page, api }) => {
    await page.goto(path);
    await expect(page.locator('form')).toBeVisible();
    const width = await page.evaluate(() => ({ document: document.documentElement.scrollWidth, viewport: window.innerWidth }));
    expect(width.document).toBeLessThanOrEqual(width.viewport);
    expect(api.calls).toEqual([]);
  });
}
