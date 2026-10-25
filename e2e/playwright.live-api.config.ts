import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './live-api', fullyParallel: false, workers: 1, retries: 0, forbidOnly: true,
  timeout: 60000,
  reporter: [['list'], ['html', { outputFolder: 'live-api-report', open: 'never' }], ['json', { outputFile: 'live-api-results/results.json' }]],
  outputDir: 'live-api-results',
  globalTeardown: './live-api/coverage-teardown.ts',
  use: { baseURL: 'http://127.0.0.1:4323', locale: 'hu-HU', timezoneId: 'Europe/Budapest', trace: 'retain-on-failure', screenshot: 'only-on-failure' },
  webServer: [
    { command: 'node scripts/test-mailbox.cjs', env: { E2E_SMTP_PORT: '1026', E2E_MAILBOX_PORT: '8026' }, url: 'http://127.0.0.1:8026/health', reuseExistingServer: false },
    { command: 'node scripts/start-backend.cjs', gracefulShutdown: { signal: 'SIGTERM', timeout: 30000 }, url: 'http://127.0.0.1:8099/v3/api-docs', timeout: 180000, reuseExistingServer: false },
    { command: 'node ../node_modules/@angular/cli/bin/ng.js serve --configuration=live-api --host 127.0.0.1 --port 4323', url: 'http://127.0.0.1:4323/login', timeout: 120000, reuseExistingServer: false },
  ],
  projects: [ { name: 'desktop', use: { ...devices['Desktop Chrome'] } }, { name: 'mobile', use: { ...devices['Pixel 7'] } } ],
});
