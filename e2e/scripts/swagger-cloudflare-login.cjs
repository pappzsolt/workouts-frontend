'use strict';
const { chromium } = require('playwright');
const { mkdirSync } = require('node:fs');
const path = require('node:path');
const readline = require('node:readline/promises');
const { stdin, stdout } = require('node:process');

(async () => {
  const url = (process.env.NGINX_BASE_URL || 'https://workouts.hevexora.com').replace(/\/$/, '');
  const authPath = path.resolve(__dirname, '../.auth/cloudflare-swagger.json');
  const user = process.env.SWAGGER_ADMIN_USER;
  const password = process.env.SWAGGER_ADMIN_PASSWORD;
  const browser = await chromium.launch({ headless: false });
  const context = await browser.newContext({
    ...(user && password ? { httpCredentials: { username: user, password } } : {}),
  });
  const page = await context.newPage();
  const prompt = readline.createInterface({ input: stdin, output: stdout });
  try {
    await page.goto(url + '/swagger-ui/index.html', { waitUntil: 'domcontentloaded' });
    console.log('A megnyílt Chromiumban végezd el a Cloudflare e-mail-kódos belépést.');
    console.log('A Swagger ADMIN Basic Authhoz SWAGGER_ADMIN_USER és SWAGGER_ADMIN_PASSWORD változók szükségesek.');
    await prompt.question('Ha beléptél és látod a Swagger felületét, nyomj Entert itt... ');
    if (!page.url().startsWith(url + '/swagger-ui/')) {
      throw new Error('Még nem tért vissza a Swagger oldalra: ' + page.url());
    }
    await page.locator('#swagger-ui').waitFor({ state: 'visible', timeout: 12000 });
    const rendered = await page.locator('#swagger-ui').innerText();
    if (!rendered.includes('Swagger') && !rendered.includes('Explore') && !rendered.includes('API')) {
      throw new Error('A Swagger UI nem renderelődött; nem mentünk hamis belépési állapotot.');
    }
    mkdirSync(path.dirname(authPath), { recursive: true });
    await context.storageState({ path: authPath });
    console.log('Cloudflare munkamenet elmentve: e2e/.auth/cloudflare-swagger.json (Gitből kizárva).');
  } finally {
    prompt.close();
    await browser.close();
  }
})().catch(e => { console.error(e.message); process.exitCode = 1; });
