import { resolve } from 'node:path';
import { defineConfig } from '@playwright/test';
import auth from './playwright.auth.config';

// Local UI contract tests: every API request is intercepted, no live accounts or database.
export default defineConfig({
  ...auth,
  webServer: {
    command: 'node node_modules/@angular/cli/bin/ng.js serve --host 127.0.0.1 --port 4321',
    cwd: resolve(__dirname, '..'),
    url: 'http://127.0.0.1:4321/login',
    reuseExistingServer: false,
    timeout: 120000,
  },
  testMatch: /personal-programs\.spec\.ts/,
  outputDir: 'personal-program-contract-results',
  reporter: [['list']],
});
