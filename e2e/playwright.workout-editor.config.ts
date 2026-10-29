import { defineConfig } from '@playwright/test';
import contract from './playwright.contract.config';

export default defineConfig({
  ...contract,
  testMatch: /(?:workout-(?:edit|drafts|model)|workspace-editor(?:-more)?)\.spec\.ts/,
  use: { ...contract.use, baseURL: 'http://127.0.0.1:4322' },
  outputDir: 'workout-editor-results',
  reporter: [
    ['list'],
    ['html', { outputFolder: 'workout-editor-report', open: 'never' }],
    ['json', { outputFile: 'workout-editor-results/results.json' }],
  ],
  webServer: {
    command: 'node ../node_modules/@angular/cli/bin/ng.js serve --host 127.0.0.1 --port 4322',
    url: 'http://127.0.0.1:4322/login',
    reuseExistingServer: false,
    timeout: 120000,
  },
});
