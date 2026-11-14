import { resolve } from 'node:path';
import { defineConfig, devices } from '@playwright/test';
// Separate from the real API/DB suite. Never loads .env or uses its credentials.
export default defineConfig({
  testDir: './ui-contract', fullyParallel: true, forbidOnly: true, retries: 0,
  workers: 2, reporter: [['list'], ['html', { outputFolder: 'contract-report', open: 'never' }]],
  outputDir: 'contract-results',
  use: { baseURL: process.env.E2E_CONTRACT_BASE_URL ?? 'http://127.0.0.1:4200', timezoneId: 'Europe/Budapest',
    locale: 'hu-HU', launchOptions: process.env.E2E_BROWSER_PATH ? { executablePath: process.env.E2E_BROWSER_PATH } : {}, trace: 'retain-on-failure', screenshot: 'only-on-failure', actionTimeout: 10000 },
  webServer: process.env.E2E_CONTRACT_BASE_URL ? undefined : {
    cwd: resolve(__dirname, '..'),
    command: 'node node_modules/@angular/cli/bin/ng.js serve --host 127.0.0.1 --port 4200',
    url: 'http://127.0.0.1:4200/login',
    reuseExistingServer: false,
    timeout: 120000,
  },
  projects: [ { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } } ],
});
