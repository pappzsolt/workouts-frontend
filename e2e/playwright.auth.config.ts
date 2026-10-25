import { defineConfig } from '@playwright/test';
import contract from './playwright.contract.config';

// Dedicated local Angular instance; never loads .env or the live suite's setup.
export default defineConfig({
  ...contract,
  testMatch: /auth-(?:password-recovery|login-resilience)\.spec\.ts/,
  use: { ...contract.use, baseURL: 'http://127.0.0.1:4321' },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'auth-contract-report', open: 'never' }],
    ['json', { outputFile: 'auth-contract-results/results.json' }],
  ],
  outputDir: 'auth-contract-results',
  webServer: {
    command: 'node ../node_modules/@angular/cli/bin/ng.js serve --host 127.0.0.1 --port 4321',
    url: 'http://127.0.0.1:4321/login',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
