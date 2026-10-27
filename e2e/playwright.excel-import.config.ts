import { resolve } from 'node:path';
import { defineConfig } from '@playwright/test';
import contract from './playwright.contract.config';

export default defineConfig({
  ...contract,
  testMatch: /excel-import\.spec\.ts/,
  use: { ...contract.use, baseURL: 'http://127.0.0.1:4321' },
  reporter: [['list']],
  outputDir: 'contract-results/excel-import',
  webServer: {
    command: 'node node_modules/@angular/cli/bin/ng.js serve --host 127.0.0.1 --port 4321',
    cwd: resolve(__dirname, '..'),
    url: 'http://127.0.0.1:4321/login',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
