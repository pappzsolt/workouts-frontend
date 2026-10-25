import { test, expect, PASSWORD, gate, translated } from './auth-contract-fixture';
import type { Page } from '@playwright/test';

const REGISTER = '/api/auth/register';
async function fill(page: Page, password = PASSWORD) {
  await page.locator('#register-username').fill('kiss.anna');
  await page.locator('#register-email').fill('anna@example.test');
  await page.locator('#register-password').fill(password);
  await page.locator('#register-password-confirmation').fill(password);
}
const submit = (page: Page) => page.locator('app-register button[type=submit]');
async function optional(page: Page) { await page.locator('app-register details > summary').click(); }
const accepted = { success: true, data: { status: 'PENDING' }, message: 'Kérelem rögzítve.' };

for (const username of ['ab', 'anna@kiss', '.anna', 'anna.']) {
  test(`Regisztráció: hibás felhasználónév nem küldhető (${username})`, async ({ page, api }) => {
    await page.goto('/register'); await fill(page); await page.locator('#register-username').fill(username);
    await submit(page).click();
    await expect(page.locator('app-register').getByRole('alert').first()).toBeVisible();
    expect(api.writes(REGISTER)).toHaveLength(0);
  });
}

for (const [label, password] of [['csak szóköz', ' '.repeat(8)], ['74 UTF-8 bájt', 'á'.repeat(37)], ['73 karakter', 'x'.repeat(73)]]) {
  test(`Regisztráció: érvénytelen jelszó blokkolása (${label})`, async ({ page, api }) => {
    await page.goto('/register'); await fill(page, password); await submit(page).click();
    await expect(page.locator('app-register').getByRole('alert').first()).toBeVisible();
    expect(api.writes(REGISTER)).toHaveLength(0);
  });
}

for (const [label, password] of [['8 karakter', 'x'.repeat(8)], ['72 ASCII bájt', 'x'.repeat(72)], ['72 UTF-8 bájt', 'á'.repeat(36)]]) {
  test(`Regisztráció: érvényes jelszóhatárérték elküldhető (${label})`, async ({ page, api }) => {
    api.reply(REGISTER, 202, accepted);
    await page.goto('/register'); await fill(page, password); await submit(page).click();
    await expect(page.getByRole('status')).toContainText('Kérelem rögzítve.');
    expect(api.writes(REGISTER).map(c => (c.body as any).password)).toEqual([password]);
    expect(api.writes(REGISTER).map(c => (c.body as any).passwordConfirmation)).toEqual([password]);
  });
}

for (const [field, value] of [
  ['age', '9'], ['age', '121'],
  ['weight', '19.99'], ['weight', '400.01'], ['weight', '70.123'],
  ['height', '79.99'], ['height', '250.01'], ['height', '170.123'],
]) {
  test(`Regisztráció: hibás opcionális számmező blokkolja a beküldést (${field}=${value})`, async ({ page, api }) => {
    await page.goto('/register'); await fill(page); await optional(page);
    await page.locator(`#register-${field}`).fill(value); await submit(page).click();
    await expect(page.locator('app-register').getByRole('alert').first()).toBeVisible();
    expect(api.writes(REGISTER)).toHaveLength(0);
  });
}

for (const [age, weight, height] of [[10, 20, 80], [120, 400, 250]]) {
  test(`Regisztráció: opcionális számmezők határértékei elfogadottak (${age}/${weight}/${height})`, async ({ page, api }) => {
    api.reply(REGISTER, 202, accepted);
    await page.goto('/register'); await fill(page); await optional(page);
    await page.locator('#register-age').fill(String(age)); await page.locator('#register-weight').fill(String(weight));
    await page.locator('#register-height').fill(String(height)); await submit(page).click();
    await expect(page.getByRole('status')).toBeVisible();
    expect(api.writes(REGISTER).map(c => c.body)).toEqual([{
      accountType: 'USER', username: 'kiss.anna', email: 'anna@example.test', password: PASSWORD,
      passwordConfirmation: PASSWORD, age, weight, height, gender: null, goals: null,
    }]);
  });
}

for (const [type, limit] of [['USER', 50], ['COACH', 100]] as const) {
  test(`Regisztráció: ${type} névhosszkorlát és Unicode név helyesen működik`, async ({ page, api }) => {
    api.reply(REGISTER, 202, accepted);
    await page.goto('/register'); await fill(page);
    if (type === 'COACH') await page.getByText('Programokat készítek', { exact: true }).click();
    await expect(page.locator('#register-username')).toHaveAttribute('maxlength', String(limit));
    const name = 'Á'.repeat(limit); await page.locator('#register-username').fill(name); await submit(page).click();
    await expect(page.getByRole('status')).toBeVisible();
    expect(api.writes(REGISTER).map(c => (c.body as any).username)).toEqual([name]);
    expect(api.writes(REGISTER).map(c => (c.body as any).accountType)).toEqual([type]);
  });
}

test('Regisztráció: USER→COACH váltás törli a hibás rejtett ügyfélmezőket', async ({ page, api }) => {
  api.reply(REGISTER, 202, accepted);
  await page.goto('/register'); await fill(page); await optional(page);
  await page.locator('#register-age').fill('9'); await page.locator('#register-goals').fill('Nem kerülhet a coach-kérésbe');
  await page.getByText('Programokat készítek', { exact: true }).click();
  await expect(page.locator('#register-age')).toHaveCount(0);
  await page.locator('#register-specialization').fill('  Erőnlét  '); await submit(page).click();
  await expect(page.getByRole('status')).toBeVisible();
  expect(api.writes(REGISTER).map(c => c.body)).toEqual([{
    accountType: 'COACH', username: 'kiss.anna', email: 'anna@example.test', password: PASSWORD,
    passwordConfirmation: PASSWORD, phone: null, specialization: 'Erőnlét',
  }]);
});

test('Regisztráció: COACH→USER váltás törli a hibás rejtett edzőmezőket', async ({ page, api }) => {
  api.reply(REGISTER, 202, accepted);
  await page.goto('/register'); await fill(page);
  await page.getByText('Programokat készítek', { exact: true }).click(); await optional(page);
  await page.locator('#register-phone').fill('12'); await page.locator('#register-specialization').fill('Rejtett coachadat');
  await page.getByText(translated('hu', 'register', 'typeUserHint'), { exact: true }).click();
  await expect(page.locator('#register-phone')).toHaveCount(0);
  await page.locator('#register-weight').fill('70.25'); await page.locator('#register-height').fill('170.75');
  await page.locator('#register-goals').fill('  Erő  '); await submit(page).click();
  await expect(page.getByRole('status')).toBeVisible();
  expect(api.writes(REGISTER).map(c => c.body)).toEqual([{
    accountType: 'USER', username: 'kiss.anna', email: 'anna@example.test', password: PASSWORD,
    passwordConfirmation: PASSWORD, age: null, weight: 70.25, height: 170.75, gender: null, goals: 'Erő',
  }]);
});

for (const phone of ['36301234567', '+3630123456']) {
  test(`Regisztráció: hibás magyar telefonszám blokkolása (${phone})`, async ({ page, api }) => {
    await page.goto('/register'); await fill(page);
    await page.getByText('Programokat készítek', { exact: true }).click(); await optional(page);
    await page.locator('#register-phone').fill(phone); await submit(page).click();
    await expect(page.locator('app-register').getByRole('alert').first()).toBeVisible();
    expect(api.writes(REGISTER)).toHaveLength(0);
  });
}

test('Regisztráció: függő válasz alatt nincs új beküldés, siker után az űrlap eltűnik', async ({ page, api }) => {
  const response = gate();
  api.on(REGISTER, async route => { await response.pending; await route.fulfill({ status: 202, json: accepted }); });
  await page.goto('/register'); await fill(page);
  try {
    await submit(page).click(); await expect(submit(page)).toBeDisabled();
    await expect.poll(() => api.writes(REGISTER).length).toBe(1);
  } finally { response.release(); }
  await expect(page.getByRole('status')).toBeVisible();
  await expect(page.locator('app-register form')).toHaveCount(0);
  await page.getByRole('button', { name: translated('hu', 'register', 'backToLogin'), exact: true }).click();
  await expect(page).toHaveURL(/\/login$/);
});

for (const status of [409, 503]) {
  test(`Regisztráció: HTTP ${status} után az adatok megmaradnak és újrapróbálhatók`, async ({ page, api }) => {
    api.reply(REGISTER, status, { success: false, data: null, message: 'Regisztrációs teszthiba.' });
    await page.goto('/register'); await fill(page); await submit(page).click();
    await expect(page.locator('app-register app-message[type=error]')).toHaveText('Regisztrációs teszthiba.');
    await expect(submit(page)).toBeEnabled(); await expect(page.locator('#register-email')).toHaveValue('anna@example.test');
    api.reply(REGISTER, 202, accepted); await submit(page).click();
    await expect(page.getByRole('status')).toBeVisible(); expect(api.writes(REGISTER)).toHaveLength(2);
  });
}

for (const [success, message] of [[false, 'A regisztráció elutasítva.'], [true, null]] as const) {
  test(`Regisztráció: hibás HTTP 200 üzleti válasz nem mutat sikert (success=${success})`, async ({ page, api }) => {
    api.reply(REGISTER, 200, { success, data: null, message });
    await page.goto('/register'); await fill(page); await submit(page).click();
    await expect(page.locator('app-register app-message[type=error]')).toHaveText(message ?? translated('hu', 'register', 'failed'));
    await expect(page.locator('app-register form')).toBeVisible(); await expect(page.getByRole('status')).toHaveCount(0);
  });
}

for (const language of ['hu', 'en', 'de']) {
  test(`Regisztráció: nyelvváltás után a fejléc és a kérés nyelve is helyes (${language})`, async ({ page, api }) => {
    api.reply(REGISTER, 202, accepted);
    await page.goto('/register'); await page.locator('app-language-selector select').selectOption(language);
    await expect(page.getByRole('heading', { name: translated(language, 'register', 'title'), exact: true })).toBeVisible();
    await fill(page); await submit(page).click(); await expect(page.getByRole('status')).toBeVisible();
    expect(api.writes(REGISTER)[0].language).toBe(language);
  });
}

for (const [value, label] of [['MALE', 'genderMale'], ['FEMALE', 'genderFemale']]) {
  test(`Regisztráció: a kiválasztott nem enumként kerül elküldésre (${value})`, async ({ page, api }) => {
    api.reply(REGISTER, 202, accepted); await page.goto('/register'); await fill(page); await optional(page);
    await page.getByRole('combobox', { name: 'Nem', exact: true }).selectOption({ label: translated('hu', 'register', label) });
    await submit(page).click(); await expect(page.getByRole('status')).toBeVisible();
    expect(api.writes(REGISTER).map(c => (c.body as any).gender)).toEqual([value]);
  });
}

test('Regisztráció: a jelszó szándékos szélső szóközei nem vesznek el a kérésből', async ({ page, api }) => {
  api.reply(REGISTER, 202, accepted); const password = '  Password123!  ';
  await page.goto('/register'); await fill(page, password); await submit(page).click();
  await expect(page.getByRole('status')).toBeVisible();
  expect(api.writes(REGISTER).map(c => (c.body as any).password)).toEqual([password]);
});


test('Regisztráció: tört életkor bevitele elutasított, érvényes egész számra javítható', async ({ page, api }) => {
  api.reply(REGISTER, 202, accepted); await page.goto('/register'); await fill(page); await optional(page);
  await page.locator('#register-age').fill('10.5');
  await expect(page.locator('#register-age')).toHaveValue('');
  await expect(page.locator('app-register').getByRole('alert').first()).toBeVisible();
  expect(api.writes(REGISTER)).toHaveLength(0);
  await page.locator('#register-age').fill('31'); await submit(page).click();
  await expect(page.getByRole('status')).toBeVisible();
  expect(api.writes(REGISTER).map(c => (c.body as any).age)).toEqual([31]);
});
